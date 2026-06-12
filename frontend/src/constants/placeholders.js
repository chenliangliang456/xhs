/** 占位图 — 本地静态资源，避免外链失效或国内访问不稳定 */
export const PLACEHOLDERS = {
  home: '/placeholders/home.jpg',
  homeBanner: '/placeholders/homeBanner.jpg',
  login: '/placeholders/login.jpg',
  publish: '/placeholders/publish.jpg',
  batchImage: '/placeholders/batchImage.jpg',
  materials: '/placeholders/materials.jpg',
  settings: '/placeholders/settings.jpg',
  emptyGallery: '/placeholders/emptyGallery.jpg',
  emptyUpload: '/placeholders/emptyUpload.jpg',
  emptyMaterials: '/placeholders/emptyMaterials.jpg',
  workflow: '/placeholders/workflow.jpg',
  abcSet: '/placeholders/abcSet.jpg',
};

/** 主界面功能入口卡片 */
export const FEATURE_CARDS = [
  {
    path: '/batch-image',
    title: 'AI 批量生图',
    desc: '文生图 · ABC 套装 · 五宫格',
    image: PLACEHOLDERS.batchImage,
    accent: '#6366f1',
    icon: 'MagicStick',
  },
  {
    path: '/gpt-image',
    title: 'GPT 开放生图',
    desc: '无额度限制 · 上传修改 · 思考可见',
    image: PLACEHOLDERS.batchImage,
    accent: '#10b981',
    icon: 'PictureFilled',
  },
  {
    path: '/materials',
    title: '素材库',
    desc: 'A / B / C 成套管理',
    image: PLACEHOLDERS.materials,
    accent: '#f59e0b',
    icon: 'Picture',
  },
  {
    path: '/copy-viral',
    title: '爆款文案',
    desc: 'DeepSeek · 只生文',
    image: PLACEHOLDERS.home,
    accent: '#ec4899',
    icon: 'EditPen',
  },
  {
    path: '/publish',
    title: '发布草稿',
    desc: 'AI 文案 · 复制手动发',
    image: PLACEHOLDERS.publish,
    accent: '#ff2442',
    icon: 'DocumentCopy',
    featured: true,
  },
  {
    path: '/settings',
    title: '系统设置',
    desc: '生图 · AI 配置',
    image: PLACEHOLDERS.settings,
    accent: '#64748b',
    icon: 'Setting',
  },
];

export const WORKFLOW_STEPS = [
  { num: 1, title: '批量生图', desc: '文生图并勾选锚点 A', icon: 'MagicStick', to: '/batch-image' },
  { num: 2, title: '生成 B + C', desc: '五宫格 + 产品信息图', icon: 'Grid', to: '/batch-image' },
  { num: 3, title: '存入素材库', desc: 'a / b / c 成套保存', icon: 'FolderOpened', to: '/materials' },
  { num: 4, title: 'AI 文案', desc: 'DeepSeek 种草文案', icon: 'EditPen', to: '/copy-viral' },
  { num: 5, title: '手动发布', desc: '复制文案 · 手机 App', icon: 'DocumentCopy', to: '/publish' },
];

/** 批量生图页内步骤（与 WORKFLOW_STEPS 前两步对应） */
export const BATCH_IMAGE_WORKFLOW = [
  { num: 1, title: '填写描述', desc: '设置数量与尺寸后批量出图', icon: 'Edit' },
  { num: 2, title: '勾选锚点 A', desc: '点击缩略图勾选（非预览）', icon: 'Select' },
  { num: 3, title: '生成 B + C', desc: '填写产品信息后一键生成', icon: 'Grid' },
  { num: 4, title: '保存素材', desc: '成套写入 a/b/c 文件夹', icon: 'FolderOpened', to: '/materials' },
  { num: 5, title: '复制文案', desc: '生成种草文 · 手机手动发', icon: 'DocumentCopy', to: '/publish' },
];
