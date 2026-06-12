/**
 * GPT 开放生图 — 独立 API 配置，无额度限制，支持思考模式 + 上传修改
 */
const IS_VERCEL = Boolean(process.env.VERCEL);
const { normalizeImageBaseUrl, normalizeChatUrl, wrapNetworkError } = require('./apiUrlNormalize');

const ALLOWED_SIZES = new Set([
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5',
]);

const RESOLUTION = '1k';

function readOpenConfig() {
  return {
    imageBaseUrl: normalizeImageBaseUrl(
      process.env.GPT_OPEN_IMAGE_API_BASE_URL ||
        process.env.IMAGE_GEN_API_BASE_URL ||
        process.env.API_BASE_URL ||
        ''
    ),
    imageApiKey: String(
      process.env.GPT_OPEN_IMAGE_API_KEY ||
        process.env.IMAGE_GEN_API_KEY ||
        process.env.API_KEY ||
        ''
    ).trim(),
    imageModel: String(process.env.GPT_OPEN_IMAGE_MODEL || 'gpt-image-2').trim(),
    chatUrl: normalizeChatUrl(
      process.env.GPT_OPEN_CHAT_URL || process.env.AI_API_URL || ''
    ),
    chatApiKey: String(
      process.env.GPT_OPEN_CHAT_API_KEY || process.env.AI_API_KEY || ''
    ).trim(),
    chatModel: String(
      process.env.GPT_OPEN_CHAT_MODEL || process.env.AI_API_MODEL || 'deepseek-chat'
    ).trim(),
  };
}

function isImageConfigured(cfg = readOpenConfig()) {
  return Boolean(cfg.imageBaseUrl && cfg.imageApiKey);
}

function isThinkConfigured(cfg = readOpenConfig()) {
  return Boolean(cfg.chatUrl && cfg.chatApiKey);
}

let thinkProbeCache = { at: 0, result: null };
const THINK_PROBE_TTL_MS = 60_000;

function invalidateThinkProbeCache() {
  thinkProbeCache = { at: 0, result: null };
}

