import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getGlobalConfig, saveGlobalConfig } from './config';

const DEFAULT_CMD = 'git-auto';
const W = 50;

function printAliasHeader(title: string) {
    const padL = Math.floor((W - title.length) / 2);
    const padR  = W - padL - title.length;
    console.log('\n' + chalk.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.cyan('  ║') + ' '.repeat(padL) + chalk.bold.white(title) + ' '.repeat(padR) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚' + '═'.repeat(W) + '╝') + '\n');
}

function promptInput(question: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(chalk.cyan('  ›') + '  ' + chalk.white(question) + chalk.cyan(': '));
        rl.once('line', (input) => {
            rl.close();
            resolve(input.trim());
        });
    });
}

function isWritable(dir: string): boolean {
    try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
}

function getBinDir(): string {
    try {
        const npmBin = execSync('npm bin -g', { encoding: 'utf-8', timeout: 5000 }).trim();
        if (isWritable(npmBin)) return npmBin;
    } catch { /* fall through */ }

    // Fallback to ~/.local/bin
    const localBin = path.join(os.homedir(), '.local', 'bin');
    if (!fs.existsSync(localBin)) fs.mkdirSync(localBin, { recursive: true });
    return localBin;
}

function getGitAutoBinPath(binDir: string): string {
    return path.join(binDir, 'git-auto');
}

function createAliasFile(name: string, binDir: string): void {
    const gitAutoPath = getGitAutoBinPath(binDir);
    const aliasPath   = path.join(binDir, name);

    if (process.platform === 'win32') {
        // Windows: create a .cmd wrapper
        const cmdContent = `@echo off\r\ncall "${gitAutoPath}.cmd" %*\r\n`;
        fs.writeFileSync(aliasPath + '.cmd', cmdContent, 'utf-8');
    } else {
        // Unix: symlink → git-auto
        if (fs.existsSync(aliasPath)) fs.unlinkSync(aliasPath);
        fs.symlinkSync(gitAutoPath, aliasPath);
        fs.chmodSync(aliasPath, '755');
    }
}

function removeAliasFile(name: string, binDir: string): void {
    const aliasPath = path.join(binDir, name);
    if (process.platform === 'win32') {
        if (fs.existsSync(aliasPath + '.cmd')) fs.unlinkSync(aliasPath + '.cmd');
    } else {
        if (fs.existsSync(aliasPath)) fs.unlinkSync(aliasPath);
    }
}

function validateName(name: string): string | null {
    if (!name) return 'Command name cannot be empty.';
    if (name === DEFAULT_CMD) return `"${DEFAULT_CMD}" is already the default — choose a different name.`;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) return 'Use only letters, numbers, hyphens, and underscores. Must start with a letter.';
    if (name.length > 32) return 'Command name must be 32 characters or fewer.';
    return null;
}

export async function setCustomCommand(): Promise<void> {
    printAliasHeader('  ✈️   Set Custom Command  ');

    const config = getGlobalConfig();
    if (config.customCommand) {
        console.log(chalk.gray(`  Current custom command: `) + chalk.cyan.bold(config.customCommand));
        console.log(chalk.gray('  Enter a new name to replace it, or press Ctrl+C to cancel.\n'));
    }

    const name = await promptInput('Enter custom command name (e.g. gitsync)');

    const error = validateName(name);
    if (error) {
        console.log(chalk.red(`\n  ✖  ${error}\n`));
        process.exit(1);
    }

    const binDir = getBinDir();

    // Remove previous alias if different
    if (config.customCommand && config.customCommand !== name) {
        try { removeAliasFile(config.customCommand, binDir); } catch { /* ignore */ }
    }

    try {
        createAliasFile(name, binDir);
        saveGlobalConfig({ ...config, customCommand: name });

        const npmBin = execSync('npm bin -g', { encoding: 'utf-8', timeout: 5000 }).trim();
        const isInPath = binDir === npmBin;

        console.log('\n' + chalk.green('  ╔' + '═'.repeat(W) + '╗'));
        console.log(chalk.green('  ║') + chalk.bold.greenBright(`  ✔  Custom command "${name}" created!`.padEnd(W)) + chalk.green('║'));
        console.log(chalk.green('  ╚' + '═'.repeat(W) + '╝'));
        console.log('');
        console.log(chalk.gray('  ↳  Run anywhere:  ') + chalk.cyan.bold(name));
        console.log(chalk.gray('  ↳  To reset:      ') + chalk.white('git-auto --reset-command'));
        console.log(chalk.gray('  ↳  Saved to:      ') + chalk.gray(path.join(binDir, name)));

        if (!isInPath) {
            console.log('');
            console.log(chalk.yellow('  ⚠  The bin directory may not be in your PATH.'));
            console.log(chalk.yellow(`  ↳  Add this to ~/.bashrc or ~/.zshrc:`));
            console.log(chalk.white(`     export PATH="${binDir}:$PATH"`));
        }
        console.log('');

    } catch (err: any) {
        console.log(chalk.red(`\n  ✖  Failed to create alias: ${err.message}`));
        if (process.platform !== 'win32') {
            console.log(chalk.yellow(`  ↳  Try: sudo git-auto --custom-command\n`));
        }
        process.exit(1);
    }
}

export function resetCustomCommand(): void {
    printAliasHeader('  ✈️   Reset Custom Command  ');

    const config = getGlobalConfig();

    if (!config.customCommand) {
        console.log(chalk.gray('  ℹ  No custom command is set.'));
        console.log(chalk.gray('  ↳  Default command "git-auto" is already active.\n'));
        return;
    }

    const name   = config.customCommand;
    const binDir = getBinDir();

    try {
        removeAliasFile(name, binDir);
        const { customCommand: _, ...rest } = config;
        saveGlobalConfig(rest);

        console.log(chalk.green(`  ✔  Custom command "${name}" removed.`));
        console.log(chalk.gray('  ↳  Back to default: ') + chalk.cyan.bold('git-auto') + '\n');
    } catch (err: any) {
        console.log(chalk.red(`  ✖  Failed to remove alias: ${err.message}\n`));
        process.exit(1);
    }
}

export function showCurrentCommand(): void {
    const config  = getGlobalConfig();
    const current = config.customCommand ?? DEFAULT_CMD;
    console.log('\n' + chalk.gray('  Active command: ') + chalk.cyan.bold(current));
    if (config.customCommand) {
        console.log(chalk.gray('  Default command: ') + chalk.gray(DEFAULT_CMD));
        console.log(chalk.gray('  Reset with:      ') + chalk.white('git-auto --reset-command'));
    }
    console.log('');
}
