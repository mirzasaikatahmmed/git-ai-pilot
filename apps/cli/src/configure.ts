import * as readline from 'readline';
import chalk from 'chalk';
import { getGlobalConfig, saveGlobalConfig } from './config';

const W = 52;

function printConfigHeader() {
    const title = ' ✈️   Git AI Pilot — Configuration ';
    const padL  = Math.floor((W - title.length) / 2);
    const padR  = W - padL - title.length;
    console.log('\n' + chalk.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.cyan('  ║') + ' '.repeat(padL) + chalk.bold.white(title) + ' '.repeat(padR) + chalk.cyan('║'));
    console.log(chalk.cyan('  ╚' + '═'.repeat(W) + '╝') + '\n');
}

function keyStatus(key?: string): string {
    return key
        ? chalk.green('✔  configured')
        : chalk.gray('–  not set');
}

function printMenu(config: ReturnType<typeof getGlobalConfig>) {
    console.log(chalk.bold.white('  Select an option:\n'));
    console.log(
        `  ${chalk.cyan.bold('[1]')}  Gemini API Key  ${chalk.gray('(primary, free)')}   ${keyStatus(config.GEMINI_API_KEY)}`
    );
    console.log(
        `  ${chalk.cyan.bold('[2]')}  OpenAI API Key  ${chalk.gray('(fallback)     ')}   ${keyStatus(config.OPENAI_API_KEY)}`
    );
    console.log(chalk.gray('\n  Press 1 or 2 to select, or Ctrl+C to exit.\n'));
}

function pickOption(): Promise<'1' | '2'> {
    return new Promise((resolve) => {
        process.stdout.write(chalk.cyan('  ›') + '  ' + chalk.white('Option') + chalk.cyan(': '));
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key: Buffer) => {
            const char = key.toString();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            if (char === '') {           // Ctrl+C
                process.stdout.write('\n');
                process.exit(0);
            }
            if (char === '1' || char === '2') {
                process.stdout.write(chalk.greenBright(char + '\n'));
                resolve(char as '1' | '2');
            } else {
                process.stdout.write(chalk.red(char + '\n'));
                process.stdout.write(chalk.yellow('  ⚠  Please press 1 or 2.\n\n'));
                resolve(pickOption() as unknown as '1' | '2'); // retry
            }
        });
    });
}

function inputKey(label: string, current?: string): Promise<string> {
    return new Promise((resolve) => {
        const hint = current ? chalk.gray(' (press Enter to keep current)') : '';
        const rl   = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(chalk.cyan('\n  ›') + '  ' + chalk.white(label) + hint + chalk.cyan(': '));
        rl.once('line', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export async function runConfig(): Promise<void> {
    printConfigHeader();

    const config = getGlobalConfig();
    printMenu(config);

    const choice = await pickOption();

    if (choice === '1') {
        const value = await inputKey('Gemini API Key', config.GEMINI_API_KEY);
        if (!value && config.GEMINI_API_KEY) {
            console.log(chalk.gray('\n  ↳  Gemini key unchanged.\n'));
        } else if (!value) {
            console.log(chalk.yellow('\n  ⚠  No key entered. Gemini key not set.\n'));
        } else {
            config.GEMINI_API_KEY = value;
            saveGlobalConfig(config);
            console.log(chalk.green('\n  ✔  Gemini API Key saved successfully.\n'));
        }
    } else {
        const value = await inputKey('OpenAI API Key', config.OPENAI_API_KEY);
        if (!value && config.OPENAI_API_KEY) {
            console.log(chalk.gray('\n  ↳  OpenAI key unchanged.\n'));
        } else if (!value) {
            console.log(chalk.yellow('\n  ⚠  No key entered. OpenAI key not set.\n'));
        } else {
            config.OPENAI_API_KEY = value;
            saveGlobalConfig(config);
            console.log(chalk.green('\n  ✔  OpenAI API Key saved successfully.\n'));
        }
    }
}
