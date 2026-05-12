import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { getApiKey } from './config';

dotenv.config();

export async function generateCommitMessage(diff: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please run the installation again or set it in your environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text.trim();
}
