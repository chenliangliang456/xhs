# API 接口文档

基础 URL：`http://localhost:3000/api`

认证方式：除登录和健康检查外，所有接口需在 Header 中携带：

```
Authorization: Bearer <token>
```

统一响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

---

## 1. 认证模块

### POST /auth/login

管理员登录

**请求体：**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "username": "admin"
  },
  "message": "登录成功"
}
```

### GET /auth/profile

获取当前用户信息（需认证）

### PUT /auth/password

修改密码（需认证）

---

## 2. 账号管理

### GET /accounts

获取小红书账号列表

### POST /accounts

新增账号（Cookie 或密码认证）

### PUT /accounts/:id

编辑账号

### DELETE /accounts/:id

删除账号

### PATCH /accounts/:id/toggle

切换账号启用/禁用

---

## 2.1 扫码登录

### POST /accounts/qr/start

发起小红书扫码登录，返回二维码（Base64 图片）

**响应：**

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "qrCode": "data:image/png;base64,...",
    "expiresIn": 120
  }
}
```

### GET /accounts/qr/:sessionId/status

轮询扫码状态（建议 2 秒间隔）

**状态：** `waiting` | `success` | `expired`

### POST /accounts/qr/:sessionId/confirm

确认登录并保存账号

**请求体：**

```json
{
  "name": "主号",
  "remark": "可选备注"
}
```

### DELETE /accounts/qr/:sessionId

取消扫码会话

> 首次使用需安装：`cd backend && npx playwright install chromium`

---

## 3. 图片上传

### POST /upload

上传产品图片（multipart/form-data，字段名 images）

### DELETE /upload/:filename

删除已上传图片

---

## 4. AI 文案生成

### POST /ai/generate

**请求体：**

```json
{
  "productName": "玻尿酸补水面膜",
  "sellingPoints": "深层补水、温和不刺激",
  "productType": "护肤",
  "targetAudience": "20-30岁女性",
  "style": "口语化种草风",
  "imageFilenames": ["abc.jpg"]
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "title": "爆款标题",
    "content": "正文文案",
    "tags": ["标签1", "标签2"]
  }
}
```

---

## 5. 发布任务

### POST /publish

创建多账号发布任务

### GET /publish/:taskId

获取任务状态（轮询）

### POST /publish/republish/:recordId

基于历史记录重新发布

---

## 6. 发布记录

### GET /records?page=1&pageSize=20

获取发布记录列表

### GET /records/:id

获取单条记录详情

---

## 7. 系统配置

### GET /settings

获取当前配置（来自 `backend/.env`，只读，API Key 脱敏）

> 配置项在 `backend/.env` 中维护，修改后需重启后端。参考 `backend/.env.example`。

---

## 8. 健康检查

### GET /health

无需认证，返回服务状态
