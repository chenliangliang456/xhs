/**
 * 定时发布服务 — 每天 3 个时间点各自动发 1 条笔记（含 a+b+c 三图）
 * 按套装编号顺序自动取下一套，无需人工选款
 */
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('./db');
const { listAll, MATERIALS_DIR } = require('./materials');
const { generateCopy } = require('./ai');
const { createPublishTaskAndWait } = require('./publishQueue');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = Number(process.env.SCHEDULE_CHECK_MS) || 30000;
const DEFAULT_TIMES = ['09:00', '14:00', '20:00'];
const MAX_SLOTS = 3;

let timer = null;
let ticking = false;

function defaultSchedule() {
  return {
    enabled: false,
    times: [...DEFAULT_TIMES],
    accountIds: [],
    productForm: {
      productName: '',
      sellingPoints: '',
      productType: '',
      targetAudience: '',
      style: '口语化种草风',
    },
    /** 各时间点上次成功发布的日期 { "09:00": "2026-05-26" } */
    lastRuns: {},
    usedSetIndexes: [],
  };
}

function ensureSchedule() {
  const db = getDb();
  if (!db.data.schedule) {
    db.data.schedule = defaultSchedule();
  }
  if (!Array.isArray(db.data.scheduleLogs)) {
    db.data.scheduleLogs = [];
  }
  const schedule = db.data.schedule;
  if (!schedule.times?.length) {
    schedule.times = [...DEFAULT_TIMES];
  }
  while (schedule.times.length < MAX_SLOTS) {
    schedule.times.push(DEFAULT_TIMES[schedule.times.length] || '20:00');
  }
  if (!schedule.lastRuns || typeof schedule.lastRuns !== 'object') {
    schedule.lastRuns = {};
  }
  pruneLastRuns(schedule);
  ensureDailyProgress(schedule);
  return schedule;
}

/** 跨天自动清空进度，每天从 #1 重新排 */
function ensureDailyProgress(schedule) {
  const today = todayKey();
  if (schedule.progressDate === today) return false;
  schedule.progressDate = today;
  schedule.usedSetIndexes = [];
  schedule.lastRuns = {};
  logger.info('[定时发布] 新的一天，已重置今日发布进度');
  return true;
}

/** 去掉已废弃时间点的 lastRuns，避免干扰队列显示 */
function pruneLastRuns(schedule) {
  const valid = new Set(getScheduleTimes(schedule));
  for (const key of Object.keys(schedule.lastRuns || {})) {
    if (!valid.has(key)) delete schedule.lastRuns[key];
  }
}

/** 今日在当前 3 个时间点已成功发过的套装编号（只认当前配置的时间点） */
function getPublishedSetIndexesToday(schedule) {
  const today = todayKey();
  const validSlots = new Set(getScheduleTimes(schedule));
  const indexes = new Set();
  const db = getDb();
  for (const log of db.data.scheduleLogs || []) {
    if (log.status !== 'success' || !log.setIndex) continue;
    if ((log.createdAt || '').slice(0, 10) !== today) continue;
    const slot = normalizeTime(log.slot);
    if (slot && validSlots.has(slot)) {
      indexes.add(String(log.setIndex));
    }
  }
  return indexes;
}

function slotDoneToday(schedule, slot) {
  const today = todayKey();
  if (schedule.lastRuns?.[slot] === today) return true;
  const db = getDb();
  return (db.data.scheduleLogs || []).some(
    (log) =>
      log.status === 'success' &&
      normalizeTime(log.slot) === slot &&
      (log.createdAt || '').slice(0, 10) === today
  );
}

function slotDisplayStatus(schedule, slot) {
  if (slotDoneToday(schedule, slot)) return 'done';
  if (matchTimeSlot(slot, currentHm())) return 'due_now';
  if (hmToMinutes(currentHm()) > hmToMinutes(slot) + 2) return 'missed';
  return 'pending';
}

