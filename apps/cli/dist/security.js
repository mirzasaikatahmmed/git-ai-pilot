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
exports.scanSecretsInCommits = scanSecretsInCommits;
exports.runVulnerabilityAudit = runVulnerabilityAudit;
exports.printSecurityReport = printSecurityReport;
exports.saveSecurityReport = saveSecurityReport;
exports.runSecurityChecks = runSecurityChecks;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const SECRET_PATTERNS = [
    { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g },
    { name: 'AWS Secret Key', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9+/]{40}['"]?/gi },
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g },
    { name: 'OpenAI API Key', pattern: /sk-[A-Za-z0-9]{48}/g },
    { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
    { name: 'Stripe Secret Key', pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g },
    { name: 'Slack Token', pattern: /xox[baprs]-[0-9A-Za-z\-]{10,}/g },
    { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
    { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA|EC|OPENSSH|DSA|PGP)\s+PRIVATE KEY-----/g },
    { name: 'Hardcoded Secret', pattern: /(?:secret|password|passwd|api[_-]?key|auth[_-]?token)\s*[=:]\s*['"][^'"]{8,}['"]/gi },
];
const SKIP_FILE_PATTERNS = [
    /node_modules\//,
    /\.git\//,
    /dist\//,
    /build\//,
    /\.min\.js$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
];
const SKIP_LINE_PATTERN = /example|placeholder|your[_-]?key|<[^>]+>|\*{4}|dummy|fake/i;
function shouldSkipFile(filePath) {
    return SKIP_FILE_PATTERNS.some(p => p.test(filePath));
}
async function scanSecretsInCommits(git) {
    const findings = [];
    let diff = '';
    try {
        diff = await git.diff(['@{u}...HEAD']);
    }
    catch {
        try {
            diff = await git.diff(['HEAD']);
        }
        catch {
            return findings;
        }
    }
    if (!diff)
        return findings;
    let currentFile = '';
    let lineNum = 0;
    for (const raw of diff.split('\n')) {
        if (raw.startsWith('+++ b/')) {
            currentFile = raw.slice(6);
            lineNum = 0;
        }
        else if (raw.startsWith('@@ ')) {
            const m = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
            lineNum = m ? parseInt(m[1]) - 1 : 0;
        }
        else if (raw.startsWith('+') && !raw.startsWith('+++')) {
            lineNum++;
            if (!currentFile || shouldSkipFile(currentFile))
                continue;
            const content = raw.slice(1);
            if (SKIP_LINE_PATTERN.test(content))
                continue;
            for (const { name, pattern } of SECRET_PATTERNS) {
                pattern.lastIndex = 0;
                if (pattern.exec(content)) {
                    findings.push({
                        file: currentFile,
                        line: lineNum,
                        type: name,
                        content: content.trim().slice(0, 120),
                    });
                }
            }
        }
        else if (!raw.startsWith('-')) {
            lineNum++;
        }
    }
    return findings;
}
function runVulnerabilityAudit(projectPath) {
    const empty = { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0, packages: [] };
    if (!fs.existsSync(path.join(projectPath, 'package.json')))
        return empty;
    let rawOutput = '';
    try {
        rawOutput = (0, child_process_1.execSync)('npm audit --json 2>/dev/null', {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 30000,
        });
    }
    catch (err) {
        rawOutput = err.stdout || '';
    }
    try {
        const audit = JSON.parse(rawOutput);
        const meta = audit.metadata?.vulnerabilities || {};
        const packages = Object.values(audit.vulnerabilities || {}).map((v) => ({
            name: v.name,
            severity: v.severity,
            via: (Array.isArray(v.via) ? v.via : []).map((x) => typeof x === 'string' ? x : x.title || x.name || String(x)),
            fixAvailable: v.fixAvailable ?? false,
        }));
        return {
            total: meta.total || 0,
            critical: meta.critical || 0,
            high: meta.high || 0,
            moderate: meta.moderate || 0,
            low: meta.low || 0,
            info: meta.info || 0,
            packages,
        };
    }
    catch {
        return empty;
    }
}
function printSecurityReport(report) {
    console.log('\n' + chalk_1.default.bold('━━━ Security Scan Report ━━━'));
    console.log(chalk_1.default.gray(`  Time: ${report.timestamp}`));
    if (report.secrets.length === 0) {
        console.log(chalk_1.default.green('  ✔  No secrets detected'));
    }
    else {
        console.log(chalk_1.default.red(`  ✖  ${report.secrets.length} secret(s) found in diff:`));
        for (const s of report.secrets) {
            console.log(chalk_1.default.red(`     [${s.type}] ${s.file}:${s.line}`));
            console.log(chalk_1.default.gray(`       → ${s.content}`));
        }
    }
    const v = report.vulnerabilities;
    if (v.total === 0) {
        console.log(chalk_1.default.green('  ✔  No npm vulnerabilities found'));
    }
    else {
        const color = v.critical > 0 || v.high > 0 ? chalk_1.default.red : chalk_1.default.yellow;
        console.log(color(`  ⚠  ${v.total} npm vulnerabilit${v.total === 1 ? 'y' : 'ies'}:`));
        if (v.critical)
            console.log(chalk_1.default.red(`     Critical : ${v.critical}`));
        if (v.high)
            console.log(chalk_1.default.red(`     High     : ${v.high}`));
        if (v.moderate)
            console.log(chalk_1.default.yellow(`     Moderate : ${v.moderate}`));
        if (v.low)
            console.log(chalk_1.default.gray(`     Low      : ${v.low}`));
        const preview = v.packages.slice(0, 5);
        for (const pkg of preview) {
            console.log(chalk_1.default.gray(`     • ${pkg.name} [${pkg.severity}]${pkg.fixAvailable ? ' — fix available' : ''}`));
        }
        if (v.packages.length > 5) {
            console.log(chalk_1.default.gray(`     … and ${v.packages.length - 5} more (see report file)`));
        }
    }
    const status = report.passed ? chalk_1.default.green('PASSED') : chalk_1.default.red('BLOCKED — secrets detected');
    console.log(chalk_1.default.bold(`\n  Result: ${status}`));
    console.log(chalk_1.default.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}
function saveSecurityReport(report, reportsDir) {
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const filename = `security-report-${Date.now()}.json`;
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
}
async function runSecurityChecks(git, projectPath) {
    const secrets = await scanSecretsInCommits(git);
    const vulnerabilities = runVulnerabilityAudit(projectPath);
    return {
        timestamp: new Date().toISOString(),
        passed: secrets.length === 0,
        secrets,
        vulnerabilities,
    };
}
