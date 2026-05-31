/**
 * 小红书热门种草笔记结构库（基于爆款好物笔记共性，供 AI 参考）
 * 非实时爬虫：用已验证的高转化标题/标签/正文套路引导生成，避免自嗨文案
 */

const CATEGORY_TRENDS = {
  服装吊牌: {
    audience: '服装店老板、品牌主理人、买手店',
    hooks: ['客人拆吊牌居然能种花', '吊牌从一次性垃圾变绿植盲盒', '挂上去客人拍照发朋友圈'],
    hotTags: ['种子纸吊牌', '环保吊牌', '服装店经营', '可持续时尚', '实体店流量密码', '种草好物', '环保种草'],
    titlePatterns: [
      '姐妹们！{产品}真的绝了🌱',
      '服装店老板必看！{产品}🔥',
      '我宣布！今年最炸的{产品}',
    ],
  },
  展会胸卡: {
    audience: '活动主办方、品牌市场部、会展策划',
    hooks: ['胸卡用完别扔直接埋土', '展会伴手礼自带传播属性', '参会者带走还能种出小绿芽'],
    hotTags: ['展会胸卡', '种子纸', '环保物料', '活动策划', '品牌周边', '可持续'],
    titlePatterns: ['展会人狂喜！{产品}还能发芽🌿', '{产品}让参会者记住你一整年'],
  },
  婚礼邀请函: {
    audience: '准新人、婚礼策划、文创工作室',
    hooks: ['婚礼请柬用完变盆栽太浪漫', '宾客带回家还能互动', '仪式感拉满'],
    hotTags: ['婚礼邀请函', '种子纸', '环保婚礼', '备婚好物', '创意请柬', '仪式感'],
    titlePatterns: ['备婚姐妹看过来！{产品}太浪漫了💕', '把祝福种进土里的{产品}'],
  },
  门票: {
    audience: '活动运营、景区、市集主理人',
    hooks: ['门票不是废纸是种子', '看完演出还能种花', '二次传播神器'],
    hotTags: ['创意门票', '种子纸', '活动运营', '环保门票', '市集好物'],
    titlePatterns: ['这张{产品}看完别扔！', '活动人必备{产品}🎫'],
  },
  明信片: {
    audience: '文创店、手账爱好者、礼品店',
    hooks: ['明信片寄出心意种下希望', '手账党狂喜', '送朋友超有心'],
    hotTags: ['种子纸明信片', '文创好物', '手账', '送礼推荐', '环保文创'],
    titlePatterns: ['文创人必入！{产品}🌸', '能种出来的{产品}太治愈了'],
  },
  种子纸: {
    audience: '环保爱好者、文创从业者、礼品采购',
    hooks: ['纸里藏着种子', '埋土浇水就发芽', '甘蔗浆竹浆木浆可降解'],
    hotTags: ['种子纸', '环保可降解', '甘蔗浆', '种植纸', '可持续生活', '种草'],
    titlePatterns: ['姐妹们！{产品}真的能发芽🌼', '挖到宝了！{产品}'],
  },
};

const UNIVERSAL_HOT_TAGS = [
  '好物推荐',
  '种草',
  '环保生活',
  '可持续',
  '必买清单',
  '宝藏好物',
  '真实测评',
  '干货分享',
];

const CONTENT_STRUCTURE = `
热门种草正文结构（请严格参考，禁止自嗨硬广）：
1. 开头钩子：姐妹们/家人们 + 真实惊喜发现（1-2句，句首句尾加 emoji）
2. 场景代入：谁在用、什么场景、解决什么痛点（2-3句，每句带 emoji）
3. 卖点拆解：环保可降解、甘蔗浆竹浆木浆、嵌入高级植物种子、可种植（用 ✅👉🏻🌱 等分点）
4. 使用体验：真实感受、细节描述，像闺蜜分享（emoji 丰富）
5. 行动号召：适合谁买、为什么现在入手（1-2句，带 🔥💚✨ 等）
`;

/** 小红书爆款笔记表情包要求（DeepSeek 须严格遵守） */
const EMOJI_REQUIREMENTS = `
【表情包硬性要求 — 非常重要，必须遵守】
- 标题：至少 2～3 个 emoji（如 🌱✨🔥💕👀），有吸引力
- 正文：每一段至少 1～2 个 emoji，全文合计至少 18～30 个 emoji，自然穿插在句首、句中、句尾
- 分点/列举用：✅ 👉🏻 🌟 💚 🪴 📸 等做小标题或行首符号
- 推荐 emoji 库：🌱🌿💚✨🔥👀💕🥹🪴📸✅👉🏻💖🌼🎁💯🌍♻️🌻🎫💌 等，贴合种子纸/环保/种植场景
- 禁止整段无 emoji，禁止只堆在末尾；要像小红书热榜笔记那样表情丰富、活泼亲切
`;

