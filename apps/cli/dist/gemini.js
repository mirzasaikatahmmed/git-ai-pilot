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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommitMessage = generateCommitMessage;
const generative_ai_1 = require("@google/generative-ai");
const dotenv = __importStar(require("dotenv"));
const config_1 = require("./config");
dotenv.config();
async function generateCommitMessage(diff) {
    const apiKey = (0, config_1.getApiKey)();
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Please run the installation again or set it in your environment.');
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
