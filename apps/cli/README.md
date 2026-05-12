# Git AI Pilot 🤖✈️

**Your Personal AI Assistant for Git!**

Tired of writing commit messages? Let AI do it for you! `git-ai-pilot` automatically looks at your code changes and writes a professional, descriptive commit message using Google Gemini AI — and guards every commit with a built-in security scan before anything is staged.

## ✨ Features

*   **Interactive Pull**: Asks whether to pull before starting — press `y` / `Enter` for yes, `n` to skip.
*   **Early Secret Scan**: Scans your working directory **before `git add`** so secrets never enter git history.
*   **Sensitive File Detection**: Blocks `.env`, SSH keys, PEM files, credential files, and more by filename.
*   **Inline Secret Patterns**: Detects AWS keys, Google/OpenAI/Stripe/GitHub/Slack tokens, JWTs, database URLs, and hardcoded passwords with severity levels.
*   **Vulnerability Audit**: Runs `npm audit` and reports dependency vulnerabilities (critical / high / moderate / low).
*   **Security Reports**: Saves a timestamped JSON report to `.security-reports/` when issues are found.
*   **Smart Commit Messages**: Uses Gemini AI to understand *what* you changed and *why*.
*   **AI Fallback**: Automatically switches to OpenAI if Gemini is unavailable.
*   **Global Access**: Works in ANY project folder on your computer.

---

## 🚀 How to Install

You only need to do this once!

### Prerequisites
*   **Node.js** v18 or higher. [Download it here](https://nodejs.org/).

### Installation Command
Open your terminal and run:

```bash
npm install -g git-ai-pilot
```

Verify:

```bash
git-auto --version
```

*Note: The `-g` flag installs the tool globally so you can use it everywhere.*

---

## 🔄 Update

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

To also remove stored API keys:

```bash
# macOS / Linux
rm -rf ~/.git-ai-pilot

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.git-ai-pilot"
```

---

## 🔑 One-Time Setup

After installation, the tool will ask for your API keys.

### Gemini API Key (primary, free)
1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click **Create API Key**.
2.  Paste it into the terminal when prompted.

### OpenAI API Key (fallback, optional)
1.  Go to [OpenAI Platform](https://platform.openai.com/api-keys) and create a key.
2.  Paste it when prompted (or skip if you only want Gemini).

*If you missed setup during install, just run `git-auto` — it will guide you again.*

---

## 🎮 How to Use

1.  Open your terminal in any project folder where you have made changes.
2.  Run:

```bash
git-auto
```

3.  **The workflow:**

```
Pull latest changes from remote? (y/n):
```

Press `y` or `Enter` to pull, `n` to skip. Then:

*   🔒 **Security scan** runs on your working directory — before anything is staged.
*   🚫 **Aborts** if secrets or sensitive files are detected, saves a report.
*   📂 Stages all your changes (only if scan passes).
*   🧠 Generates an AI commit message.
*   💾 Commits the changes.
*   ☁️ Pushes to GitHub/GitLab.

---

## 🔒 Security Scan

The scan runs **before `git add`** — so if a secret is found, nothing is staged or committed.

### Sensitive files — blocked by filename (`CRITICAL`)

| File | Reason |
|------|--------|
| `.env`, `.env.local`, `.env.production` … | Environment secrets |
| `id_rsa`, `id_ed25519`, `id_ecdsa` | SSH private keys |
| `*.pem` | TLS/SSL certificates |
| `credentials.json/yml`, `secrets.json/yml` | Cloud credentials |
| `serviceAccountKey.json` | GCP service account |
| `*.keystore`, `*.jks`, `*.p12`, `*.pfx` | Java/PKCS keystores |
| `.netrc`, `.pgpass`, `.npmrc` | Auth config files |

### Inline patterns — scanned on every added line

| Pattern | Severity |
|---------|----------|
| AWS Access / Secret Key | CRITICAL |
| Google API Key | CRITICAL |
| OpenAI API Key | CRITICAL |
| GitHub Token | CRITICAL |
| Stripe Secret Key | CRITICAL |
| Private Key header | CRITICAL |
| Database URL with credentials | CRITICAL |
| ENV secret variables (unquoted `KEY=value`) | HIGH |
| Slack Token, JWT Token | HIGH |
| Connection string passwords | HIGH |
| Hardcoded secrets in code | MEDIUM |

### If secrets are found

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

### If vulnerabilities are found

The workflow continues but a report is saved:

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

## ❓ FAQ

**Q: Do I need to install this in every project?**
A: No! Global install (`-g`) means it works everywhere.

**Q: Where are my API keys stored?**
A: Saved locally in `~/.git-ai-pilot/config.json` — never inside your project.

**Q: Can I change my API keys later?**
A: Yes — edit `~/.git-ai-pilot/config.json` directly or reinstall.

**Q: What if both Gemini and OpenAI fail?**
A: You'll see a clear error message with details from both providers.

**Q: What if I accidentally committed a secret before?**
A: Use `git filter-repo` or BFG Repo Cleaner to purge it from history, then rotate the exposed key immediately.

**Q: Can I skip the pull prompt?**
A: Just press `n` when asked. The rest of the workflow continues normally.

---

## 📋 Changelog

### v1.1.2
- Interactive pull prompt — `y` / `Enter` = yes, `n` = skip
- Security scan moved **before `git add`** — secrets never enter git history
- Sensitive file detection by filename (`.env`, SSH keys, PEM, keystores …)
- Unquoted ENV variable patterns (`API_KEY=value`)
- Database URL credential detection
- Severity levels: `CRITICAL` / `HIGH` / `MEDIUM`

### v1.1.1
- Fixed bin script name in package.json
- `--version` reads dynamically from package.json
- Suppressed dotenv verbose output

### v1.1.0
- Added secret scanner and npm vulnerability audit
- Added `.security-reports/` JSON report generation
- AI fallback: Gemini → OpenAI

### v1.0.13
- Initial stable release

---

Made with ❤️ by [Mirza Saikat Ahmmed](https://github.com/mirzasaikatahmmed)
