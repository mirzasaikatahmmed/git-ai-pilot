"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommitMessage = generateCommitMessage;
const gemini_1 = require("./gemini");
const openai_1 = require("./openai");
const chalk_1 = __importDefault(require("chalk"));
async function generateCommitMessage(diff) {
    try {
        return await (0, gemini_1.generateCommitMessage)(diff);
    }
    catch (error) {
        console.warn(chalk_1.default.yellow(`⚠️ Gemini failed: ${error.message}. Switching to OpenAI...`));
        try {
            return await (0, openai_1.generateCommitMessageOpenAI)(diff);
        }
        catch (openaiError) {
            throw new Error(`Both Gemini and OpenAI failed. Gemini: ${error.message} | OpenAI: ${openaiError.message}`);
        }
    }
}
