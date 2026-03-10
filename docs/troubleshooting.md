# Troubleshooting Guide / 故障排除指南

## Common Issues / 常见问题

### 1. Node.js Module Version Mismatch

**Error:**
```
The module '...better_sqlite3.node' was compiled against a different Node.js version
using NODE_MODULE_VERSION 130. This version of Node.js requires NODE_MODULE_VERSION 127.
```

**问题描述：**
```
模块 '...better_sqlite3.node' 是用不同的 Node.js 版本编译的
使用了 NODE_MODULE_VERSION 130，但当前 Node.js 版本需要 NODE_MODULE_VERSION 127。
```

**Solution / 解决方案:**

```bash
# 1. Check your Node.js version / 检查 Node.js 版本
node --version  # Should be >= 20.0.0

# 2. Use the correct Node.js version / 使用正确的 Node.js 版本
# If using nvm:
nvm use

# 3. Clean and reinstall / 清理并重新安装
rm -rf node_modules
pnpm install

# 4. For desktop app, rebuild / 桌面应用需要重新构建
pnpm build:binary
```

**Prevention / 预防措施:**

This project uses Node.js version locking:
- `.nvmrc` - for nvm users (recommended)
- `.node-version` - for other version managers
- `package.json` engines field

本项目使用 Node.js 版本锁定：
- `.nvmrc` - 适用于 nvm 用户（推荐）
- `.node-version` - 适用于其他版本管理器
- `package.json` 的 engines 字段

---

### 2. Better-sqlite3 Build Issues / Better-sqlite3 构建问题

**Error:**
```
gyp ERR! build error
```

**Solution / 解决方案:**

```bash
# Install build tools / 安装构建工具
# macOS:
xcode-select --install

# Ubuntu/Debian:
sudo apt-get install build-essential python3

# Windows:
npm install --global windows-build-tools

# Then reinstall / 然后重新安装
pnpm install
```

---

### 3. Desktop App Won't Start / 桌面应用无法启动

**Check logs / 查看日志:**

```bash
# macOS/Linux:
tail -f /tmp/oneclaw-startup.log
# or
tail -f ~/Library/Application\ Support/@oneclaw/desktop/main.log

# Windows:
# Check %APPDATA%\@oneclaw\desktop\main.log
```

**Common fixes / 常见修复:**

```bash
# 1. Rebuild the app / 重新构建应用
pnpm build:binary

# 2. Clean build / 清理构建
rm -rf desktop/dist-electron
pnpm build:binary
```

---

### 4. OpenClaw Gateway Not Starting / OpenClaw 网关无法启动

**Check:**
1. OpenClaw is installed: `openclaw --version`
2. Port is not in use: `lsof -i :18789` (default port)
3. Check gateway logs in workspace

**检查：**
1. OpenClaw 已安装：`openclaw --version`
2. 端口未被占用：`lsof -i :18789`（默认端口）
3. 检查工作区中的网关日志

---

### 5. Database Locked / 数据库锁定

**Error:**
```
SQLITE_BUSY: database is locked
```

**Solution / 解决方案:**

```bash
# Stop all running instances / 停止所有运行的实例
pkill -f "oneClaw"
pkill -f "nodemon"

# Remove lock files / 删除锁文件
rm -f backend/data/*.db-shm
rm -f backend/data/*.db-wal

# Restart / 重启
pnpm run dev:web
```

---

## Need More Help? / 需要更多帮助？

- 📖 [Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/myersguo/oneClaw/issues)
- 💬 [Discord Community](https://discord.gg/openclaw)
