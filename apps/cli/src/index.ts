import { simpleGit } from 'simple-git';
import { generateCommitMessage } from './ai-service';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { runSecurityChecks, printSecurityReport, saveSecurityReport } from './security';

dotenv.config({ quiet: true } as any);

const git = simpleGit();

export async function runGitWorkflow() {
    console.log(chalk.blue('🚀 Starting Git Automation Workflow...'));

    try {
        // 1. Git Pull
        const spinner = ora('Pulling latest changes...').start();
        try {
            await git.pull();
            spinner.succeed('Pulled latest changes');
        } catch (err) {
            spinner.warn('Pull failed (might be no remote or conflicts), continuing...');
        }

        // 2. Git Add
        spinner.start('Adding files...');
        await git.add('.');
        spinner.succeed('Added all files');

        // 3. Generate Commit Message
        spinner.start('Generating commit message with Gemini...');
        const status = await git.status();

        if (status.files.length === 0) {
            spinner.info('No changes to commit.');
            return;
        }

        const diff = await git.diff();
        const context = diff.length > 0 ? diff : JSON.stringify(status.files);

        const commitMessage = await generateCommitMessage(context);
        spinner.succeed(`Generated commit message: ${commitMessage}`);

        // 4. Git Commit
        spinner.start('Committing...');
        await git.commit(commitMessage);
        spinner.succeed('Committed changes');

        // 5. Security Scan (secrets + vulnerabilities) — runs before push
        spinner.start('Running security scan...');
        const projectPath = process.cwd();
        const report = await runSecurityChecks(git, projectPath);
        spinner.stop();

        printSecurityReport(report);

        if (!report.passed) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = saveSecurityReport(report, reportsDir);
            console.log(chalk.red(`❌ Push blocked: secrets detected in diff.`));
            console.log(chalk.yellow(`   Report saved to: ${reportFile}`));
            console.log(chalk.yellow('   Remove the secrets and recommit before pushing.'));
            process.exit(1);
        }

        if (report.vulnerabilities.total > 0) {
            const reportsDir = path.join(projectPath, '.security-reports');
            const reportFile = saveSecurityReport(report, reportsDir);
            console.log(chalk.yellow(`   Vulnerability report saved to: ${reportFile}`));
        }

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
