"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalConfig = getGlobalConfig;
exports.saveGlobalConfig = saveGlobalConfig;
exports.getApiKey = getApiKey;
exports.getOpenAiApiKey = getOpenAiApiKey;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.git-ai-pilot');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
function getGlobalConfig() {
    if (!fs_1.default.existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        const content = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        return {};
    }
}
function saveGlobalConfig(config) {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
function getApiKey() {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    const config = getGlobalConfig();
    return config.GEMINI_API_KEY;
}
function getOpenAiApiKey() {
    if (process.env.OPENAI_API_KEY) {
        return process.env.OPENAI_API_KEY;
    }
    const config = getGlobalConfig();
    return config.OPENAI_API_KEY;
}
