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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text.trim();
}
