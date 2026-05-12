import { simpleGit } from 'simple-git';
import { generateCommitMessage } from './ai-service';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as readline from 'readline';
import { runSecurityChecks, printSecurityReport, saveSecurityReport } from './security';
import { getApiKey, getOpenAiApiKey, getGlobalConfig, saveGlobalConfig } from './config';

dotenv.config({ quiet: true } as any);

const git = simpleGit();

const W = 50;
const div = chalk.gray('  ' + '─'.repeat(W));

function printHeader() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../package.json') as { version: string };
    const title = ` ✈️   Git AI Pilot   v${version} `;
    const padL  = Math.floor((W - title.length) / 2);
    const padR  = W - padL - title.length;
    console.log('\n' + chalk.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.cyan('  ║') + ' '.repeat(padL) + chalk.bold.white(title) + ' '.repeat(padR) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚' + '═'.repeat(W) + '╝'));
}

function printSuccess() {
    const msg = ' ✅  Workflow completed successfully! ';
    const padL = Math.floor((W - msg.length) / 2);
    const padR = W - padL - msg.length;
    console.log('\n' + div);
    console.log('\n' + chalk.green('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.green('  ║') + ' '.repeat(padL) + chalk.bold.greenBright(msg) + ' '.repeat(padR) + chalk.green('║'));
    console.log(chalk.green('  ╚' + '═'.repeat(W) + '╝') + '\n');
}

function stepTag(n: number, total: number): string {
    return chalk.cyan.bold(`[${n}/${total}]`);
}

async function ensureApiKeys(): Promise<void> {
    if (getApiKey() || getOpenAiApiKey()) return;

    console.log(chalk.yellow('\n  ⚠  No API key configured yet.'));
    console.log(chalk.gray('  ↳  Get a free Gemini key: https://aistudio.google.com/app/apikey'));
    console.log(chalk.gray('  ↳  Press Enter to skip any key.\n'));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise(resolve => {
        process.stdout.write(chalk.cyan('  ›') + '  ' + chalk.white(q) + chalk.cyan(': '));
        rl.once('line', ans => resolve(ans.trim()));
    });

    const geminiKey = await ask('Gemini API Key  (primary, free) ');
    const openaiKey = await ask('OpenAI API Key  (fallback, optional)');
    rl.close();

    if (!geminiKey && !openaiKey) {
        console.log(chalk.red('\n  ✖  At least one API key is required to continue.\n'));
        process.exit(1);
    }

    const config = getGlobalConfig();
    if (geminiKey) config.GEMINI_API_KEY = geminiKey;
    if (openaiKey) config.OPENAI_API_KEY = openaiKey;
    saveGlobalConfig(config);

    console.log(chalk.green('\n  ✔  API key saved. Continuing...\n'));
}

function askYesNo(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(
            '\n' + chalk.cyan('  ?') + '  ' + chalk.white(question) + ' ' +
            chalk.gray('(y/n)') + chalk.cyan(' › ')
        );
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key: Buffer) => {
            const char = key.toString().toLowerCase();
            process.stdin.setRawMode(false);
            rl.close();
            const isYes = char === 'y' || char === '\r' || char === '\n';
            if (isYes) {
                process.stdout.write(chalk.greenBright('yes\n'));
                resolve(true);
            } else {
                process.stdout.write(chalk.red('no\n'));
                resolve(false);
            }
        });
    });
}

export async function runGitWorkflow() {
    printHeader();
    await ensureApiKeys();

    try {
        const TOTAL = 5;

        // Step 1 — Pull (user decides)
        const shouldPull = await askYesNo('Pull latest changes from remote?');
        console.log('');

        const spinner = ora({ spinner: 'dots2', color: 'cyan' });

        if (shouldPull) {
            spinner.prefixText = '  ' + stepTag(1, TOTAL);
            spinner.start(chalk.white(' Pulling latest changes...'));
            try {
                await git.pull();
                spinner.succeed(chalk.white(' Pulled latest changes'));
            } catch {
                spinner.warn(chalk.yellow(' Pull failed, continuing...'));
            }
        } else {
            console.log(chalk.gray(`  ${stepTag(1, TOTAL)}  Skipped pull`));
        }

        // Step 2 — Security scan
        console.log('');
        spinner.prefixText = '  ' + stepTag(2, TOTAL);
        spinner.start(chalk.white(' Running security scan...'));
        const projectPath = process.cwd();
        const report = await runSecurityChecks(git, projectPath);
        spinner.stop();
        spinner.prefixText = '';

        printSecurityReport(report);

        if (!report.passed) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = saveSecurityReport(report, reportsDir);
            console.log(chalk.red('  ✖  Aborted: secrets detected in working directory.'));
            console.log(chalk.gray(`  ↳  Report saved → ${reportFile}`));
            console.log(chalk.yellow('  ↳  Remove the secrets and try again.\n'));
            process.exit(1);
        }

        if (report.vulnerabilities.total > 0) {
            const reportFile = saveSecurityReport(report, path.join(projectPath, '.security-reports'));
            console.log(chalk.gray(`  ↳  Vulnerability report saved → ${reportFile}`));
        }

        // Step 3 — Stage files
        console.log('');
        spinner.prefixText = '  ' + stepTag(3, TOTAL);
        spinner.start(chalk.white(' Staging all files...'));
        await git.add('.');
        spinner.succeed(chalk.white(' All files staged'));

        // Step 4 — AI commit message
        console.log('');
        spinner.prefixText = '  ' + stepTag(4, TOTAL);
        spinner.start(chalk.white(' Generating AI commit message...'));
        const status = await git.status();

        if (status.files.length === 0) {
            spinner.info(chalk.white(' No changes to commit.'));
            return;
        }

        const diff    = await git.diff(['--cached']);
        const context = diff.length > 0 ? diff : JSON.stringify(status.files);
        const commitMessage = await generateCommitMessage(context);
        spinner.succeed(chalk.white(' Commit message ready'));
        console.log(chalk.gray(`     ↳  "${commitMessage}"`));

        // Step 5 — Commit & Push
        console.log('');
        spinner.prefixText = '  ' + stepTag(5, TOTAL);
        spinner.start(chalk.white(' Committing & pushing to remote...'));
        await git.commit(commitMessage);
        await git.push();
        spinner.succeed(chalk.white(' Committed and pushed to remote'));

        printSuccess();

    } catch (error: any) {
        console.log('\n' + div);
        console.log(chalk.red(`\n  ✖  Error: ${error.message}\n`));
        process.exit(1);
    }
}
