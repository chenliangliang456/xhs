import { apiBaseUrl } from '@/utils/assetUrl';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pollDelay(attempt, pollHint) {
  const fastAttempts = pollHint?.fastAttempts ?? 30;
  const fastIntervalMs = pollHint?.fastIntervalMs ?? 900;
  const intervalMs = pollHint?.intervalMs ?? 1800;
  if (attempt < fastAttempts) return fastIntervalMs;
  const extra = attempt - fastAttempts;
  return Math.min(intervalMs + extra * 150, 3500);
}

async function pollRequest(task, pollBatchId, lazyImage, signal) {
  const token = localStorage.getItem('token');
  const resp = await fetch(`${apiBaseUrl()}/gpt-open/poll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...task,
      batchId: pollBatchId,
      lazyImage,
    }),
    signal,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || `轮询失败 ${resp.status}`);
  return data;
}

export async function pollGptOpenTask(task, batchId, options = {}) {
  const {
    pollHint = {},
    sessionId = null,
    getSessionId = () => sessionId,
    signal = null,
  } = options;

  const pollBatchId = task.batchId || batchId;
  const maxAttempts = pollHint.maxAttempts ?? 100;

  for (let i = 0; i < maxAttempts; i++) {
    if (getSessionId() != null && options.isCancelled?.()) {
      throw new Error('CANCELLED');
    }
    if (signal?.aborted) throw new Error('CANCELLED');

    const data = await pollRequest(task, pollBatchId, true, signal);

    if (data.status === 'completed') {
      const dl = await pollRequest(task, pollBatchId, false, signal);
      if (dl.status === 'completed' && dl.image?.dataUrl) {
        return { ...dl.image, prompt: task.prompt, mode: task.mode };
      }
      throw new Error('图片下载失败');
    }
    if (data.status === 'failed') throw new Error(data.message || '任务失败');

    await sleep(pollDelay(i, pollHint));
  }

  throw new Error('生成超时，请稍后重试或点击取消后重新生成');
}

/**
 * 流式思考 — 返回 { thinking, finalPrompt, abort }
 */
export function streamGptThink(body, callbacks = {}) {
  const ac = new AbortController();
  const token = localStorage.getItem('token');
  let full = '';

  const run = async () => {
    const resp = await fetch(`${apiBaseUrl()}/gpt-open/think-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `思考请求失败 ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          if (json.type === 'delta' && json.text) {
            full += json.text;
            callbacks.onDelta?.(json.text, full);
          } else if (json.type === 'done') {
            full = json.thinking || full;
            callbacks.onDone?.({
              thinking: full,
              finalPrompt: json.finalPrompt,
            });
          } else if (json.type === 'error') {
            throw new Error(json.message || '思考失败');
          }
        } catch (e) {
          if (e.message && e.message !== '思考失败') throw e;
        }
      }
    }

    if (!full && callbacks.onDone) {
      callbacks.onDone({ thinking: '', finalPrompt: '' });
    }
  };

  run().catch((err) => {
    if (err.name !== 'AbortError') callbacks.onError?.(err);
  });

  return {
    abort: () => ac.abort(),
  };
}
