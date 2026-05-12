#!/usr/bin/env node

const { program } = require('commander');
const { runGitWorkflow } = require('../dist/index');
const { version } = require('../package.json');

program
    .version(version)
    .description('Automated Git workflow with Gemini-generated commit messages')
    .action(async () => {
        try {
            await runGitWorkflow();
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
