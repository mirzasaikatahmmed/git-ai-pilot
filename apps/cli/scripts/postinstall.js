#!/usr/bin/env node

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const readline = require('readline');

const CONFIG_DIR  = path.join(os.homedir(), '.git-ai-pilot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const W = 52;
const bar = '═'.repeat(W);

function line(text) {
    const pad = W - text.length;
    return '║  ' + text + ' '.repeat(Math.max(0, pad - 2)) + '║';
}

const banner = [
    '\n╔' + bar + '╗',
    line('  ✈️   Git AI Pilot — First-Time Setup'),
    '╚' + bar + '╝\n',
].join('\n');

// ── Already configured? ────────────────────────────────────────────────────
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (cfg.GEMINI_API_KEY || cfg.OPENAI_API_KEY) {
            console.log('\n  ✔  Git AI Pilot is already configured.');
            console.log('  ↳  Run git-auto in any repository to start.\n');
            process.exit(0);
        }
    } catch (_) { /* corrupt config — re-run setup */ }
}

console.log(banner);

// ── Non-interactive install (stdin is not a TTY) ───────────────────────────
// npm install -g pipes stdin, so readline can't get input.
// Show instructions and exit cleanly — never block or fail the install.
if (!process.stdin.isTTY) {
    console.log('  ⚠  Interactive prompt not available in this environment.');
    console.log('  ↳  Installation succeeded — finish setup by running:\n');
    console.log('       git-auto\n');
    console.log('  It will ask for your API key on first use.\n');
    console.log('  Get a free Gemini key: https://aistudio.google.com/app/apikey');
    console.log('  Get an OpenAI key:     https://platform.openai.com/api-keys\n');
    process.exit(0);
}

// ── Interactive setup ──────────────────────────────────────────────────────
console.log('  You need at least one API key to use Git AI Pilot.');
console.log('  Gemini is free → https://aistudio.google.com/app/apikey');
console.log('  Press Enter to skip any key.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
    return new Promise(resolve => {
        process.stdout.write('  › ' + question + ': ');
        rl.once('line', answer => resolve(answer.trim()));
    });
}

async function setup() {
    const geminiKey = await ask('Gemini API Key  (primary, free) ');
    const openaiKey = await ask('OpenAI API Key  (fallback, optional)');
    rl.close();

    if (!geminiKey && !openaiKey) {
        console.log('\n  ⚠  No keys entered.');
        console.log('  ↳  Run git-auto anytime — it will prompt you on first use.\n');
        process.exit(0);
    }

    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

    const config = {};
    if (geminiKey) config.GEMINI_API_KEY = geminiKey;
    if (openaiKey) config.OPENAI_API_KEY = openaiKey;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    const saved = [
        geminiKey && 'Gemini',
        openaiKey && 'OpenAI',
    ].filter(Boolean).join(' + ');

    console.log('\n╔' + bar + '╗');
    console.log(line('  ✔  Setup complete! (' + saved + ')'));
    console.log(line('  ↳  Run git-auto in any repository to start.'));
    console.log('╚' + bar + '╝\n');
    process.exit(0);
}

setup().catch(() => {
    // Never fail the install — just skip setup
    console.log('\n  ⚠  Setup skipped. Run git-auto to configure later.\n');
    process.exit(0);
});
