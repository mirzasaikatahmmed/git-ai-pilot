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
exports.checkForUpdate = checkForUpdate;
const https = __importStar(require("https"));
const chalk_1 = __importDefault(require("chalk"));
const W = 50;
const PACKAGE_NAME = 'git-ai-pilot';
function fetchLatestVersion() {
    return new Promise((resolve, reject) => {
        const req = https.get(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, { headers: { Accept: 'application/json' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data).version);
                }
                catch {
                    reject(new Error('Failed to parse npm registry response'));
                }
            });
        });
        req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('npm registry request timed out'));
        });
        req.on('error', reject);
    });
}
function printUpdateBanner(current, latest) {
    const center = (s) => {
        const pad = W - s.length;
        const l = Math.floor(pad / 2);
        return ' '.repeat(l) + s + ' '.repeat(pad - l);
    };
    const line1 = `Update available  v${current} → v${latest}`;
    const line2 = `npm install -g ${PACKAGE_NAME}`;
    console.log('\n' + chalk_1.default.yellow('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk_1.default.yellow('  ║') + chalk_1.default.bold.yellowBright(center(` 🚀  ${line1} `)) + chalk_1.default.yellow('║'));
    console.log(chalk_1.default.yellow('  ║') + chalk_1.default.cyan(center(` Run: ${line2} `)) + chalk_1.default.yellow('║'));
    console.log(chalk_1.default.yellow('  ╚' + '═'.repeat(W) + '╝'));
}
async function checkForUpdate(currentVersion) {
    try {
        const latest = await fetchLatestVersion();
        if (latest && latest !== currentVersion) {
            printUpdateBanner(currentVersion, latest);
        }
    }
    catch {
        // silently ignore network / timeout errors
    }
}
