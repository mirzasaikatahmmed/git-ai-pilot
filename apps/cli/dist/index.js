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
dotenv.config({ quiet: true });
const git = (0, simple_git_1.simpleGit)();
function askYesNo(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(`${question} (y/n): `);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key) => {
            const char = key.toString().toLowerCase();
            process.stdin.setRawMode(false);
            rl.close();
            const isYes = char === 'y' || char === '\r' || char === '\n';
            if (isYes) {
                process.stdout.write(chalk_1.default.green('y\n'));
                resolve(true);
            }
            else {
                process.stdout.write(chalk_1.default.red('n\n'));
                resolve(false);
            }
        });
    });
}
async function runGitWorkflow() {
    console.log(chalk_1.default.blue('🚀 Starting Git Automation Workflow...'));
    try {
        // 1. Git Pull — user decides with a single keypress
        const shouldPull = await askYesNo('Pull latest changes from remote?');
        const spinner = (0, ora_1.default)();
        if (shouldPull) {
            spinner.start('Pulling latest changes...');
            try {
                await git.pull();
                spinner.succeed('Pulled latest changes');
            }
            catch (err) {
                spinner.warn('Pull failed (might be no remote or conflicts), continuing...');
            }
        }
        else {
            console.log(chalk_1.default.gray('  Skipped pull.'));
        }
        // 2. Security Scan — before staging so secrets never enter git history
        spinner.start('Running security scan...');
        const projectPath = process.cwd();
        const report = await (0, security_1.runSecurityChecks)(git, projectPath);
        spinner.stop();
        (0, security_1.printSecurityReport)(report);
        if (!report.passed) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = (0, security_1.saveSecurityReport)(report, reportsDir);
            console.log(chalk_1.default.red('❌ Aborted: secrets detected in working directory.'));
            console.log(chalk_1.default.yellow(`   Report saved to: ${reportFile}`));
            console.log(chalk_1.default.yellow('   Remove the secrets before running git-auto again.'));
            process.exit(1);
        }
        if (report.vulnerabilities.total > 0) {
            const reportsDir = path.join(projectPath, '.security-reports');
            (0, security_1.saveSecurityReport)(report, reportsDir);
        }
        // 3. Git Add
        spinner.start('Adding files...');
        await git.add('.');
        spinner.succeed('Added all files');
        // 4. Generate Commit Message
        spinner.start('Generating commit message with Gemini...');
        const status = await git.status();
        if (status.files.length === 0) {
            spinner.info('No changes to commit.');
            return;
        }
        const diff = await git.diff(['--cached']);
        const context = diff.length > 0 ? diff : JSON.stringify(status.files);
        const commitMessage = await (0, ai_service_1.generateCommitMessage)(context);
        spinner.succeed(`Generated commit message: ${commitMessage}`);
        // 5. Git Commit
        spinner.start('Committing...');
        await git.commit(commitMessage);
        spinner.succeed('Committed changes');
        // 6. Git Push
        spinner.start('Pushing to remote...');
        await git.push();
        spinner.succeed('Pushed to remote');
        console.log(chalk_1.default.green('✅ Workflow completed successfully!'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Error occurred:'), error.message);
        process.exit(1);
    }
}
