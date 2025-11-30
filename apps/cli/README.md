# Git AI Pilot 🤖✈️

**Your Personal AI Assistant for Git!**

Tired of writing commit messages? Let AI do it for you! `git-ai-pilot` automatically looks at your code changes and writes a professional, descriptive commit message using Google Gemini AI. It then handles the boring stuff (add, commit, push) for you.

## ✨ Features

*   **One-Click Magic**: Just type `git-auto` and watch it work.
*   **Smart Messages**: Uses advanced AI to understand *what* you changed and *why*.
*   **Time Saver**: No more thinking about "feat: updated button styles".
*   **Global Access**: Works in ANY project folder on your computer.

---

## 🚀 How to Install

You only need to do this once!

### Prerequisites
*   You need **Node.js** installed on your computer. [Download it here](https://nodejs.org/).

### Installation Command
Open your terminal (Command Prompt, PowerShell, or Terminal) and run:

```bash
npm install -g git-ai-pilot
```

*Note: The `-g` flag is important—it installs the tool globally so you can use it everywhere.*

---

## 🔑 One-Time Setup

After installation, the tool will ask for your **Gemini API Key**. This is free and easy to get.

1.  **Get your Key**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click "Create API Key".
2.  **Enter it**: Copy the key (it looks like `AIzaSy...`) and paste it into the terminal when asked.

*If you missed the setup during install, just run `git-auto` and it will ask you again (or tell you how to fix it).*

---

## 🎮 How to Use

1.  Open your terminal in **any** project folder where you have made changes.
2.  Type the magic command:

```bash
git-auto
```

3.  **That's it!** The tool will:
    *   📥 Pull the latest changes from the cloud.
    *   👀 Look at your changes.
    *   🧠 Write a commit message for you.
    *   💾 Save (commit) the changes.
    *   ☁️ Upload (push) them to GitHub/GitLab.

---

## ❓ FAQ

**Q: Do I need to install this in every project?**
A: No! Since you installed it globally (`-g`), it works everywhere.

**Q: Where is my API key stored?**
A: It's saved securely in a hidden file on your computer (`.git-ai-pilot/config.json`).

**Q: Can I change my API key later?**
A: Yes, you can edit the config file manually or just reinstall the tool.

---

Made with ❤️ by [Mirza Saikat Ahmmed](https://github.com/mirzasaikatahmmed)
