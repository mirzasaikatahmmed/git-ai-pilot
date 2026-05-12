#!/usr/bin/env node

const { program } = require('commander');
const { runGitWorkflow }                                          = require('../dist/index');
const { setCustomCommand, resetCustomCommand, showCurrentCommand } = require('../dist/alias');
const { printHelp }                                               = require('../dist/help');
const { runConfig }                                               = require('../dist/configure');
const { version }                                                 = require('../package.json');

program
    .version(version, '-v, --version', 'Show version number')
    .helpOption(false)
    .option('-h, --help',           'Show this help screen')
    .option('--config',             'Set Gemini or OpenAI API keys')
    .option('--custom-command',     'Set a custom command name alias (e.g. gitsync)')
    .option('--reset-command',      'Reset custom command back to git-auto')
    .option('--show-command',       'Show the currently active command name');

program.action(async (options) => {
    if (options.help) {
        printHelp();
        return;
    }
    if (options.config) {
        await runConfig();
        return;
    }
    if (options.customCommand) {
        await setCustomCommand();
        return;
    }
    if (options.resetCommand) {
        resetCustomCommand();
        return;
    }
    if (options.showCommand) {
        showCurrentCommand();
        return;
    }
    try {
        await runGitWorkflow();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
});

// Show help if called with no args only when explicitly --help is passed
// (no args = run workflow, which is the expected default behaviour)
program.parse(process.argv);
