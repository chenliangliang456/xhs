# 小红书多账号智能发布助手

上传产品图片 → AI 生成爆款文案 → 多账号一键发布 → 发布结果统计

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + Pinia + Axios |
| 后端 | Node.js + Express |
| 数据库 | lowdb（本地 JSON 文件） |
| 图片处理 | sharp + multer |

## 项目结构

```
小红书/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── app.js              # 入口文件
│   │   ├── middleware/         # 中间件（JWT 认证）
│   │   ├── routes/             # API 路由
│   │   │   ├── auth.js         # 登录认证
│   │   │   ├── accounts.js     # 账号 CRUD
│   │   │   ├── upload.js       # 图片上传
│   │   │   ├── ai.js           # AI 文案生成
│   │   │   ├── publish.js      # 发布任务
│   │   │   ├── records.js      # 发布记录
│   │   │   └── settings.js     # 系统配置
│   │   ├── services/           # 业务逻辑
│   │   │   ├── db.js           # lowdb 数据库
│   │   │   ├── crypto.js       # 加密服务
│   │   │   ├── ai.js           # AI 文案服务
│   │   │   ├── xiaohongshu.js  # 小红书发布服务
│   │   │   └── publishQueue.js # 发布任务队列
│   │   └── utils/              # 工具函数
│   ├── data/                   # 数据库文件（自动生成）
│   └── uploads/                # 上传图片目录
├── frontend/                   # 前端应用
│   └── src/
│       ├── views/              # 页面
│       │   ├── Login.vue       # 登录页
│       │   ├── Publish.vue     # 一键发布（核心流程）
│       │   ├── Accounts.vue    # 账号管理
│       │   ├── Records.vue     # 发布记录
│       │   └── Settings.vue    # 系统设置
│       ├── components/         # 公共组件
│       ├── api/                # API 封装
│       ├── stores/             # Pinia 状态
│       └── router/             # 路由配置
├── docs/
│   └── API.md                  # 接口文档
└── README.md
```

## 快速启动

### 环境要求

- Node.js >= 18
- npm >= 9

### 1. 安装依赖

```bash
# 一键安装前后端依赖
npm run install:all

# 或分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 AI API 和小红书发布接口
```

主要配置项：

| 变量 | 说明 |
|------|------|
| `AI_API_URL` | AI 文案接口地址 |
| `AI_API_KEY` | AI API 密钥 |
| `AI_API_MODEL` | 模型名称 |
| `XHS_PUBLISH_URL` | 小红书发布接口 |
| `XHS_UPLOAD_URL` | 小红书图片上传接口 |
| `PUBLISH_INTERVAL` | 多账号发布间隔（毫秒） |

完整变量说明见 `backend/.env.example`。

### 3. 启动后端

```bash
cd backend
npm run dev
# 服务运行在 http://localhost:3000
```

### 4. 启动前端

```bash
cd frontend
npm run dev
# 访问 http://localhost:5173
```

### 5. 登录

- 默认账号：`admin`
- 默认密码：`admin123`

## 使用教程

### 第一步：配置 .env

编辑 `backend/.env` 文件：

1. **AI 文案 API**：填入 `AI_API_URL` 和 `AI_API_KEY`（留空则本地模拟生成）
2. **小红书发布**：默认 `XHS_PUBLISH_MODE=browser`（扫码 Cookie + 浏览器自动发帖，无需外部接口）；也可填 `XHS_PUBLISH_URL` 走 HTTP 接口
3. **发布策略**：调整 `PUBLISH_INTERVAL`、`PUBLISH_RETRY_COUNT`

修改后需重启后端服务。可在 **系统设置** 页面查看当前配置状态（只读）。

### 第二步：添加小红书账号

进入 **账号管理** 页面，两种方式添加：

- **扫码登录（推荐）**：点击「扫码登录」，用小红书 App 扫描二维码，自动获取 Cookie
- **手动添加**：粘贴 Cookie 或填写账号密码

首次使用扫码登录需安装浏览器内核：

```bash
cd backend && npx playwright install chromium
```

账号信息使用 AES-256-GCM 加密存储在本地。

### 第三步：一键发布

进入 **一键发布** 页面，按步骤操作：

1. **上传图片** — 支持多张，可拖拽排序
2. **填写产品信息** — 名称、卖点、类型、人群、风格
3. **AI 生成文案** — 自动生成标题、正文、标签，支持编辑和复制
4. **选择账号** — 批量勾选要发布的账号
5. **开始发布** — 实时查看每个账号的发布状态

### 第四步：查看记录

进入 **发布记录** 页面，查看历史发布详情，支持一键重新发布。

## 核心逻辑说明

### 发布流程

```
前端提交 → 创建任务 → 任务队列依次执行
  ├── 账号1: 上传图片 → 调用发布API → 返回状态
  ├── 等待间隔
  ├── 账号2: ...
  └── 全部完成 → 写入历史记录
```

前端每 2 秒轮询任务状态，实时展示：等待中 / 发布中 / 成功 / 失败 / 重试中。

### 模拟模式

未配置真实 API 时，系统自动进入模拟模式：

- **AI 文案**：本地模板生成种草风格文案
- **小红书发布**：设置 `XHS_PUBLISH_MODE=mock` 时模拟成功；默认 `browser` 为真实浏览器发帖

适合开发测试和功能演示。

## 生产部署建议

```bash
# 构建前端
cd frontend && npm run build

# 后端托管前端静态文件（可选）
# 在 app.js 中添加：
# app.use(express.static(path.join(__dirname, '../../frontend/dist')));

# 使用 PM2 守护进程
pm2 start backend/src/app.js --name xhs-publisher
```

环境变量（`backend/.env`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端端口 | 3000 |
| JWT_SECRET | JWT 密钥 | 内置默认值 |
| ENCRYPT_KEY | 加密密钥 | 内置默认值 |
| AI_API_URL | AI 文案接口 | 空（模拟模式） |
| AI_API_KEY | AI API 密钥 | 空 |
| XHS_PUBLISH_URL | 小红书发布接口 | 空（模拟模式） |
| PUBLISH_INTERVAL | 发布间隔(ms) | 3000 |

完整列表见 `backend/.env.example`。

## 接口文档

详见 [docs/API.md](./docs/API.md)

## License

MIT
