/**
 * 发布任务队列服务
 * 按顺序/并发执行多账号发布任务，支持重试和状态追踪
 */
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('./db');
const { config } = require('../config/env');
const { publishNote } = require('./xiaohongshu');
const logger = require('../utils/logger');

// 内存中的任务状态（用于实时轮询）
const activeTasks = new Map();

/**
 * 获取发布配置（来自 .env）
 */
function getPublishConfig() {
  return config.publish;
}

/**
 * 创建发布任务
 */
async function createPublishTask(params) {
  const { title, content, tags, imagePaths, accountIds } = params;
  const db = getDb();

  const taskId = uuidv4();
  const accounts = db.data.accounts.filter((a) => accountIds.includes(a.id) && a.enabled);

  if (accounts.length === 0) {
    throw new Error('没有可用的发布账号');
  }

  const task = {
    id: taskId,
    title,
    content,
    tags,
    imagePaths,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: accounts.map((acc) => ({
      accountId: acc.id,
      accountName: acc.name,
      status: 'waiting',
      message: '',
      noteId: null,
      retries: 0,
    })),
  };

  // 保存到内存和数据库
  activeTasks.set(taskId, task);
  db.data.tasks[taskId] = task;
  await saveDb();

  // 异步执行发布队列
  executeTask(taskId).catch((err) => {
    logger.error(`任务 ${taskId} 执行异常:`, err.message);
  });

  return task;
}

/**
 * 执行发布任务队列
 */
async function executeTask(taskId) {
  const task = activeTasks.get(taskId) || getDb().data.tasks[taskId];
  if (!task) return;

  const config = getPublishConfig();
  const db = getDb();

  task.status = 'running';
  task.updatedAt = new Date().toISOString();
  await updateTask(task);

  for (let i = 0; i < task.items.length; i++) {
    const item = task.items[i];
    const account = db.data.accounts.find((a) => a.id === item.accountId);

    if (!account || !account.enabled) {
      item.status = 'failed';
      item.message = '账号不存在或已禁用';
      await updateTask(task);
      continue;
    }

    item.status = 'publishing';
    await updateTask(task);

    let success = false;
    let lastError = '';

    for (let retry = 0; retry <= config.retryCount; retry++) {
      if (retry > 0) {
        item.retries = retry;
        item.status = 'retrying';
        item.message = `第 ${retry} 次重试...`;
        await updateTask(task);
      }

      const result = await publishNote({
        account: {
          ...account,
          cookie: account.cookie,
          password: account.password,
          profilePath: account.profilePath,
        },
        title: task.title,
        content: task.content,
        tags: task.tags,
        imagePaths: task.imagePaths,
      });

      if (result.success && isRealNoteId(result.noteId)) {
        item.status = 'success';
        item.message = result.message;
        item.noteId = result.noteId;
        success = true;
        break;
      }

      if (result.success && !isRealNoteId(result.noteId)) {
        lastError =
          '发布未获得小红书笔记ID，可能未真正提交成功，请到创作者中心「笔记管理」确认';
        continue;
      }

      lastError = result.message;
    }

    if (!success) {
      item.status = 'failed';
      item.message = lastError || '发布失败';
    }

    await updateTask(task);

    // 账号间发布间隔
    if (i < task.items.length - 1) {
      await sleep(config.interval);
    }
  }

  // 任务完成
  const allSuccess = task.items.every((i) => i.status === 'success');
  const allFailed = task.items.every((i) => i.status === 'failed');

  task.status = allSuccess ? 'completed' : allFailed ? 'failed' : 'partial';
  task.updatedAt = new Date().toISOString();
  await updateTask(task);

  // 写入历史记录
  await saveRecord(task);

  logger.info(`任务 ${taskId} 完成，状态: ${task.status}`);
}

/**
 * 保存发布记录
 */
async function saveRecord(task) {
  const db = getDb();

  const record = {
    id: uuidv4(),
    taskId: task.id,
    title: task.title,
    content: task.content,
    tags: task.tags,
    imagePaths: task.imagePaths,
    status: task.status,
    items: task.items,
    createdAt: task.createdAt,
    completedAt: new Date().toISOString(),
  };

  db.data.records.unshift(record);

  // 最多保留 500 条记录
  if (db.data.records.length > 500) {
    db.data.records = db.data.records.slice(0, 500);
  }

  await saveDb();
  return record;
}

/**
 * 更新任务状态
 */
async function updateTask(task) {
  activeTasks.set(task.id, { ...task });
  const db = getDb();
  db.data.tasks[task.id] = { ...task };
  await saveDb();
}

/**
 * 获取任务状态（供前端轮询）
 */
function getTaskStatus(taskId) {
  return activeTasks.get(taskId) || getDb().data.tasks[taskId] || null;
}

/**
 * 重新发布（基于历史记录）
 */
async function republishFromRecord(recordId, accountIds) {
  const db = getDb();
  const record = db.data.records.find((r) => r.id === recordId);

  if (!record) {
    throw new Error('发布记录不存在');
  }

  const ids = accountIds || record.items.map((i) => i.accountId);

  return createPublishTask({
    title: record.title,
    content: record.content,
    tags: record.tags,
    imagePaths: record.imagePaths,
    accountIds: ids,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 平台真实笔记 ID（排除模拟/占位 ID） */
function isRealNoteId(noteId) {
  if (!noteId) return false;
  const s = String(noteId);
  if (s.startsWith('browser_') || s.startsWith('mock_')) return false;
  return /^[a-f0-9]{16,}$/i.test(s) || s.length >= 12;
}

async function waitForTask(taskId, timeoutMs = 360000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = getTaskStatus(taskId);
    if (!task) throw new Error('发布任务不存在');
    if (['completed', 'failed', 'partial'].includes(task.status)) {
      return task;
    }
    await sleep(2000);
  }
  throw new Error('发布任务超时');
}

async function createPublishTaskAndWait(params) {
  const task = await createPublishTask(params);
  return waitForTask(task.id);
}

module.exports = {
  createPublishTask,
  createPublishTaskAndWait,
  getTaskStatus,
  republishFromRecord,
  isRealNoteId,
  activeTasks,
};
