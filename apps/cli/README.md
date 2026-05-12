# Git AI Pilot 🤖✈️

**Your Personal AI Assistant for Git!**

Tired of writing commit messages? Let AI do it for you! `git-ai-pilot` automatically looks at your code changes and writes a professional, descriptive commit message using Google Gemini AI. It then handles the boring stuff (add, commit, push) — and now guards every push with a built-in security scan.

## ✨ Features

*   **One-Click Magic**: Just type `git-auto` and watch it work.
*   **Smart Messages**: Uses advanced AI to understand *what* you changed and *why*.
*   **AI Fallback**: Automatically falls back to OpenAI if Gemini is unavailable.
*   **Secret Scanner**: Scans every commit diff for leaked API keys, tokens, and passwords before pushing — and **blocks the push** if anything is found.
*   **Vulnerability Audit**: Runs `npm audit` on your project and reports dependency vulnerabilities with severity breakdown.
*   **Security Reports**: Saves a timestamped JSON report to `.security-reports/` whenever issues are detected.
*   **Global Access**: Works in ANY project folder on your computer.

---

## 🚀 How to Install

You only need to do this once!

### Prerequisites
*   **Node.js** installed on your computer. [Download it here](https://nodejs.org/).

### Installation Command
Open your terminal and run:

```bash
npm install -g git-ai-pilot
```

*Note: The `-g` flag installs the tool globally so you can use it everywhere.*

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

3.  **That's it!** The tool will:
    *   📥 Pull the latest changes from the remote.
    *   👀 Stage all your changes.
    *   🧠 Generate an AI commit message.
    *   💾 Commit the changes.
    *   🔒 Run a **security scan** on the diff and your dependencies.
    *   🚫 **Block the push** if secrets are found, and save a report.
    *   ☁️ Push to GitHub/GitLab if everything is clean.

---

## 🔒 Security Scan

Before every push, `git-auto` automatically:

| Check | What it detects |
|-------|----------------|
| **Secret scan** | AWS keys, Google/OpenAI/Stripe/GitHub/Slack tokens, JWTs, private keys, hardcoded passwords |
| **Vulnerability audit** | npm dependency vulnerabilities (critical / high / moderate / low) |

### If secrets are found
The push is **blocked**. You'll see exactly which file and line contains the secret:

```
━━━ Security Scan Report ━━━
  ✖  1 secret(s) found in diff:
     [OpenAI API Key] src/config.ts:12
       → apiKey: "sk-abc123..."

  Result: BLOCKED — secrets detected

❌ Push blocked: secrets detected in diff.
   Report saved to: .security-reports/security-report-1234567890.json
   Remove the secrets and recommit before pushing.
```

### If vulnerabilities are found
The push **proceeds** but a report is saved to `.security-reports/` so you can review and fix them:

```
━━━ Security Scan Report ━━━
  ✔  No secrets detected
  ⚠  3 npm vulnerabilities:
     High     : 1
     Moderate : 2
     • lodash [high] — fix available
```

### Report format
Reports are saved as `.security-reports/security-report-<timestamp>.json` and contain:
- Full list of secret findings (file, line, type, content snippet)
- Full vulnerability list with severity and fix availability

> **Tip:** Add `.security-reports/` to your `.gitignore` so reports aren't committed.

---

## ❓ FAQ

**Q: Do I need to install this in every project?**
A: No! Global install (`-g`) means it works everywhere.

**Q: Where are my API keys stored?**
A: Saved locally in `~/.git-ai-pilot/config.json` on your machine.

**Q: Can I change my API keys later?**
A: Yes — edit `~/.git-ai-pilot/config.json` directly or reinstall.

**Q: What if both Gemini and OpenAI fail?**
A: You'll see a clear error message with details from both providers.

**Q: Can I disable the security scan?**
A: The scan runs automatically for every push. To skip it temporarily, use plain `git push` instead.

---

## 📋 Changelog

### v1.1.0
- Added pre-push secret scanner (blocks push if secrets detected)
- Added npm vulnerability audit with severity report
- Added `.security-reports/` JSON report generation
- AI fallback: Gemini → OpenAI if primary fails

### v1.0.13
- Initial stable release with Gemini-powered commit messages

---

Made with ❤️ by [Mirza Saikat Ahmmed](https://github.com/mirzasaikatahmmed)
