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
| ❓ | **Ask** whether to pull — press `y` / `Enter` for yes, `n` to skip |
| 📥 | Pull latest changes from remote (if confirmed) |
| 🔒 | **Security scan** — checks working directory for secrets **before staging** |
| 🚫 | **Abort** if secrets or sensitive files are detected — saves a report |
| 📂 | Stage all modified files (only if scan passes) |
| 🧠 | Generate a commit message with **Gemini AI** (falls back to **OpenAI**) |
| 💾 | Commit the changes |
| ☁️ | Push to GitHub / GitLab |

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
npm install -g git-ai-pilot@1.1.2
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

| Provider | Where to get it | Role |
|----------|----------------|------|
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Primary |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Fallback |

Keys are stored locally in `~/.git-ai-pilot/config.json` — never in your project.

---

## 🔒 Security Scan

The scan runs **before `git add`** so secrets are caught before they ever enter git history.

### Interactive pull prompt

```
Pull latest changes from remote? (y/n):
```

Press `y` or `Enter` to pull. Press `n` to skip.

### Secret Detection

Detects secrets in two ways:

**1. Sensitive files by name** — flagged as `CRITICAL` the moment they appear in the diff:

| File | Label |
|------|-------|
| `.env`, `.env.local`, `.env.production`, `.env.staging` … | `.env file / variant` |
| `id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa` | SSH private key |
| `*.pem` | PEM certificate/key |
| `credentials.json/yml`, `secrets.json/yml` | credentials / secrets file |
| `serviceAccountKey.json` | service account key |
| `*.keystore`, `*.jks`, `*.p12`, `*.pfx` | certificate keystore |
| `.netrc`, `.pgpass`, `.npmrc` | auth config file |

**2. Inline patterns** — scanned on every added line:

| Pattern | Severity |
|---------|----------|
| AWS Access / Secret Key | CRITICAL |
| Google API Key | CRITICAL |
| OpenAI API Key | CRITICAL |
| GitHub Token | CRITICAL |
| Stripe Secret Key | CRITICAL |
| Private Key header | CRITICAL |
| Database URL with credentials | CRITICAL |
| ENV secret variables (unquoted) | HIGH |
| Slack Token, JWT Token | HIGH |
| Connection string passwords | HIGH |
| Hardcoded secrets in code | MEDIUM |

### Example output

```
━━━ Security Scan Report ━━━
  ✖  2 secret(s) found:
     Critical : 1
     High     : 1

     [CRITICAL] Sensitive file committed (.env file)
       .env
     [HIGH] ENV Secret Variable
       src/config.ts:8
       → OPENAI_API_KEY=sk-abc123...

  Result: BLOCKED — secrets detected

❌ Aborted: secrets detected in working directory.
   Report saved to: .security-reports/security-report-1234567890.json
   Remove the secrets before running git-auto again.
```

### Vulnerability Audit

Runs `npm audit` and reports severity counts alongside every scan:

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
│       │   ├── index.ts       # Git workflow orchestration
│       │   ├── ai-service.ts  # Gemini → OpenAI fallback
│       │   ├── gemini.ts      # Gemini integration
│       │   ├── openai.ts      # OpenAI integration
│       │   ├── security.ts    # Secret scanner & vulnerability audit
│       │   └── config.ts      # Global API key management
│       ├── bin/
│       │   └── cli.js         # CLI entry point
│       └── package.json
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
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

### v1.1.2
- Interactive pull prompt — press `y` / `Enter` to pull, `n` to skip
- Security scan moved **before `git add`** — secrets never enter git history
- Sensitive file detection by filename (`.env`, SSH keys, PEM, keystores …)
- Unquoted ENV variable patterns (`API_KEY=value` without quotes)
- Database URL credential detection (`postgres://user:pass@host`)
- Severity levels: `CRITICAL` / `HIGH` / `MEDIUM` on every finding

### v1.1.1
- Fixed bin script name in package.json
- `--version` now reads dynamically from package.json
- Suppressed dotenv verbose output

### v1.1.0
- Added pre-push secret scanner — blocks push on detected secrets
- Added npm vulnerability audit with severity breakdown
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
