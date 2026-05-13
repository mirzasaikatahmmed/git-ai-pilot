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
*   **Commit URL**: Prints the direct GitHub/GitLab commit link after every successful push.
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

`git-auto` automatically checks npm on every run and shows a banner when a newer version is available:

```
  ╔══════════════════════════════════════════════════╗
  ║     🚀  Update available  v1.2.2 → v1.2.3       ║
  ║        Run: npm install -g git-ai-pilot          ║
  ╚══════════════════════════════════════════════════╝
```

Update to the latest release:

```bash
npm update -g git-ai-pilot
```

To install a specific version:

```bash
npm install -g git-ai-pilot@1.2.3
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

## 🔑 API Key Setup

After installation the tool will prompt for your API keys on first run. You can also set or update them any time with:

```bash
git-auto --config
```

```
  ╔══════════════════════════════════════════════════════╗
  ║         ✈️   Git AI Pilot — Configuration            ║
  ╚══════════════════════════════════════════════════════╝

  Select an option:

  [1]  Gemini API Key  (primary, free)    ✔  configured
  [2]  OpenAI API Key  (fallback)         –  not set

  Press 1 or 2 to select, or Ctrl+C to exit.

  ›  Option:
```

Press `1` or `2` to choose which key to set. Press `Enter` on an existing key to keep it unchanged.

### Get your keys
| Provider | Link | Role |
|----------|------|------|
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Primary (free) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Fallback (optional) |

Keys are stored in `~/.git-ai-pilot/config.json` — never inside your project.

---

## 🎮 How to Use

1.  Open your terminal in any project folder where you have made changes.
2.  Run:

```bash
git-auto
```

3.  **All available commands:**

| Command | Description |
|---------|-------------|
| `git-auto` | Run the full workflow |
| `git-auto --config` | Set Gemini or OpenAI API keys |
| `git-auto --custom-command` | Set a custom command alias |
| `git-auto --reset-command` | Reset alias back to `git-auto` |
| `git-auto --show-command` | Show the active command name |
| `git-auto --help` | Show the help screen |
| `git-auto --version` | Show version number |

4.  **The workflow:**

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
*   🔗 Prints the **direct commit URL** so you can open it instantly.

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

### v1.2.5 — Current
- **Commit URL on push** — after every successful push the CLI prints the direct commit link (e.g. `https://github.com/user/repo/commit/abc123`); works with both HTTPS and SSH remotes

### v1.2.3
- **Auto update notifications** — on every run, the CLI silently checks npm for a newer version; if one exists a styled yellow banner is shown with the exact `npm install -g git-ai-pilot` command to upgrade (times out in 3 s, never blocks the workflow)

### v1.2.0
- **Windows fix** — `git-auto --custom-command` no longer fails with `Command failed: npm bin -g`; switched to `npm prefix -g` (the supported replacement) with correct path resolution on Windows and Unix
- **Suppressed dotenv noise** — no more `[dotenv] injecting env (N)` lines on startup across all commands

### v1.1.9
- **`git-auto --config`** — interactive menu to set Gemini or OpenAI API keys at any time; shows live configured/not-set status for each key

### v1.1.8
- **Custom command alias** — `git-auto --custom-command` sets any alias (e.g. `gitsync`); alias triggers full workflow
- **Reset alias** — `git-auto --reset-command` removes alias and restores `git-auto`
- **Show active command** — `git-auto --show-command`
- **Beautiful `--help` screen** — styled with workflow steps, security details, and live API key status
- **First-run setup prompt** — if postinstall was skipped, `git-auto` asks for API keys on first run
- **Fixed postinstall hang** — `npm install -g` no longer hangs in non-interactive environments
- **Emoji commit messages** — improved AI prompt with full emoji guide (`✨ feat`, `🐛 fix`, `🔒 security` …)

### v1.1.7
- **Multi-language dependency audit** — auto-detects and audits:
  - 🟢 Node.js · 🐍 Python · 🐘 PHP · 🐹 Go · 💎 Ruby · 🦀 Rust · 💙 Flutter · ☕ Java · 💜 .NET · 🍎 Swift
- Shows install hint when audit tool is missing

### v1.1.6
- Full **terminal UI redesign** — header banner, `[1/5]` step counters, bordered security report, success banner
- Fixed false positives — `.md`, `.txt`, `.rst` files excluded from secret scanning

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
