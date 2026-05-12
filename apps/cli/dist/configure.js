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
exports.runConfig = runConfig;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const W = 52;
function printConfigHeader() {
    const title = ' ✈️   Git AI Pilot — Configuration ';
    const padL = Math.floor((W - title.length) / 2);
    const padR = W - padL - title.length;
    console.log('\n' + chalk_1.default.cyan('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.cyan('  ║') + ' '.repeat(padL) + chalk_1.default.bold.white(title) + ' '.repeat(padR) + chalk_1.default.cyan('║'));
    console.log(chalk_1.default.cyan('  ╚' + '═'.repeat(W) + '╝') + '\n');
}
function keyStatus(key) {
    return key
        ? chalk_1.default.green('✔  configured')
        : chalk_1.default.gray('–  not set');
}
function printMenu(config) {
    console.log(chalk_1.default.bold.white('  Select an option:\n'));
    console.log(`  ${chalk_1.default.cyan.bold('[1]')}  Gemini API Key  ${chalk_1.default.gray('(primary, free)')}   ${keyStatus(config.GEMINI_API_KEY)}`);
    console.log(`  ${chalk_1.default.cyan.bold('[2]')}  OpenAI API Key  ${chalk_1.default.gray('(fallback)     ')}   ${keyStatus(config.OPENAI_API_KEY)}`);
    console.log(chalk_1.default.gray('\n  Press 1 or 2 to select, or Ctrl+C to exit.\n'));
}
function pickOption() {
    return new Promise((resolve) => {
        process.stdout.write(chalk_1.default.cyan('  ›') + '  ' + chalk_1.default.white('Option') + chalk_1.default.cyan(': '));
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', (key) => {
            const char = key.toString();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            if (char === '') { // Ctrl+C
                process.stdout.write('\n');
                process.exit(0);
            }
            if (char === '1' || char === '2') {
                process.stdout.write(chalk_1.default.greenBright(char + '\n'));
                resolve(char);
            }
            else {
                process.stdout.write(chalk_1.default.red(char + '\n'));
                process.stdout.write(chalk_1.default.yellow('  ⚠  Please press 1 or 2.\n\n'));
                resolve(pickOption()); // retry
            }
        });
    });
}
function inputKey(label, current) {
    return new Promise((resolve) => {
        const hint = current ? chalk_1.default.gray(' (press Enter to keep current)') : '';
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        process.stdout.write(chalk_1.default.cyan('\n  ›') + '  ' + chalk_1.default.white(label) + hint + chalk_1.default.cyan(': '));
        rl.once('line', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
async function runConfig() {
    printConfigHeader();
    const config = (0, config_1.getGlobalConfig)();
    printMenu(config);
    const choice = await pickOption();
    if (choice === '1') {
        const value = await inputKey('Gemini API Key', config.GEMINI_API_KEY);
        if (!value && config.GEMINI_API_KEY) {
            console.log(chalk_1.default.gray('\n  ↳  Gemini key unchanged.\n'));
        }
        else if (!value) {
            console.log(chalk_1.default.yellow('\n  ⚠  No key entered. Gemini key not set.\n'));
        }
        else {
            config.GEMINI_API_KEY = value;
            (0, config_1.saveGlobalConfig)(config);
            console.log(chalk_1.default.green('\n  ✔  Gemini API Key saved successfully.\n'));
        }
    }
    else {
        const value = await inputKey('OpenAI API Key', config.OPENAI_API_KEY);
        if (!value && config.OPENAI_API_KEY) {
            console.log(chalk_1.default.gray('\n  ↳  OpenAI key unchanged.\n'));
        }
        else if (!value) {
            console.log(chalk_1.default.yellow('\n  ⚠  No key entered. OpenAI key not set.\n'));
        }
        else {
            config.OPENAI_API_KEY = value;
            (0, config_1.saveGlobalConfig)(config);
            console.log(chalk_1.default.green('\n  ✔  OpenAI API Key saved successfully.\n'));
        }
    }
}
