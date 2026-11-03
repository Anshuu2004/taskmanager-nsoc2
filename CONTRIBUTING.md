# 🤝 Contributing to Task Manager

Thank you for your interest in contributing to **Task Manager**! Open-source contributions make this project better for everyone.

This document outlines the guidelines and workflow for contributing to this project.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [How Can I Contribute?](#-how-can-i-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Submitting Pull Requests](#submitting-pull-requests)
3. [Development Workflow](#-development-workflow)
4. [Coding Style & Best Practices](#-coding-style--best-practices)
5. [Commit Message Guidelines](#-commit-message-guidelines)
6. [Questions & Support](#-questions--support)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all maintainers and fellow contributors with respect.

---

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to see if the bug has already been reported.

When creating a bug report using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md), please include:
- **Title**: Clear and concise summary of the issue.
- **Steps to Reproduce**: Detailed list of steps to reproduce the bug.
- **Expected Behavior**: What you expected to happen.
- **Actual Behavior**: What actually happened.
- **Screenshots / Error Logs**: If applicable.
- **Environment**: OS, Browser name and version.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When requesting a new feature:
- Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
- Explain **why** this feature would be useful to users.
- Provide examples or mockups if relevant.

### Submitting Pull Requests

1. Search open issues to find an existing issue to work on, or open a new issue first to discuss your idea.
2. Fork the repository and create your branch from `main`.
3. Keep your PR focused on a single change/feature.
4. Ensure your code follows the project's styling and structural standards.
5. Provide a descriptive title and detailed summary in your Pull Request description.

---

## 🛠️ Development Workflow

1. **Fork the Repository**:
   Click the "Fork" button on the top right of the GitHub repository.

2. **Clone your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/taskmanager-nsoc2.git
   cd taskmanager-nsoc2
   ```

3. **Set Up Remote**:
   Add the main repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/qwerty274/taskmanager-nsoc2.git
   ```

4. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

5. **Make & Test Your Changes**:
   - Run `npm ci`, then `npm run dev` and open Vite's printed URL (normally `http://localhost:8080`). Do not open `index.html` directly.
   - Run `npm test` and `npm run build`; use `npm run preview` to inspect the production build.
   - Test search combined with each filter and sort mode, JSON/CSV merge/replace, and streak/points behavior described in [README.md](README.md).
   - Tab to Edit, completion, Delete, Undo and backup controls; verify Enter/Escape while editing.
   - Test task addition, priority filtering, inline editing, task deletion, overdue badges, and chart rendering.
   - Verify mobile responsiveness.

6. **Commit Your Changes**:
   ```bash
   git add .
   git commit -m "feat: add drag-and-drop task ordering"
   ```

7. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Submit a Pull Request**:
   Go to your fork on GitHub and click "Compare & pull request". Use the provided [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## 🎨 Coding Style & Best Practices

### JSX (`src/components/`, `src/App.jsx`)
- Use semantic HTML5 tags (`<form>`, `<section>`, `<header>`, `<main>`, `<button>`).
- Maintain WCAG accessibility standards (`aria-label`, `aria-pressed`, proper label associations).
- Use double quotes `""` for HTML attributes.

### CSS (`src/index.css`)
- Use CSS Variables defined in `:root` for colors, spacing, and shadows.
- Write modular, readable CSS grouped with explanatory comments.
- Avoid hardcoded pixel values where flexible units (`rem`, `%`, `vh`, `clamp`) work better.
- Maintain dark-mode design harmony and responsive breakpoints (`@media (max-width: 680px)`).

### JavaScript (`src/hooks/`, `src/utils/`)
- Write clean ES6+ JavaScript (arrow functions, `let`/`const`, template literals, destructuring).
- Document functions using JSDoc-style comments.
- Update React state immutably; `useLocalStorage` handles persistence. Keep pure task logic in `src/utils/`.
- Ensure event handlers do not pollute the global namespace.

---

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature for the user
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Formatting, missing semi colons, CSS tweaks (no code logic changes)
- `refactor:` Code refactoring (no functional changes)
- `perf:` Performance improvements
- `test:` Adding missing tests
- `chore:` Maintenance tasks, gitignore, meta files

**Example**:
```text
feat(chart): add weekly completion chart month navigation
fix(filters): fix active state toggle on filter buttons
docs(readme): add project structure section
```

---

## ❓ Questions & Support

If you have questions, feel free to open a discussion or ask in your issue or pull request. Thank you for contributing! 🎉
