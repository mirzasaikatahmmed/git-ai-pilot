import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { getOpenAiApiKey } from './config';

dotenv.config();

export async function generateCommitMessageOpenAI(diff: string): Promise<string> {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }

    const openai = new OpenAI({
        apiKey: apiKey,
    });

    const prompt = `
    You are an expert developer. Generate a concise and descriptive git commit message based on the following code changes (diff or file status).
    
    Requirements:
    1.  Start with a suitable emoji (e.g., ✨ for features, 🐛 for fixes, 📝 for docs, 🚀 for deployment, etc.).
    2.  Use the Conventional Commits format if possible (e.g., "feat: ...", "fix: ...").
    3.  Keep it under 72 characters if possible, or keep the first line short and add a body if necessary.
    4.  ONLY return the commit message string, nothing else.

    Changes:
    ${diff.substring(0, 5000)} // Truncate to avoid token limits if necessary
  `;

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
    });

    const content = completion.choices[0].message.content;
    if (!content) {
        throw new Error('OpenAI returned empty response');
    }
    return content.trim();
}
