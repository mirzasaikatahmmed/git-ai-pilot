"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGitWorkflow = runGitWorkflow;
const simple_git_1 = require("simple-git");
const ai_service_1 = require("./ai-service");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const security_1 = require("./security");
const config_1 = require("./config");
const update_check_1 = require("./update-check");
dotenv.config({ quiet: true });
const git = (0, simple_git_1.simpleGit)();
const W = 50;
const div = chalk_1.default.gray('  ' + '─'.repeat(W));
async function printHeader() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../package.json');
    const title = ` ✈️   Git AI Pilot   v${version} `;
    const padL = Math.floor((W - title.length) / 2);
    const padR = W - padL - title.length;
    console.log('\n' + chalk_1.default.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.cyan('  ║') + ' '.repeat(padL) + chalk_1.default.bold.white(title) + ' '.repeat(padR) + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('  ╚' + '═'.repeat(W) + '╝'));
    await (0, update_check_1.checkForUpdate)(version);
}
function printSuccess() {
    const msg = ' ✅  Workflow completed successfully! ';
    const padL = Math.floor((W - msg.length) / 2);
    const padR = W - padL - msg.length;
    console.log('\n' + div);
    console.log('\n' + chalk_1.default.green('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.green('  ║') + ' '.repeat(padL) + chalk_1.default.bold.greenBright(msg) + ' '.repeat(padR) + chalk_1.default.green('║'));
    console.log(chalk_1.default.green('  ╚' + '═'.repeat(W) + '╝') + '\n');
}
function stepTag(n, total) {
    return chalk_1.default.cyan.bold(`[${n}/${total}]`);
}
async function ensureApiKeys() {
    if ((0, config_1.getApiKey)() || (0, config_1.getOpenAiApiKey)())
        return;
    console.log(chalk_1.default.yellow('\n  ⚠  No API key configured yet.'));
    console.log(chalk_1.default.gray('  ↳  Get a free Gemini key: https://aistudio.google.com/app/apikey'));
    console.log(chalk_1.default.gray('  ↳  Press Enter to skip any key.\n'));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(resolve => {
        process.stdout.write(chalk_1.default.cyan('  ›') + '  ' + chalk_1.default.white(q) + chalk_1.default.cyan(': '));
        rl.once('line', ans => resolve(ans.trim()));
    });
    const geminiKey = await ask('Gemini API Key  (primary, free) ');
    const openaiKey = await ask('OpenAI API Key  (fallback, optional)');
    rl.close();
    if (!geminiKey && !openaiKey) {
        console.log(chalk_1.default.red('\n  ✖  At least one API key is required to continue.\n'));
        process.exit(1);
    }
    const config = (0, config_1.getGlobalConfig)();
    if (geminiKey)
        config.GEMINI_API_KEY = geminiKey;
    if (openaiKey)
        config.OPENAI_API_KEY = openaiKey;
    (0, config_1.saveGlobalConfig)(config);
    console.log(chalk_1.default.green('\n  ✔  API key saved. Continuing...\n'));
}
function askYesNo(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write('\n' + chalk_1.default.cyan('  ?') + '  ' + chalk_1.default.white(question) + ' ' +
            chalk_1.default.gray('(y/n)') + chalk_1.default.cyan(' › '));
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key) => {
            const char = key.toString().toLowerCase();
            process.stdin.setRawMode(false);
            rl.close();
            const isYes = char === 'y' || char === '\r' || char === '\n';
            if (isYes) {
                process.stdout.write(chalk_1.default.greenBright('yes\n'));
                resolve(true);
            }
            else {
                process.stdout.write(chalk_1.default.red('no\n'));
                resolve(false);
            }
        });
    });
}
async function runGitWorkflow() {
    await printHeader();
    await ensureApiKeys();
    try {
        const TOTAL = 5;
        // Step 1 — Pull (user decides)
        const shouldPull = await askYesNo('Pull latest changes from remote?');
        console.log('');
        const spinner = (0, ora_1.default)({ spinner: 'dots2', color: 'cyan' });
        if (shouldPull) {
            spinner.prefixText = '  ' + stepTag(1, TOTAL);
            spinner.start(chalk_1.default.white(' Pulling latest changes...'));
            try {
                await git.pull();
                spinner.succeed(chalk_1.default.white(' Pulled latest changes'));
            }
            catch {
                spinner.warn(chalk_1.default.yellow(' Pull failed, continuing...'));
            }
        }
        else {
            console.log(chalk_1.default.gray(`  ${stepTag(1, TOTAL)}  Skipped pull`));
        }
        // Step 2 — Security scan
        console.log('');
        spinner.prefixText = '  ' + stepTag(2, TOTAL);
        spinner.start(chalk_1.default.white(' Running security scan...'));
        const projectPath = process.cwd();
        const report = await (0, security_1.runSecurityChecks)(git, projectPath);
        spinner.stop();
        spinner.prefixText = '';
        (0, security_1.printSecurityReport)(report);
        if (!report.passed) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = (0, security_1.saveSecurityReport)(report, reportsDir);
            console.log(chalk_1.default.red('  ✖  Aborted: secrets detected in working directory.'));
            console.log(chalk_1.default.gray(`  ↳  Report saved → ${reportFile}`));
            console.log(chalk_1.default.yellow('  ↳  Remove the secrets and try again.\n'));
            process.exit(1);
        }
        if (report.vulnerabilities.total > 0) {
            const reportFile = (0, security_1.saveSecurityReport)(report, path.join(projectPath, '.security-reports'));
            console.log(chalk_1.default.gray(`  ↳  Vulnerability report saved → ${reportFile}`));
        }
        // Step 3 — Stage files
        console.log('');
        spinner.prefixText = '  ' + stepTag(3, TOTAL);
        spinner.start(chalk_1.default.white(' Staging all files...'));
        await git.add('.');
        spinner.succeed(chalk_1.default.white(' All files staged'));
        // Step 4 — AI commit message
        console.log('');
        spinner.prefixText = '  ' + stepTag(4, TOTAL);
        spinner.start(chalk_1.default.white(' Generating AI commit message...'));
        const status = await git.status();
        if (status.files.length === 0) {
            spinner.info(chalk_1.default.white(' No changes to commit.'));
            return;
        }
        const diff = await git.diff(['--cached']);
        const context = diff.length > 0 ? diff : JSON.stringify(status.files);
        const commitMessage = await (0, ai_service_1.generateCommitMessage)(context);
        spinner.succeed(chalk_1.default.white(' Commit message ready'));
        console.log(chalk_1.default.gray(`     ↳  "${commitMessage}"`));
        // Step 5 — Commit & Push
        console.log('');
        spinner.prefixText = '  ' + stepTag(5, TOTAL);
        spinner.start(chalk_1.default.white(' Committing & pushing to remote...'));
        await git.commit(commitMessage);
        await git.push();
        spinner.succeed(chalk_1.default.white(' Committed and pushed to remote'));
        printSuccess();
    }
    catch (error) {
        console.log('\n' + div);
        console.log(chalk_1.default.red(`\n  ✖  Error: ${error.message}\n`));
        process.exit(1);
    }
}
