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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommitMessage = generateCommitMessage;
const gemini_1 = require("./gemini");
const openai_1 = require("./openai");
const chalk_1 = __importDefault(require("chalk"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ quiet: true });
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
