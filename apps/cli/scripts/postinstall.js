#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CONFIG_DIR = path.join(os.homedir(), '.git-ai-pilot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Check if config already exists
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (config.GEMINI_API_KEY) {
            console.log('Gemini API Key already configured.');
            process.exit(0);
        }
    } catch (e) {
        // Ignore error, proceed to prompt
    }
}

console.log('\n==================================================');
console.log('  Git AI Pilot - Global Setup');
console.log('==================================================\n');
console.log('To use this tool, you need a Google Gemini API Key.');
console.log('Get one here: https://aistudio.google.com/app/apikey\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Please enter your Gemini API Key: ', (apiKey) => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
        console.error('\n[ERROR] API Key is required to install this package.');
        console.error('Installation aborted.\n');
        process.exit(1);
    }

    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config = { GEMINI_API_KEY: trimmedKey };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    console.log('\n[SUCCESS] API Key saved successfully!');
    console.log('You can now use "git-auto" in any repository.\n');

    rl.close();
    process.exit(0);
});
