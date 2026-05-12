#!/usr/bin/env node

const { program } = require('commander');
const { runGitWorkflow } = require('../dist/index');

program
    .version('1.0.0')
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
