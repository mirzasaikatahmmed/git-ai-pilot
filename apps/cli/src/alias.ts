import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { getGlobalConfig, saveGlobalConfig } from './config';

(dotenv as any).config({ quiet: true });

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

// npm bin -g is deprecated — use npm prefix -g instead.
// On Windows the bin dir IS the prefix; on Unix it's prefix/bin.
function getNpmBinDir(): string {
    const prefix = execSync('npm prefix -g', {
        encoding: 'utf-8',
        timeout: 8000,
        stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
}

function getBinDir(): string {
    try {
        const npmBin = getNpmBinDir();
        if (isWritable(npmBin)) return npmBin;
    } catch { /* fall through to local fallback */ }

    // Fallback: ~/.local/bin (Unix) or %APPDATA%\npm (Windows)
    const localBin = process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'npm')
        : path.join(os.homedir(), '.local', 'bin');

    if (!fs.existsSync(localBin)) fs.mkdirSync(localBin, { recursive: true });
    return localBin;
}

function createAliasFile(name: string, binDir: string): void {
    const gitAutoCmd = path.join(binDir, 'git-auto');

    if (process.platform === 'win32') {
        // Windows: .cmd wrapper that delegates to git-auto.cmd
        const cmdContent = `@echo off\r\ncall "${gitAutoCmd}.cmd" %*\r\n`;
        fs.writeFileSync(path.join(binDir, name + '.cmd'), cmdContent, 'utf-8');
    } else {
        // Unix: symlink → git-auto
        const aliasPath = path.join(binDir, name);
        if (fs.existsSync(aliasPath)) fs.unlinkSync(aliasPath);
        fs.symlinkSync(gitAutoCmd, aliasPath);
        fs.chmodSync(aliasPath, '755');
    }
}

function removeAliasFile(name: string, binDir: string): void {
    if (process.platform === 'win32') {
        const p = path.join(binDir, name + '.cmd');
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } else {
        const p = path.join(binDir, name);
        if (fs.existsSync(p)) fs.unlinkSync(p);
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
        console.log(chalk.gray('  Current: ') + chalk.cyan.bold(config.customCommand));
        console.log(chalk.gray('  Enter a new name to replace it, or press Ctrl+C to cancel.\n'));
    }

    const name = await promptInput('Enter custom command name (e.g. gitsync)');

    const validationError = validateName(name);
    if (validationError) {
        console.log(chalk.red(`\n  ✖  ${validationError}\n`));
        process.exit(1);
    }

    let binDir: string;
    try {
        binDir = getBinDir();
    } catch (err: any) {
        console.log(chalk.red(`\n  ✖  Could not locate npm bin directory: ${err.message}\n`));
        process.exit(1);
        return;
    }

    // Remove old alias if name changed
    if (config.customCommand && config.customCommand !== name) {
        try { removeAliasFile(config.customCommand, binDir); } catch { /* ignore */ }
    }

    try {
        createAliasFile(name, binDir);
        saveGlobalConfig({ ...config, customCommand: name });

        const savedPath = process.platform === 'win32'
            ? path.join(binDir, name + '.cmd')
            : path.join(binDir, name);

        console.log('\n' + chalk.green('  ╔' + '═'.repeat(W) + '╗'));
        console.log(chalk.green('  ║') + chalk.bold.greenBright(`  ✔  Custom command "${name}" created!`.padEnd(W)) + chalk.green('║'));
        console.log(chalk.green('  ╚' + '═'.repeat(W) + '╝'));
        console.log('');
        console.log(chalk.gray('  ↳  Run anywhere:  ') + chalk.cyan.bold(name));
        console.log(chalk.gray('  ↳  To reset:      ') + chalk.white('git-auto --reset-command'));
        console.log(chalk.gray('  ↳  Saved to:      ') + chalk.gray(savedPath));
        console.log('');

    } catch (err: any) {
        console.log(chalk.red(`\n  ✖  Failed to create alias: ${err.message}`));
        if (process.platform === 'win32') {
            console.log(chalk.yellow('  ↳  Try running the terminal as Administrator.\n'));
        } else {
            console.log(chalk.yellow('  ↳  Try: sudo git-auto --custom-command\n'));
        }
        process.exit(1);
    }
}

export function resetCustomCommand(): void {
    printAliasHeader('  ✈️   Reset Custom Command  ');

    const config = getGlobalConfig();

    if (!config.customCommand) {
        console.log(chalk.gray('  ℹ  No custom command is set.'));
        console.log(chalk.gray('  ↳  Default "git-auto" is already active.\n'));
        return;
    }

    const name = config.customCommand;

    try {
        const binDir = getBinDir();
        removeAliasFile(name, binDir);
    } catch { /* best-effort */ }

    const { customCommand: _removed, ...rest } = config;
    saveGlobalConfig(rest);

    console.log(chalk.green(`  ✔  Custom command "${name}" removed.`));
    console.log(chalk.gray('  ↳  Back to default: ') + chalk.cyan.bold('git-auto') + '\n');
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
