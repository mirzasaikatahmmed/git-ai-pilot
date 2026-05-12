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
exports.setCustomCommand = setCustomCommand;
exports.resetCustomCommand = resetCustomCommand;
exports.showCurrentCommand = showCurrentCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const DEFAULT_CMD = 'git-auto';
const W = 50;
function printAliasHeader(title) {
    const padL = Math.floor((W - title.length) / 2);
    const padR = W - padL - title.length;
    console.log('\n' + chalk_1.default.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.cyan('  ║') + ' '.repeat(padL) + chalk_1.default.bold.white(title) + ' '.repeat(padR) + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('  ╚' + '═'.repeat(W) + '╝') + '\n');
}
function promptInput(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(chalk_1.default.cyan('  ›') + '  ' + chalk_1.default.white(question) + chalk_1.default.cyan(': '));
        rl.once('line', (input) => {
            rl.close();
            resolve(input.trim());
        });
    });
}
function isWritable(dir) {
    try {
        fs.accessSync(dir, fs.constants.W_OK);
        return true;
    }
    catch {
        return false;
    }
}
function getBinDir() {
    try {
        const npmBin = (0, child_process_1.execSync)('npm bin -g', { encoding: 'utf-8', timeout: 5000 }).trim();
        if (isWritable(npmBin))
            return npmBin;
    }
    catch { /* fall through */ }
    // Fallback to ~/.local/bin
    const localBin = path.join(os.homedir(), '.local', 'bin');
    if (!fs.existsSync(localBin))
        fs.mkdirSync(localBin, { recursive: true });
    return localBin;
}
function getGitAutoBinPath(binDir) {
    return path.join(binDir, 'git-auto');
}
function createAliasFile(name, binDir) {
    const gitAutoPath = getGitAutoBinPath(binDir);
    const aliasPath = path.join(binDir, name);
    if (process.platform === 'win32') {
        // Windows: create a .cmd wrapper
        const cmdContent = `@echo off\r\ncall "${gitAutoPath}.cmd" %*\r\n`;
        fs.writeFileSync(aliasPath + '.cmd', cmdContent, 'utf-8');
    }
    else {
        // Unix: symlink → git-auto
        if (fs.existsSync(aliasPath))
            fs.unlinkSync(aliasPath);
        fs.symlinkSync(gitAutoPath, aliasPath);
        fs.chmodSync(aliasPath, '755');
    }
}
function removeAliasFile(name, binDir) {
    const aliasPath = path.join(binDir, name);
    if (process.platform === 'win32') {
        if (fs.existsSync(aliasPath + '.cmd'))
            fs.unlinkSync(aliasPath + '.cmd');
    }
    else {
        if (fs.existsSync(aliasPath))
            fs.unlinkSync(aliasPath);
    }
}
function validateName(name) {
    if (!name)
        return 'Command name cannot be empty.';
    if (name === DEFAULT_CMD)
        return `"${DEFAULT_CMD}" is already the default — choose a different name.`;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name))
        return 'Use only letters, numbers, hyphens, and underscores. Must start with a letter.';
    if (name.length > 32)
        return 'Command name must be 32 characters or fewer.';
    return null;
}
async function setCustomCommand() {
    printAliasHeader('  ✈️   Set Custom Command  ');
    const config = (0, config_1.getGlobalConfig)();
    if (config.customCommand) {
        console.log(chalk_1.default.gray(`  Current custom command: `) + chalk_1.default.cyan.bold(config.customCommand));
        console.log(chalk_1.default.gray('  Enter a new name to replace it, or press Ctrl+C to cancel.\n'));
    }
    const name = await promptInput('Enter custom command name (e.g. gitsync)');
    const error = validateName(name);
    if (error) {
        console.log(chalk_1.default.red(`\n  ✖  ${error}\n`));
        process.exit(1);
    }
    const binDir = getBinDir();
    // Remove previous alias if different
    if (config.customCommand && config.customCommand !== name) {
        try {
            removeAliasFile(config.customCommand, binDir);
        }
        catch { /* ignore */ }
    }
    try {
        createAliasFile(name, binDir);
        (0, config_1.saveGlobalConfig)({ ...config, customCommand: name });
        const npmBin = (0, child_process_1.execSync)('npm bin -g', { encoding: 'utf-8', timeout: 5000 }).trim();
        const isInPath = binDir === npmBin;
        console.log('\n' + chalk_1.default.green('  ╔' + '═'.repeat(W) + '╗'));
        console.log(chalk_1.default.green('  ║') + chalk_1.default.bold.greenBright(`  ✔  Custom command "${name}" created!`.padEnd(W)) + chalk_1.default.green('║'));
        console.log(chalk_1.default.green('  ╚' + '═'.repeat(W) + '╝'));
        console.log('');
        console.log(chalk_1.default.gray('  ↳  Run anywhere:  ') + chalk_1.default.cyan.bold(name));
        console.log(chalk_1.default.gray('  ↳  To reset:      ') + chalk_1.default.white('git-auto --reset-command'));
        console.log(chalk_1.default.gray('  ↳  Saved to:      ') + chalk_1.default.gray(path.join(binDir, name)));
        if (!isInPath) {
            console.log('');
            console.log(chalk_1.default.yellow('  ⚠  The bin directory may not be in your PATH.'));
            console.log(chalk_1.default.yellow(`  ↳  Add this to ~/.bashrc or ~/.zshrc:`));
            console.log(chalk_1.default.white(`     export PATH="${binDir}:$PATH"`));
        }
        console.log('');
    }
    catch (err) {
        console.log(chalk_1.default.red(`\n  ✖  Failed to create alias: ${err.message}`));
        if (process.platform !== 'win32') {
            console.log(chalk_1.default.yellow(`  ↳  Try: sudo git-auto --custom-command\n`));
        }
        process.exit(1);
    }
}
function resetCustomCommand() {
    printAliasHeader('  ✈️   Reset Custom Command  ');
    const config = (0, config_1.getGlobalConfig)();
    if (!config.customCommand) {
        console.log(chalk_1.default.gray('  ℹ  No custom command is set.'));
        console.log(chalk_1.default.gray('  ↳  Default command "git-auto" is already active.\n'));
        return;
    }
    const name = config.customCommand;
    const binDir = getBinDir();
    try {
        removeAliasFile(name, binDir);
        const { customCommand: _, ...rest } = config;
        (0, config_1.saveGlobalConfig)(rest);
        console.log(chalk_1.default.green(`  ✔  Custom command "${name}" removed.`));
        console.log(chalk_1.default.gray('  ↳  Back to default: ') + chalk_1.default.cyan.bold('git-auto') + '\n');
    }
    catch (err) {
        console.log(chalk_1.default.red(`  ✖  Failed to remove alias: ${err.message}\n`));
        process.exit(1);
    }
}
function showCurrentCommand() {
    const config = (0, config_1.getGlobalConfig)();
    const current = config.customCommand ?? DEFAULT_CMD;
    console.log('\n' + chalk_1.default.gray('  Active command: ') + chalk_1.default.cyan.bold(current));
    if (config.customCommand) {
        console.log(chalk_1.default.gray('  Default command: ') + chalk_1.default.gray(DEFAULT_CMD));
        console.log(chalk_1.default.gray('  Reset with:      ') + chalk_1.default.white('git-auto --reset-command'));
    }
    console.log('');
}
