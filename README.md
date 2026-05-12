<div align="center">

# ✈️ Git AI Pilot

**Automate your entire Git workflow with AI-generated commit messages and built-in security scanning.**

[![npm version](https://img.shields.io/npm/v/git-ai-pilot?color=blue&label=npm)](https://www.npmjs.com/package/git-ai-pilot)
[![npm downloads](https://img.shields.io/npm/dm/git-ai-pilot?color=green)](https://www.npmjs.com/package/git-ai-pilot)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org)
[![Built with TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178c6)](https://www.typescriptlang.org)

<br/>

> One command to pull, stage, commit, scan, and push — powered by Google Gemini & OpenAI.

</div>

---

## 🧩 What it does

Run `git-auto` in any project folder. The tool will:

| Step | Action |
|------|--------|
| 📥 | Pull latest changes from remote |
| 📂 | Stage all modified files |
| 🧠 | Generate a commit message with **Gemini AI** (falls back to **OpenAI**) |
| 💾 | Commit the changes |
| 🔒 | Scan the diff for **leaked secrets** and **npm vulnerabilities** |
| 🚫 | **Block the push** if secrets are detected — and save a report |
| ☁️ | Push to GitHub / GitLab if everything is clean |

---

## 📦 Installation

### Requirements

- **Node.js** v18 or higher — [Download](https://nodejs.org)
- **npm** v7 or higher (comes with Node.js)
- A Git repository with a configured remote

### Install

```bash
npm install -g git-ai-pilot
```

Verify the install:

```bash
git-auto --version
```

On first run, the setup wizard will prompt for your Gemini and/or OpenAI API key.

---

## 🔄 Update

Check your current version:

```bash
git-auto --version
# or
npm list -g git-ai-pilot
```

Update to the latest release:

```bash
npm update -g git-ai-pilot
```

To install a specific version:

```bash
npm install -g git-ai-pilot@1.1.1
```

> Your API keys in `~/.git-ai-pilot/config.json` are preserved across updates.

---

## 🗑️ Uninstall

```bash
npm uninstall -g git-ai-pilot
```

This removes the `git-auto` command. To also delete your stored API keys:

```bash
# macOS / Linux
rm -rf ~/.git-ai-pilot

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.git-ai-pilot"
```

---

## 🚀 Quick Start

```bash
# 1. Install
npm install -g git-ai-pilot

# 2. Go to any project with uncommitted changes
cd your-project

# 3. Run
git-auto
```

On first run, the setup wizard will ask for your API key(s).

---

## 🔑 API Keys

| Provider | Where to get it | Required |
|----------|----------------|----------|
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Primary |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Fallback |

Keys are stored locally in `~/.git-ai-pilot/config.json` — never in your project.

---

## 🔒 Security Scan

Every push is guarded by an automatic two-layer scan:

### Secret Detection
Scans every added line in the diff against 10 patterns:

- AWS Access Key / Secret Key
- Google API Key
- OpenAI API Key
- GitHub Token
- Stripe Secret Key
- Slack Token
- JWT Token
- RSA / SSH Private Keys
- Hardcoded passwords & API tokens

If a secret is found the **push is blocked** and a JSON report is saved to `.security-reports/`.

```
━━━ Security Scan Report ━━━
  ✖  1 secret(s) found in diff:
     [OpenAI API Key] src/config.ts:12
       → apiKey: "sk-abc123..."

  Result: BLOCKED — secrets detected
```

### Vulnerability Audit
Runs `npm audit` on your project and reports severity counts before every push:

```
━━━ Security Scan Report ━━━
  ✔  No secrets detected
  ⚠  3 npm vulnerabilities:
     High     : 1
     Moderate : 2
     • lodash [high] — fix available
```

> **Tip:** Add `.security-reports/` to your `.gitignore`.

---

## 📁 Project Structure

```
git-ai-pilot/
├── apps/
│   └── cli/               # The npm package (git-ai-pilot)
│       ├── src/
│       │   ├── index.ts   # Git workflow orchestration
│       │   ├── ai-service.ts  # Gemini → OpenAI fallback
│       │   ├── gemini.ts  # Gemini integration
│       │   ├── openai.ts  # OpenAI integration
│       │   ├── security.ts    # Secret scanner & vulnerability audit
│       │   └── config.ts  # Global API key management
│       ├── bin/
│       │   └── cli.js     # CLI entry point
│       └── package.json
├── package.json           # Monorepo root (Turborepo)
└── turbo.json
```

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/mirzasaikatahmmed/git-ai-pilot.git
cd git-ai-pilot

# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode (CLI)
cd apps/cli && npm run dev
```

---

## 📋 Changelog

### v1.1.1
- Fixed bin script name in package.json

### v1.1.0
- Added pre-push **secret scanner** — blocks push on detected secrets
- Added **npm vulnerability audit** with severity breakdown
- Added `.security-reports/` JSON report generation
- AI fallback: Gemini → OpenAI when primary fails

### v1.0.13
- Initial stable release with Gemini-powered commit messages

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repository
2. Create your branch: `git checkout -b feat/your-feature`
3. Make changes and let `git-auto` commit them 😄
4. Push and open a PR

---

<div align="center">

Made with ❤️ by [Mirza Saikat Ahmmed](https://github.com/mirzasaikatahmmed)

</div>
