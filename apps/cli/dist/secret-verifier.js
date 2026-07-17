"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySecretsWithAI = verifySecretsWithAI;
const generative_ai_1 = require("@google/generative-ai");
const openai_1 = __importDefault(require("openai"));
const config_1 = require("./config");
async function callGemini(prompt, apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
}
async function callOpenAI(prompt, apiKey) {
    const openai = new openai_1.default({ apiKey });
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
    });
    return completion.choices[0].message.content || '';
}
function buildPrompt(findings) {
    const items = findings
        .map((f, i) => {
        const snippet = f.content.replace(/\s+/g, ' ').trim().slice(0, 300);
        return `${i}. [${f.type}] file=${f.file}${f.line ? `:${f.line}` : ''}\n   content: ${snippet}`;
    })
        .join('\n');
    return `You are a security triage assistant reviewing output from a regex-based secret scanner. Many matches are false positives: example values, placeholders, dummy/test/fixture data, documentation snippets, or files that look sensitive by name but contain no real credentials.

For EACH numbered item below, decide whether it is:
- "real"    — an actual live-looking credential/secret/connection string that could grant access if leaked
- "example" — a placeholder, example, sample, test, dummy, or fixture value with no real access risk

When unsure, prefer "real" (better a false positive than a missed secret).

Respond with ONLY a JSON array, no prose, no markdown fences:
[{"index": 0, "verdict": "real"}, {"index": 1, "verdict": "example"}]

Items:
${items}`;
}
function parseVerdicts(raw, count) {
    const result = Array(count).fill('real');
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match)
        return result;
    try {
        const parsed = JSON.parse(match[0]);
        for (const p of parsed) {
            if (typeof p.index === 'number' && p.index >= 0 && p.index < count && p.verdict === 'example') {
                result[p.index] = 'example';
            }
        }
    }
    catch {
        // Unparsable response — keep the fail-safe "real" defaults
    }
    return result;
}
async function callAI(prompt, geminiKey, openaiKey) {
    if (geminiKey) {
        try {
            return await callGemini(prompt, geminiKey);
        }
        catch {
            // fall through to OpenAI, if configured
        }
    }
    if (openaiKey) {
        try {
            return await callOpenAI(prompt, openaiKey);
        }
        catch {
            return null;
        }
    }
    return null;
}
// Reviews regex-flagged findings with AI and drops ones judged to be example/placeholder
// data. Fails safe: any missing verdict, or AI being unavailable/erroring, keeps the finding.
async function verifySecretsWithAI(findings) {
    if (findings.length === 0)
        return findings;
    const geminiKey = (0, config_1.getApiKey)();
    const openaiKey = (0, config_1.getOpenAiApiKey)();
    if (!geminiKey && !openaiKey)
        return findings;
    const prompt = buildPrompt(findings);
    const raw = await callAI(prompt, geminiKey, openaiKey);
    if (!raw)
        return findings;
    const verdicts = parseVerdicts(raw, findings.length);
    return findings.filter((_, i) => verdicts[i] !== 'example');
}