function normalizeTime(t) {
  const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getScheduleTimes(schedule) {
  return (schedule.times || [])
    .map(normalizeTime)
    .filter(Boolean)
    .slice(0, MAX_SLOTS);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function hmToMinutes(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** 当前分钟是否命中定时点（±2 分钟容差，仅到点才发，不补发） */
function matchTimeSlot(slotHm, nowHm) {
  const diff = Math.abs(hmToMinutes(slotHm) - hmToMinutes(nowHm));
  return diff <= 2;
}

/** 该时间点是否应在本次 tick 发布（严格到点，已过时间不补发） */
function isSlotDue(schedule, slotHm) {
  const today = todayKey();
  if (schedule.lastRuns?.[slotHm] === today) return false;
  return matchTimeSlot(slotHm, currentHm());
}

function getImagePathsForGroup(group) {
  const paths = [];
  for (const slot of ['a', 'b', 'c']) {
    const item = group[slot];
    if (item?.path) {
      paths.push(path.join(MATERIALS_DIR, item.path));
    }
  }
  return paths;
}

function pickNextCompleteSet(schedule, { dryRun = false, reservedIndexes = null } = {}) {
  const { groups } = listAll();
  const complete = groups
    .filter((g) => g.complete)
    .sort((a, b) => Number(a.index) - Number(b.index));
  if (!complete.length) {
    return { group: null, reason: '素材库没有完整的 ABC 套装（a+b+c 同编号）' };
  }

  const used =
    reservedIndexes ||
    new Set([
      ...getPublishedSetIndexesToday(schedule),
      ...(schedule.usedSetIndexes || []).map(String),
    ]);
  let candidate = complete.find((g) => !used.has(String(g.index)));

  if (!candidate) {
    if (dryRun) {
      return { group: null, reason: '全部套装已发完，请补充素材或点「重置今日进度」' };
    }
    schedule.usedSetIndexes = [];
    candidate = complete[0];
    logger.info('[定时发布] 成套素材已轮播一轮，从 a1 重新开始');
  }

  return { group: candidate, reason: null };
}

/** 预览今日各时间点将自动发布的套装（无需人工选款） */
function buildTodayQueue(schedule) {
  const times = getScheduleTimes(schedule);
  const reserved = new Set(getPublishedSetIndexesToday(schedule));
  const queue = [];

  for (const slot of times) {
    if (slotDoneToday(schedule, slot)) {
      const log = (getDb().data.scheduleLogs || []).find(
        (l) =>
          l.status === 'success' &&
          normalizeTime(l.slot) === slot &&
          (l.createdAt || '').slice(0, 10) === todayKey()
      );
      queue.push({
        slot,
        setIndex: log?.setIndex ?? null,
        status: 'done',
      });
      continue;
    }
    const { group } = pickNextCompleteSet(schedule, {
      dryRun: true,
      reservedIndexes: reserved,
    });
    if (!group) {
      queue.push({ slot, setIndex: null, status: 'no_material' });
      continue;
    }
    queue.push({
      slot,
      setIndex: group.index,
      status: slotDisplayStatus(schedule, slot),
    });
    reserved.add(String(group.index));
  }
  return queue;
}

async function appendLog(entry) {
  const db = getDb();
  db.data.scheduleLogs.unshift({
    id: uuidv4(),
    ...entry,
    createdAt: new Date().toISOString(),
  });
  if (db.data.scheduleLogs.length > 200) {
    db.data.scheduleLogs = db.data.scheduleLogs.slice(0, 200);
  }
  await saveDb();
}

async function runScheduledSlot(slotTime, { manual = false } = {}) {
  const schedule = ensureSchedule();
  const db = getDb();
  const today = todayKey();
  const slot = normalizeTime(slotTime) || '09:00';

  if (!manual && slotDoneToday(schedule, slot)) {
    return { skipped: true, message: `${slot} 今日已自动发布` };
  }

  const accounts = db.data.accounts.filter(
    (a) => schedule.accountIds.includes(a.id) && a.enabled
  );
  if (!accounts.length) {
    await appendLog({ slot, status: 'failed', message: '未选择可用发布账号' });
    return { success: false, message: '未选择可用发布账号' };
  }

  const { group, reason } = pickNextCompleteSet(schedule);
  if (!group) {
    await appendLog({ slot, status: 'failed', message: reason });
    return { success: false, message: reason };
  }

  const imagePaths = getImagePathsForGroup(group);
  const pf = schedule.productForm || {};

  if (!pf.productName?.trim()) {
    await appendLog({
      slot,
      status: 'failed',
      message: '请先在定时发布中填写产品名称',
    });
    return { success: false, message: '请填写产品名称' };
  }

  logger.info(
    `[定时发布] ${manual ? '手动试发' : slot} 开始，套装 #${group.index}（a+b+c 三图）`
  );

  let copy;
  try {
    copy = await generateCopy({
      productName: pf.productName,
      sellingPoints: pf.sellingPoints || '',
      productType: pf.productType || '',
      targetAudience: pf.targetAudience || '',
      style: pf.style || '口语化种草风',
      imagePaths,
      setIndex: group.index,
      variantHint: `请根据本套 a${group.index}/b${group.index}/c${group.index} 配图内容创作，标题、正文、5个标签均需新颖独特，不得与其他套装雷同。`,
    });
  } catch (err) {
    await appendLog({
      slot,
      status: 'failed',
      setIndex: group.index,
      message: `AI 文案失败：${err.message}`,
    });
    return { success: false, message: err.message };
  }

  const { title, content, tags } = copy;

  try {
    const task = await createPublishTaskAndWait({
      title,
      content,
      tags: tags || [],
      imagePaths,
      accountIds: accounts.map((a) => a.id),
    });

    const successItems = task.items.filter((i) => i.status === 'success');
    const failedItems = task.items.filter((i) => i.status === 'failed');

    if (!successItems.length) {
      const msg = failedItems[0]?.message || '发布失败，未获得平台笔记ID';
      await appendLog({
        slot,
        status: 'failed',
        setIndex: group.index,
        title,
        message: msg,
        taskId: task.id,
      });
      return { success: false, message: msg };
    }

    if (!manual) {
      schedule.lastRuns[slot] = today;
    }
    if (!schedule.usedSetIndexes.includes(String(group.index))) {
      schedule.usedSetIndexes.push(String(group.index));
    }
    await saveDb();

    const noteIds = successItems.map((i) => i.noteId).filter(Boolean);
    await appendLog({
      slot,
      status: 'success',
      setIndex: group.index,
      title,
      message: `发布成功（${successItems.length} 个账号，含 a+b+c 三图），笔记已进入审核`,
      noteIds,
      taskId: task.id,
    });

    logger.info(`[定时发布] ${slot} 成功 套装#${group.index} noteId=${noteIds.join(',')}`);
    return { success: true, task, noteIds, setIndex: group.index };
  } catch (err) {
    await appendLog({
      slot,
      status: 'failed',
      setIndex: group.index,
      title,
      message: err.message || '发布异常',
    });
    return { success: false, message: err.message };
  }
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const schedule = ensureSchedule();
    if (!schedule.enabled) return;

    const times = getScheduleTimes(schedule);
    for (const slot of times) {
      if (!isSlotDue(schedule, slot)) continue;
      await runScheduledSlot(slot);
    }
  } catch (err) {
    logger.error('[定时发布] tick 异常:', err.message);
  } finally {
    ticking = false;
  }
}

function getScheduleStatus() {
  const schedule = ensureSchedule();
  const { groups } = listAll();
  const publishedToday = getPublishedSetIndexesToday(schedule);
  const completeCount = groups.filter((g) => g.complete).length;
  const unusedCount = groups.filter(
    (g) => g.complete && !publishedToday.has(String(g.index))
  ).length;

  const todayQueue = buildTodayQueue(schedule);
  const now = new Date();

  let blockedReason = null;
  if (!schedule.enabled) {
    blockedReason = '定时发布开关未开启，请打开上方开关并保存';
  } else if (!schedule.accountIds?.length) {
    blockedReason = '未选择发布账号';
  } else if (!schedule.productForm?.productName?.trim()) {
    blockedReason = '未填写产品名称';
  } else if (completeCount === 0) {
    blockedReason = '素材库没有完整 ABC 套装';
  }

  return {
    ...schedule,
    times: getScheduleTimes(schedule),
    completeSetCount: completeCount,
    unusedSetCount: unusedCount,
    todayQueue,
    blockedReason,
    serverTime: now.toISOString(),
  };
}

async function resetTodayProgress() {
  const schedule = ensureSchedule();
  const times = getScheduleTimes(schedule);
  for (const slot of times) {
    delete schedule.lastRuns[slot];
  }
  schedule.usedSetIndexes = [];
  await saveDb();
  logger.info('[定时发布] 用户重置今日进度');
  return getScheduleStatus();
}

async function updateSchedule(payload) {
  const schedule = ensureSchedule();
  if (typeof payload.enabled === 'boolean') schedule.enabled = payload.enabled;
  if (Array.isArray(payload.times)) {
    const normalized = payload.times.map(normalizeTime).filter(Boolean);
    if (normalized.length) {
      schedule.times = normalized.slice(0, MAX_SLOTS);
      while (schedule.times.length < MAX_SLOTS) {
        schedule.times.push(DEFAULT_TIMES[schedule.times.length] || '20:00');
      }
    }
  }
  if (Array.isArray(payload.accountIds)) {
    schedule.accountIds = payload.accountIds;
  }
  if (payload.productForm && typeof payload.productForm === 'object') {
    schedule.productForm = {
      ...schedule.productForm,
      ...payload.productForm,
    };
  }
  await saveDb();
  return getScheduleStatus();
}

function startScheduleScheduler() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((e) => logger.error('[定时发布]', e.message));
  }, CHECK_INTERVAL_MS);
  tick().catch(() => {});
  logger.info(`[定时发布] 调度器已启动，每 ${CHECK_INTERVAL_MS / 1000}s 检查一次`);
}

function stopScheduleScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  ensureSchedule,
  getScheduleStatus,
  updateSchedule,
  resetTodayProgress,
  runScheduledSlot,
  startScheduleScheduler,
  stopScheduleScheduler,
  tick,
  buildTodayQueue,
};