/** 检测 Chat 是否可用（支持 DeepSeek 等与 apimart 分离的配置） */
async function probeThinkAvailability(cfg = readOpenConfig()) {
  if (!isThinkConfigured(cfg)) {
    return { available: false, reason: 'not_configured' };
  }

  const now = Date.now();
  if (thinkProbeCache.result && now - thinkProbeCache.at < THINK_PROBE_TTL_MS) {
    return thinkProbeCache.result;
  }

  let result = { available: false, reason: 'unknown', models: [] };

  const base = normalizeImageBaseUrl(cfg.chatUrl.replace(/\/v1\/chat\/completions$/i, ''));
  try {
    const resp = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${cfg.chatApiKey}` },
    });
    if (resp.ok) {
      const body = await resp.json();
      const ids = (body.data || []).map((m) => String(m.id || ''));
      const hasChatModel = ids.some((id) => id && !/^gpt-image/i.test(id));
      if (hasChatModel) {
        result = { available: true, reason: 'ok', models: ids };
        thinkProbeCache = { at: now, result };
        return result;
      }
    }
  } catch {
    // fall through to chat probe
  }

  try {
    const resp = await fetch(cfg.chatUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.chatApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.chatModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
    });
    if (resp.ok) {
      result = { available: true, reason: 'ok', models: [cfg.chatModel] };
    } else {
      const errText = await resp.text();
      let msg = errText.slice(0, 120);
      try {
        msg = JSON.parse(errText).error?.message || msg;
      } catch {
        /* ignore */
      }
      result = {
        available: false,
        reason: resp.status === 403 ? 'no_chat_access' : `chat_${resp.status}`,
        models: [],
        message: msg,
      };
    }
  } catch {
    result = { available: false, reason: 'probe_failed', models: [] };
  }

  thinkProbeCache = { at: now, result };
  return result;
}

function getHealthPayload() {
  const cfg = readOpenConfig();
  return {
    ok: true,
    env: IS_VERCEL ? 'vercel' : 'local',
    imageConfigured: isImageConfigured(cfg),
    thinkConfigured: isThinkConfigured(cfg),
    imageModel: cfg.imageModel,
    chatModel: cfg.chatModel,
    mode: 'async',
    unlimited: true,
    pollHint: {
      maxAttempts: 100,
      intervalMs: 1800,
      fastAttempts: 30,
      fastIntervalMs: 900,
    },
  };
}

async function getHealthPayloadAsync() {
  const base = getHealthPayload();
  const probe = await probeThinkAvailability();
  return {
    ...base,
    thinkAvailable: probe.available,
    thinkUnavailableReason: probe.available ? '' : probe.reason,
    availableModels: probe.models,
  };
}

function normalizeSize(size) {
  return ALLOWED_SIZES.has(size) ? size : '1:1';
}

function normalizeReferenceImage(input) {
  if (!input) return null;
  const str = String(input).trim();
  if (!str) return null;
  if (/^https?:\/\//i.test(str)) return str;
  if (str.startsWith('data:image/')) return str;
  return `data:image/png;base64,${str}`;
}

async function imageApiFetch(cfg, path, options = {}) {
  const headers = { Authorization: `Bearer ${cfg.imageApiKey}`, ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';

  let resp;
  try {
    resp = await fetch(`${cfg.imageBaseUrl}${path}`, { ...options, headers });
  } catch (err) {
    throw wrapNetworkError(err, `生图服务 ${cfg.imageBaseUrl || ''}`.trim());
  }
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${path} 失败 ${resp.status}：${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`返回非 JSON：${text.slice(0, 200)}`);
  }
}

async function submitImageTask(cfg, { prompt, size, referenceImage, mode }) {
  const payload = {
    model: cfg.imageModel,
    prompt,
    n: 1,
    size: normalizeSize(size),
    resolution: RESOLUTION,
  };
  const ref = normalizeReferenceImage(referenceImage);
  if (ref) payload.image_urls = [ref];
  if (mode === 'edit') payload.mode = 'edit';

  const data = await imageApiFetch(cfg, '/v1/images/generations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const item = Array.isArray(data.data) ? data.data[0] : data.data;
  const taskId = item && item.task_id;
  if (!taskId) throw new Error('未获取到 task_id');
  return taskId;
}

async function queryImageTaskOnce(cfg, taskId) {
  const body = await imageApiFetch(cfg, `/v1/tasks/${taskId}`, { method: 'GET' });
  const data = body.data || {};
  const status = data.status;

  if (status === 'completed') {
    const url =
      data.result?.images?.[0] &&
      (Array.isArray(data.result.images[0].url)
        ? data.result.images[0].url[0]
        : data.result.images[0].url);
    if (!url) throw new Error('任务完成但未拿到图片 URL');
    return { status: 'completed', imageUrl: url };
  }
  if (status === 'failed') {
    return {
      status: 'failed',
      message: (body.error && body.error.message) || JSON.stringify(body),
    };
  }
  return { status: 'pending' };
}

async function fetchImageBuffer(imageUrl) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`下载图片失败：${resp.status}`);
  const contentType = resp.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await resp.arrayBuffer());
  return { buf, contentType };
}

function extFromContentType(contentType) {
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'png';
}

async function imagePayloadFromUrl(imageUrl, batchId, index, seed) {
  const { buf, contentType } = await fetchImageBuffer(imageUrl);
  const ext = extFromContentType(contentType);
  const fileName = `gpt-open-${batchId}-${String(index).padStart(4, '0')}-${seed}.${ext}`;
  const dataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
  return { dataUrl, fileName };
}

function buildThinkSystemPrompt(mode) {
  if (mode === 'edit') {
    return [
      '你是专业 AI 绘画提示词工程师，用户会上传一张参考图并要求修改。',
      '请用中文展示完整思考过程（分析原图 → 修改意图 → 最终英文生图 prompt）。',
      '思考过程必须可见、分步骤、有条理；最后一行单独输出：',
      '【FINAL_PROMPT】...(英文 prompt，可直接用于图生图修改)',
    ].join('\n');
  }
  return [
    '你是专业 AI 绘画提示词工程师。',
    '请用中文展示完整思考过程（理解需求 → 构图光影 → 风格材质 → 英文 prompt）。',
    '思考过程必须可见、分步骤、有条理；最后一行单独输出：',
    '【FINAL_PROMPT】...(英文 prompt，可直接用于文生图)',
  ].join('\n');
}

function extractFinalPrompt(thinkingText) {
  const text = String(thinkingText || '');
  const match = text.match(/【FINAL_PROMPT】([\s\S]+)/i);
  if (match) return match[1].trim();
  const lines = text.split('\n').filter((l) => l.trim());
  return lines[lines.length - 1]?.trim() || text.trim();
}

async function runThinkComplete(body) {
  const cfg = readOpenConfig();
  if (!isThinkConfigured(cfg)) {
    const err = new Error('未配置 GPT 思考 API（GPT_OPEN_CHAT_URL / GPT_OPEN_CHAT_API_KEY）');
    err.status = 500;
    throw err;
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) {
    const err = new Error('请输入描述');
    err.status = 400;
    throw err;
  }

  const mode = body.mode === 'edit' ? 'edit' : 'generate';
  const userContent = mode === 'edit'
    ? `修改模式。用户描述：${prompt}\n请基于参考图给出修改方案与最终英文 prompt。`
    : `文生图模式。用户描述：${prompt}\n请给出思考过程与最终英文 prompt。`;

  const resp = await fetch(cfg.chatUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.chatApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages: [
        { role: 'system', content: buildThinkSystemPrompt(mode) },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
    }),
  });

  const text = await resp.text();
  if (!resp.ok) throw new Error(`思考 API 失败 ${resp.status}：${text.slice(0, 300)}`);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('思考 API 返回非 JSON');
  }

  const thinking =
    data.choices?.[0]?.message?.content ||
    data.output?.text ||
    data.result ||
    '';

  return {
    thinking: String(thinking).trim(),
    finalPrompt: extractFinalPrompt(thinking),
    mode,
  };
}

/**
 * 流式思考 — 返回 async generator of { type, text }
 */
async function* streamThink(body, signal) {
  const cfg = readOpenConfig();
  if (!isThinkConfigured(cfg)) {
    throw new Error('未配置 GPT 思考 API');
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) throw new Error('请输入描述');

  const mode = body.mode === 'edit' ? 'edit' : 'generate';
  const userContent = mode === 'edit'
    ? `修改模式。用户描述：${prompt}\n请基于参考图给出修改方案与最终英文 prompt。`
    : `文生图模式。用户描述：${prompt}\n请给出思考过程与最终英文 prompt。`;

  const resp = await fetch(cfg.chatUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.chatApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages: [
        { role: 'system', content: buildThinkSystemPrompt(mode) },
        { role: 'user', content: userContent },
      ],
      stream: true,
      temperature: 0.7,
    }),
    signal,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `思考流失败 ${resp.status}`;
    try {
      const j = JSON.parse(errText);
      msg = j.error?.message || j.message || msg;
    } catch {
      msg = errText.slice(0, 200) || msg;
    }
    if (resp.status === 403 && /does not have access to model/i.test(msg)) {
      throw new Error(
        '当前 API 密钥未开通 Chat 模型（思考模式需要 gpt-4o-mini 等对话模型权限）。' +
          '请在聚合平台开通后重试，或关闭思考模式直接生图。'
      );
    }
    if (resp.status === 404) {
      throw new Error('Chat 接口地址错误，请在设置中填写 https://api.apimart.ai 或完整 chat 地址');
    }
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

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
        const delta =
          json.choices?.[0]?.delta?.content ||
          json.choices?.[0]?.message?.content ||
          '';
        if (delta) {
          full += delta;
          yield { type: 'delta', text: delta };
        }
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }

  yield {
    type: 'done',
    thinking: full.trim(),
    finalPrompt: extractFinalPrompt(full),
  };
}

async function runOpenSubmit(body) {
  const cfg = readOpenConfig();
  if (!isImageConfigured(cfg)) {
    const err = new Error(
      '未配置 GPT 开放生图 API（GPT_OPEN_IMAGE_API_BASE_URL / GPT_OPEN_IMAGE_API_KEY）'
    );
    err.status = 500;
    throw err;
  }

  const mode = body.mode === 'edit' ? 'edit' : 'generate';
  const prompt = String(body.prompt || '').trim();
  if (!prompt) {
    const err = new Error('请输入图片描述');
    err.status = 400;
    throw err;
  }
  if (mode === 'edit' && !body.referenceImage) {
    const err = new Error('修改模式请先上传参考图');
    err.status = 400;
    throw err;
  }

  const size = normalizeSize(body.size);
  const batchId =
    String(body.batchId || '').trim() ||
    `go${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const seed = Math.floor(Math.random() * 4_294_967_295);

  const taskId = await submitImageTask(cfg, {
    prompt,
    size,
    referenceImage: body.referenceImage,
    mode,
  });

  return {
    batchId,
    mode,
    tasks: [
      {
        id: 1,
        seed,
        size,
        taskId,
        prompt,
        mode,
        batchId,
      },
    ],
  };
}

async function runOpenPoll(body) {
  const cfg = readOpenConfig();
  if (!isImageConfigured(cfg)) {
    const err = new Error('未配置 GPT 开放生图 API');
    err.status = 500;
    throw err;
  }

  const taskId = String(body.taskId || '').trim();
  const batchId = String(body.batchId || '').trim();
  const index = Number.parseInt(body.id, 10) || 1;
  const seed = body.seed || 0;
  const size = normalizeSize(body.size);

  if (!taskId) {
    const err = new Error('缺少 taskId');
    err.status = 400;
    throw err;
  }

  const result = await queryImageTaskOnce(cfg, taskId);

  if (result.status === 'pending') {
    return { status: 'pending', taskId };
  }
  if (result.status === 'failed') {
    return { status: 'failed', taskId, message: result.message || '任务失败' };
  }

  const meta = {
    id: index,
    seed,
    size,
    taskId,
    imageUrl: result.imageUrl,
  };

  if (body.lazyImage) {
    return { status: 'completed', taskId, image: meta };
  }

  const { dataUrl, fileName } = await imagePayloadFromUrl(
    result.imageUrl,
    batchId || 'gpt-open',
    index,
    seed
  );

  return {
    status: 'completed',
    taskId,
    image: { ...meta, dataUrl, fileName },
  };
}

module.exports = {
  readOpenConfig,
  isImageConfigured,
  isThinkConfigured,
  probeThinkAvailability,
  invalidateThinkProbeCache,
  getHealthPayload,
  getHealthPayloadAsync,
  runThinkComplete,
  streamThink,
  extractFinalPrompt,
  runOpenSubmit,
  runOpenPoll,
};
