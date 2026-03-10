# Contributing to OneClaw

首先，感谢你考虑为 OneClaw 做出贡献！正是像你这样的人才让开源社区如此精彩。

First off, thank you for considering contributing to OneClaw! It's people like you that make the open-source community such a wonderful place.

---

## 📋 Table of Contents / 目录

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

---

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to see if the problem has already been reported.

When creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include screenshots or GIFs** if applicable
- **Specify your environment:**
  - OS and version
  - Node.js version
  - OneClaw version
  - Browser (if applicable)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Explain why this enhancement would be useful**

### 🔄 Pull Requests

1. Fork the repository
2. Create a new branch from `main`: `git checkout -b my-feature-branch`
3. Make your changes
4. Run the tests and ensure they pass
5. Update documentation if needed
6. Commit your changes with a clear commit message
7. Push to your fork
8. Open a Pull Request

#### Pull Request Guidelines

- Fill in the required template
- Do not include issue numbers in the PR title
- Include screenshots or GIFs for UI changes
- Ensure all CI checks pass
- Link to any related issues

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Git**

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/oneClaw.git
cd oneClaw

# 2. Install dependencies
pnpm install

# 3. Start development mode
pnpm dev
```

This will start:
- Frontend dev server: http://localhost:5173
- Backend API server: http://localhost:3000

### Project Structure

```
oneClaw/
├── backend/          # Backend server (Node.js + Express)
├── frontend/         # Frontend app (React + Vite)
├── desktop/          # Electron desktop app
├── shared/           # Shared types and utilities
├── scripts/          # Build and utility scripts
└── docs/             # Documentation
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run backend tests
pnpm --filter backend test

# Run frontend tests
pnpm --filter frontend test
```

### Building

```bash
# Build all packages
pnpm build

# Build desktop app
pnpm build:binary
```

---

## 🎨 Style Guidelines

### Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows these standards:

```bash
# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

Example:
```
feat: add dark mode toggle

- Add theme store with Zustand
- Implement system theme detection
- Add toggle button to header
```

---

## 🙏 Recognition

Contributors will be recognized in our README.md file and release notes.

---

## ❓ Questions?

If you have any questions, feel free to:
- Open an issue with the `question` label

---

**Thank you for contributing to OneClaw! 🚀**

感谢您为 OneClaw 做出贡献！🚀
