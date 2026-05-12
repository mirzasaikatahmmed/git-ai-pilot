import { simpleGit } from 'simple-git';
import { generateCommitMessage } from './ai-service';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as readline from 'readline';
import { runSecurityChecks, printSecurityReport, saveSecurityReport } from './security';

dotenv.config({ quiet: true } as any);

const git = simpleGit();

function askYesNo(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(`${question} (y/n): `);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key: Buffer) => {
            const char = key.toString().toLowerCase();
            process.stdin.setRawMode(false);
            rl.close();
            const isYes = char === 'y' || char === '\r' || char === '\n';
            if (isYes) {
                process.stdout.write(chalk.green('y\n'));
                resolve(true);
            } else {
                process.stdout.write(chalk.red('n\n'));
                resolve(false);
            }
        });
    });
}

export async function runGitWorkflow() {
    console.log(chalk.blue('🚀 Starting Git Automation Workflow...'));

    try {
        // 1. Git Pull — user decides with a single keypress
        const shouldPull = await askYesNo('Pull latest changes from remote?');

        const spinner = ora();

        if (shouldPull) {
            spinner.start('Pulling latest changes...');
            try {
                await git.pull();
                spinner.succeed('Pulled latest changes');
            } catch (err) {
                spinner.warn('Pull failed (might be no remote or conflicts), continuing...');
            }
        } else {
            console.log(chalk.gray('  Skipped pull.'));
        }

        // 2. Security Scan — before staging so secrets never enter git history
        spinner.start('Running security scan...');
        const projectPath = process.cwd();
        const report = await runSecurityChecks(git, projectPath);
        spinner.stop();

        printSecurityReport(report);

        if (!report.passed) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = saveSecurityReport(report, reportsDir);
            console.log(chalk.red('❌ Aborted: secrets detected in working directory.'));
            console.log(chalk.yellow(`   Report saved to: ${reportFile}`));
            console.log(chalk.yellow('   Remove the secrets before running git-auto again.'));
            process.exit(1);
        }

        if (report.vulnerabilities.total > 0) {
            const reportsDir = path.join(projectPath, '.security-reports');
            saveSecurityReport(report, reportsDir);
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

        const commitMessage = await generateCommitMessage(context);
        spinner.succeed(`Generated commit message: ${commitMessage}`);

        // 5. Git Commit
        spinner.start('Committing...');
        await git.commit(commitMessage);
        spinner.succeed('Committed changes');

        // 6. Git Push
        spinner.start('Pushing to remote...');
        await git.push();
        spinner.succeed('Pushed to remote');

        console.log(chalk.green('✅ Workflow completed successfully!'));

    } catch (error: any) {
        console.error(chalk.red('❌ Error occurred:'), error.message);
        process.exit(1);
    }
}
