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
You are an expert developer. Generate a concise git commit message for the following code changes.

Format: <emoji> <type>: <short description>

Emoji guide — pick the ONE best match:
✨  feat       — new feature
🐛  fix        — bug fix
🔒  security   — security fix or secret/vulnerability patch
📝  docs       — documentation only
🎨  style      — formatting, UI, no logic change
♻️  refactor   — code restructure, no feature/fix
⚡  perf       — performance improvement
✅  test       — adding or fixing tests
🔧  chore      — config, tooling, maintenance
📦  build      — build system or dependency update
🗑️  remove     — deleting files or dead code
🚀  deploy     — deployment or release related

Rules:
- Output ONLY the commit message, nothing else — no backticks, no quotes, no explanation.
- First line must be under 72 characters.
- Use present tense ("add" not "added").

Changes:
${diff.substring(0, 5000)}
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