function matchCategoryTrend(productCategory) {
  const key = String(productCategory || '').trim();
  if (CATEGORY_TRENDS[key]) return CATEGORY_TRENDS[key];
  for (const [name, trend] of Object.entries(CATEGORY_TRENDS)) {
    if (key.includes(name) || name.includes(key)) return trend;
  }
  return CATEGORY_TRENDS['种子纸'];
}

function getTrendContext(productCategory) {
  const trend = matchCategoryTrend(productCategory);
  const product = productCategory || '种子纸好物';
  const titles = trend.titlePatterns.map((p) => p.replace('{产品}', product)).slice(0, 3);

  return {
    trend,
    hotPatterns: CONTENT_STRUCTURE,
    titleFormulas: `热门标题参考（改写勿照抄）：\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    recommendedTags: `推荐标签池（选5个最热的组合）：${[...trend.hotTags, ...UNIVERSAL_HOT_TAGS].join('、')}`,
    hooks: trend.hooks,
    audience: trend.audience,
  };
}

function buildAbcViralPrompt(params) {
  const {
    productCategory,
    productInfo,
    productDimensions,
    setIndex,
    genTags,
    designPrompt,
    styleKey,
  } = params;

  const ctx = getTrendContext(productCategory);
  const productName = productCategory || '种子纸好物';

  return `你是一位深谙小红书算法、擅长「好物推荐/种草」的爆款文案写手。
请使用 DeepSeek 的理解能力，先读懂所附 ABC 套装配图（A锚点主图、B宫格、C产品详情），再结合下方「热门笔记结构分析」创作。

${EMOJI_REQUIREMENTS}

【热门笔记结构分析】（对标小红书热榜好物推荐笔记，禁止自嗨、禁止硬广腔）
${ctx.hotPatterns}

${ctx.titleFormulas}

${ctx.recommendedTags}

开头钩子参考：${ctx.hooks.join('；')}

【本套产品信息】
套装编号：a${setIndex} / b${setIndex} / c${setIndex}
产品分类：${productName}
产品尺寸：${productDimensions || '见详情图'}
产品信息：${productInfo || '产品：种子纸；成分：甘蔗浆、竹浆、木浆；特性：环保可降解，只内嵌入种植植物种子'}
视觉特征：${genTags || '见配图'}
设计描述：${designPrompt || '见锚点A图'}

【目标读者】${ctx.audience}
【风格】${styleKey || '口语化种草风'}，真实闺蜜分享感，像小红书热门好物推荐

【硬性要求】
- 必须是「推荐好物/种草」视角，不是厂家自夸
- 标题 20 字内，必须含 2～3 个 emoji
- 正文 300～500 字，分段，每段 emoji 丰富，全文至少 18 个 emoji
- 5 个标签，从推荐标签池选取；标签文字本身不加 emoji
- 结合附图产品设计（颜色、形状、风格）写具体

请严格以 JSON 返回，不要其他文字：
{
  "title": "标题（含多个emoji）",
  "content": "正文（emoji丰富）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`;
}

function buildMockAbcCopy(params) {
  const { productCategory, productInfo, setIndex, genTags } = params;
  const ctx = getTrendContext(productCategory);
  const product = productCategory || '种子纸好物';
  const hook = ctx.hooks[Number(setIndex || 0) % ctx.hooks.length];
  const titleTemplate = ctx.trend.titlePatterns[Number(setIndex || 0) % ctx.trend.titlePatterns.length];
  const title = titleTemplate.replace('{产品}', product).slice(0, 20);

  const infoLines = String(productInfo || '')
    .split('\n')
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');

  const content =
    `姐妹们！今天必须给你们安利这个${product}！🌱✨\n\n` +
    `${hook} 👀 我第一眼看到${genTags ? `（${genTags}）` : '配图'}就直接被种草了 💕\n\n` +
    `${infoLines || '🌍 环保可降解，成分甘蔗浆、竹浆、木浆，纸内嵌入高级植物种子 🌿'}\n\n` +
    `✅ 适合${ctx.audience}\n` +
    `✅ 真实好物推荐，不是硬广 📸\n` +
    `✅ 用完还能种，仪式感拉满 🪴💚\n\n` +
    `用过的人都说好，赶紧冲！🔥💯`;

  const tags = [...ctx.trend.hotTags.slice(0, 3), '好物推荐', '种草'].slice(0, 5);

  return { title, content, tags };
}

module.exports = {
  getTrendContext,
  buildAbcViralPrompt,
  buildMockAbcCopy,
  EMOJI_REQUIREMENTS,
  CATEGORY_TRENDS,
};
