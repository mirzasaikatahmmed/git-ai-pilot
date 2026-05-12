"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHelp = printHelp;
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const W = 52;
function printHelp() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../package.json');
    const config = (0, config_1.getGlobalConfig)();
    const activeCmd = config.customCommand ?? 'git-auto';
    const div = chalk_1.default.gray('  ' + '─'.repeat(W));
    // ── Header ──────────────────────────────────────────────────────────────
    const title = ` ✈️   Git AI Pilot   v${version} `;
    const padL = Math.floor((W - title.length) / 2);
    const padR = W - padL - title.length;
    console.log('\n' + chalk_1.default.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.cyan('  ║') + ' '.repeat(padL) + chalk_1.default.bold.white(title) + ' '.repeat(padR) + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('  ╚' + '═'.repeat(W) + '╝'));
    console.log(chalk_1.default.gray('\n  Automate Git with AI commit messages and built-in security scanning.\n'));
    // ── Usage ────────────────────────────────────────────────────────────────
    console.log(chalk_1.default.bold.white('  USAGE'));
    console.log(div);
    const cmd = (c) => chalk_1.default.cyan.bold(c);
    const desc = (d) => chalk_1.default.gray(d);
    console.log(`  ${cmd(activeCmd.padEnd(28))} ${desc('Run the full workflow')}`);
    console.log(`  ${cmd('git-auto --config'.padEnd(28))} ${desc('Set Gemini or OpenAI API keys')}`);
    console.log(`  ${cmd('git-auto --custom-command'.padEnd(28))} ${desc('Set a custom command alias')}`);
    console.log(`  ${cmd('git-auto --reset-command'.padEnd(28))} ${desc('Reset alias back to git-auto')}`);
    console.log(`  ${cmd('git-auto --show-command'.padEnd(28))} ${desc('Show the active command name')}`);
    console.log(`  ${cmd('git-auto --help'.padEnd(28))} ${desc('Show this help screen')}`);
    console.log(`  ${cmd('git-auto --version'.padEnd(28))} ${desc('Show version number')}`);
    // ── Workflow ─────────────────────────────────────────────────────────────
    console.log('\n' + chalk_1.default.bold.white('  WORKFLOW'));
    console.log(div);
    const steps = [
        ['❓', 'Ask whether to pull  (y / Enter = yes,  n = skip)'],
        ['📥', 'Pull latest changes from remote'],
        ['🔒', 'Security scan — runs BEFORE staging'],
        ['🚫', 'Abort if secrets or sensitive files detected'],
        ['📂', 'Stage all modified files'],
        ['🧠', 'Generate AI commit message  (Gemini → OpenAI fallback)'],
        ['💾', 'Commit with the generated message'],
        ['☁️ ', 'Push to remote'],
    ];
    for (const [icon, text] of steps) {
        console.log(`  ${icon}  ${chalk_1.default.gray(text)}`);
    }
    // ── Security scan ────────────────────────────────────────────────────────
    console.log('\n' + chalk_1.default.bold.white('  SECURITY SCAN'));
    console.log(div);
    console.log(chalk_1.default.gray('  Secret patterns:'));
    console.log(chalk_1.default.gray('    AWS · Google · OpenAI · GitHub · Stripe · Slack'));
    console.log(chalk_1.default.gray('    JWT · SSH private keys · .env files · DB credentials'));
    console.log(chalk_1.default.gray('    Hardcoded passwords · PEM files · Keystores'));
    console.log(chalk_1.default.gray('\n  Dependency audit:'));
    console.log(chalk_1.default.gray('    🟢 Node.js   🐍 Python   🐘 PHP    🐹 Go'));
    console.log(chalk_1.default.gray('    💎 Ruby      🦀 Rust     💙 Flutter ☕ Java'));
    console.log(chalk_1.default.gray('    💜 .NET      🍎 Swift'));
    console.log(chalk_1.default.gray('\n  Reports saved to: .security-reports/'));
    // ── API keys status ──────────────────────────────────────────────────────
    console.log('\n' + chalk_1.default.bold.white('  API KEYS'));
    console.log(div);
    const geminiStatus = config.GEMINI_API_KEY
        ? chalk_1.default.green('✔  configured')
        : chalk_1.default.red('✖  not set');
    const openaiStatus = config.OPENAI_API_KEY
        ? chalk_1.default.green('✔  configured')
        : chalk_1.default.gray('–  not set');
    console.log(`  Gemini  ${chalk_1.default.gray('(primary) ')}  ${geminiStatus}`);
    console.log(`  OpenAI  ${chalk_1.default.gray('(fallback)')}  ${openaiStatus}`);
    console.log(chalk_1.default.gray('\n  Get a free Gemini key:'));
    console.log(chalk_1.default.gray('  https://aistudio.google.com/app/apikey'));
    // ── Active command ───────────────────────────────────────────────────────
    if (config.customCommand) {
        console.log('\n' + chalk_1.default.bold.white('  CUSTOM COMMAND'));
        console.log(div);
        console.log(`  ${chalk_1.default.cyan.bold(config.customCommand)} ${chalk_1.default.gray('→')} ${chalk_1.default.white('git-auto')}`);
        console.log(chalk_1.default.gray('  Reset: git-auto --reset-command'));
    }
    // ── Footer ───────────────────────────────────────────────────────────────
    console.log('\n' + div);
    console.log(chalk_1.default.gray('  Docs  → ') + chalk_1.default.white('https://github.com/mirzasaikatahmmed/git-ai-pilot'));
    console.log(chalk_1.default.gray('  Made with ❤️  by Mirza Saikat Ahmmed') + '\n');
}
