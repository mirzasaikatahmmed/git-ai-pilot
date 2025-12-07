import { generateCommitMessage as generateCommitMessageGemini } from './gemini';
import { generateCommitMessageOpenAI } from './openai';
import chalk from 'chalk';

export async function generateCommitMessage(diff: string): Promise<string> {
    try {
        return await generateCommitMessageGemini(diff);
    } catch (error: any) {
        console.warn(chalk.yellow(`⚠️ Gemini failed: ${error.message}. Switching to OpenAI...`));
        try {
            return await generateCommitMessageOpenAI(diff);
        } catch (openaiError: any) {
            throw new Error(`Both Gemini and OpenAI failed. Gemini: ${error.message} | OpenAI: ${openaiError.message}`);
        }
    }
}
