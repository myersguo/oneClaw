#!/bin/bash
set -e

# 获取绝对路径
ROOT_DIR=$(pwd)
DESKTOP_DIR="$ROOT_DIR/desktop"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "🚀 开始构建全栈应用..."

# 1. 清理旧构建
echo "🧹 清理旧构建..."
rm -rf "$DESKTOP_DIR/dist-backend" "$DESKTOP_DIR/dist-frontend" "$DESKTOP_DIR/dist-electron"

# 2. 构建所有子项目
echo "🔨 编译源码 (Frontend, Backend, Desktop)..."
# 确保所有依赖已安装
pnpm install
# 使用 pnpm 构建所有项目，确保 fresh build
# 对于 backend，我们先做正常的 build，然后用 esbuild 打包
pnpm run build
echo "📦 打包 Backend (Bundle)..."
cd "$BACKEND_DIR"
npm run bundle
cd "$ROOT_DIR"

# 3. 准备后端环境
echo "🔧 准备后端文件..."
mkdir -p "$DESKTOP_DIR/dist-backend"
# 复制编译后的代码
cp -r "$BACKEND_DIR/dist/"* "$DESKTOP_DIR/dist-backend/"
# 清理可能存在的数据库文件和数据目录
rm -rf "$DESKTOP_DIR/dist-backend/data"
rm -f "$DESKTOP_DIR/dist-backend/*.db"
rm -f "$DESKTOP_DIR/dist-backend/*.sqlite"
rm -f "$DESKTOP_DIR/dist-backend/*.sqlite-wal"
rm -f "$DESKTOP_DIR/dist-backend/*.sqlite-shm"
# 复制 package.json 用于安装依赖
cp "$BACKEND_DIR/package.json" "$DESKTOP_DIR/dist-backend/"

# 复制 knowledge 目录 (backend/src/knowledge -> desktop/dist-backend/knowledge)
# 因为打包后的 index.js 会在 desktop/dist-backend/index.js，它预期的 knowledge 目录在同级
echo "📚 复制知识库文件..."
cp -r "$BACKEND_DIR/src/knowledge" "$DESKTOP_DIR/dist-backend/"

# 4. 安装后端生产依赖并针对 Electron 重建
echo "📦 安装后端依赖并针对 Electron 重建..."
cd "$DESKTOP_DIR/dist-backend"
# 恢复安装：显式安装 better-sqlite3 和 bindings
# 这是为了确保 backend 进程有自己独立的依赖环境，避免路径解析问题
npm install better-sqlite3@^12.6.2 bindings --no-package-lock

# 获取 Electron 版本 (从 desktop/package.json 中提取)
# 注意：这里假设 electron 是 devDependency
ELECTRON_VERSION=$(node -p "require('$DESKTOP_DIR/package.json').devDependencies.electron" | tr -d '^~')

echo "Electron 版本: $ELECTRON_VERSION"
echo "正在为 Electron $ELECTRON_VERSION 重建原生模块 (如 better-sqlite3)..."

# 使用 npm rebuild 针对 Electron 头文件重建
# 关键步骤：在 dist-backend 目录下执行 rebuild
cd "$DESKTOP_DIR/dist-backend"
npm rebuild --runtime=electron --target=$ELECTRON_VERSION --dist-url=https://electronjs.org/headers --build-from-source

# 5. 准备前端资源
echo "🎨 准备前端资源..."
mkdir -p "$DESKTOP_DIR/dist-frontend"
cp -r "$FRONTEND_DIR/dist/"* "$DESKTOP_DIR/dist-frontend/"

# 6. 为 Desktop 重新安装所有依赖（使用 npm 而不是 pnpm，确保所有依赖都在 node_modules）
echo "📦 为 Desktop 重新安装所有依赖..."
cd "$DESKTOP_DIR"
# 删除现有的 node_modules（pnpm 安装的，依赖在根目录）
rm -rf node_modules
# 获取 Electron 版本
ELECTRON_VERSION=$(node -p "require('$DESKTOP_DIR/package.json').devDependencies.electron" | tr -d '^~')
echo "使用 npm 安装依赖并为 Electron $ELECTRON_VERSION 重建原生模块..."
# 使用 npm 安装所有依赖（生产+开发），这样所有依赖都会被完整安装到 desktop/node_modules
npm install --no-package-lock
# 重建原生模块
npm rebuild better-sqlite3 --runtime=electron --target=$ELECTRON_VERSION --dist-url=https://electronjs.org/headers --build-from-source

# 7. 打包 Electron
echo "📦 打包 Electron 应用..."
pnpm run package

echo "✅ 打包完成！检查 desktop/dist-electron 目录。"
