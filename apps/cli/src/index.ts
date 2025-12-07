import { simpleGit } from 'simple-git';
import { generateCommitMessage } from './ai-service';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

dotenv.config();

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
        // If diff is too large, we might want to truncate it or just send file names
        const context = diff.length > 0 ? diff : JSON.stringify(status.files);

        const commitMessage = await generateCommitMessage(context);
        spinner.succeed(`Generated commit message: ${commitMessage}`);

        // 4. Git Commit
        spinner.start('Committing...');
        await git.commit(commitMessage);
        spinner.succeed('Committed changes');

        // 5. Git Push
        spinner.start('Pushing to remote...');
        await git.push();
        spinner.succeed('Pushed to remote');

        console.log(chalk.green('✅ Workflow completed successfully!'));

    } catch (error: any) {
        console.error(chalk.red('❌ Error occurred:'), error.message);
        process.exit(1);
    }
}
