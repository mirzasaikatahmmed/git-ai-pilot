import chalk from 'chalk';
import { getGlobalConfig } from './config';

const W = 52;

export function printHelp(): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../package.json') as { version: string };
    const config  = getGlobalConfig();
    const activeCmd = config.customCommand ?? 'git-auto';

    const div  = chalk.gray('  ' + '─'.repeat(W));

    // ── Header ──────────────────────────────────────────────────────────────
    const title = ` ✈️   Git AI Pilot   v${version} `;
    const padL  = Math.floor((W - title.length) / 2);
    const padR  = W - padL - title.length;
    console.log('\n' + chalk.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.cyan('  ║') + ' '.repeat(padL) + chalk.bold.white(title) + ' '.repeat(padR) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚' + '═'.repeat(W) + '╝'));
    console.log(chalk.gray('\n  Automate Git with AI commit messages and built-in security scanning.\n'));

    // ── Usage ────────────────────────────────────────────────────────────────
    console.log(chalk.bold.white('  USAGE'));
    console.log(div);
    const cmd = (c: string) => chalk.cyan.bold(c);
    const desc = (d: string) => chalk.gray(d);

    console.log(`  ${cmd(activeCmd.padEnd(28))} ${desc('Run the full workflow')}`);
    console.log(`  ${cmd('git-auto --config'.padEnd(28))} ${desc('Set Gemini or OpenAI API keys')}`);
    console.log(`  ${cmd('git-auto --custom-command'.padEnd(28))} ${desc('Set a custom command alias')}`);
    console.log(`  ${cmd('git-auto --reset-command'.padEnd(28))} ${desc('Reset alias back to git-auto')}`);
    console.log(`  ${cmd('git-auto --show-command'.padEnd(28))} ${desc('Show the active command name')}`);
    console.log(`  ${cmd('git-auto --help'.padEnd(28))} ${desc('Show this help screen')}`);
    console.log(`  ${cmd('git-auto --version'.padEnd(28))} ${desc('Show version number')}`);

    // ── Workflow ─────────────────────────────────────────────────────────────
    console.log('\n' + chalk.bold.white('  WORKFLOW'));
    console.log(div);
    const steps: [string, string][] = [
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
        console.log(`  ${icon}  ${chalk.gray(text)}`);
    }

    // ── Security scan ────────────────────────────────────────────────────────
    console.log('\n' + chalk.bold.white('  SECURITY SCAN'));
    console.log(div);
    console.log(chalk.gray('  Secret patterns:'));
    console.log(chalk.gray('    AWS · Google · OpenAI · GitHub · Stripe · Slack'));
    console.log(chalk.gray('    JWT · SSH private keys · .env files · DB credentials'));
    console.log(chalk.gray('    Hardcoded passwords · PEM files · Keystores'));
    console.log(chalk.gray('\n  Dependency audit:'));
    console.log(chalk.gray('    🟢 Node.js   🐍 Python   🐘 PHP    🐹 Go'));
    console.log(chalk.gray('    💎 Ruby      🦀 Rust     💙 Flutter ☕ Java'));
    console.log(chalk.gray('    💜 .NET      🍎 Swift'));
    console.log(chalk.gray('\n  Reports saved to: .security-reports/'));

    // ── API keys status ──────────────────────────────────────────────────────
    console.log('\n' + chalk.bold.white('  API KEYS'));
    console.log(div);
    const geminiStatus = config.GEMINI_API_KEY
        ? chalk.green('✔  configured')
        : chalk.red('✖  not set');
    const openaiStatus = config.OPENAI_API_KEY
        ? chalk.green('✔  configured')
        : chalk.gray('–  not set');
    console.log(`  Gemini  ${chalk.gray('(primary) ')}  ${geminiStatus}`);
    console.log(`  OpenAI  ${chalk.gray('(fallback)')}  ${openaiStatus}`);
    console.log(chalk.gray('\n  Get a free Gemini key:'));
    console.log(chalk.gray('  https://aistudio.google.com/app/apikey'));

    // ── Active command ───────────────────────────────────────────────────────
    if (config.customCommand) {
        console.log('\n' + chalk.bold.white('  CUSTOM COMMAND'));
        console.log(div);
        console.log(`  ${chalk.cyan.bold(config.customCommand)} ${chalk.gray('→')} ${chalk.white('git-auto')}`);
        console.log(chalk.gray('  Reset: git-auto --reset-command'));
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    console.log('\n' + div);
    console.log(chalk.gray('  Docs  → ') + chalk.white('https://github.com/mirzasaikatahmmed/git-ai-pilot'));
    console.log(chalk.gray('  Made with ❤️  by Mirza Saikat Ahmmed') + '\n');
}
