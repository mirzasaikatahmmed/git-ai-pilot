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
exports.scanSecretsInDiff = scanSecretsInDiff;
exports.runVulnerabilityAudit = runVulnerabilityAudit;
exports.printSecurityReport = printSecurityReport;
exports.saveSecurityReport = saveSecurityReport;
exports.runSecurityChecks = runSecurityChecks;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
// Files that should never be committed — flagged on sight regardless of content
const SENSITIVE_FILE_PATTERNS = [
    { pattern: /(?:^|\/)\.env$/, label: '.env file' },
    { pattern: /(?:^|\/)\.env\.(?:local|prod|production|dev|development|staging|test|example\.local)$/, label: '.env variant' },
    { pattern: /\.pem$/, label: 'PEM certificate/key' },
    { pattern: /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/, label: 'SSH private key' },
    { pattern: /(?:^|\/)credentials\.(?:json|yml|yaml)$/, label: 'credentials file' },
    { pattern: /(?:^|\/)secrets\.(?:json|yml|yaml)$/, label: 'secrets file' },
    { pattern: /\.(?:keystore|jks|p12|pfx)$/, label: 'certificate keystore' },
    { pattern: /(?:^|\/)serviceAccount(?:Key)?\.json$/, label: 'service account key' },
    { pattern: /(?:^|\/)(?:aws|gcloud|azure)_credentials$/, label: 'cloud credentials file' },
    { pattern: /(?:^|\/)\.(?:netrc|pgpass|npmrc)$/, label: 'auth config file' },
];
// Inline secret patterns — applied to every added line in the diff
const SECRET_PATTERNS = [
    // Specific provider tokens — high confidence
    { name: 'AWS Access Key ID', severity: 'critical', pattern: /AKIA[0-9A-Z]{16}/g },
    { name: 'AWS Secret Access Key', severity: 'critical', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9+/]{40}['"]?/gi },
    { name: 'Google API Key', severity: 'critical', pattern: /AIza[0-9A-Za-z\-_]{35}/g },
    { name: 'OpenAI API Key', severity: 'critical', pattern: /sk-[A-Za-z0-9]{48}/g },
    { name: 'GitHub Token', severity: 'critical', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
    { name: 'Stripe Secret Key', severity: 'critical', pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g },
    { name: 'Slack Token', severity: 'high', pattern: /xox[baprs]-[0-9A-Za-z\-]{10,}/g },
    { name: 'JWT Token', severity: 'high', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
    { name: 'Private Key Header', severity: 'critical', pattern: /-----BEGIN\s+(?:RSA|EC|OPENSSH|DSA|PGP)\s+PRIVATE KEY-----/g },
    // Database / connection strings with embedded credentials
    { name: 'Database URL', severity: 'critical', pattern: /(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^:/@\s]+:[^@\s]{3,}@/gi },
    { name: 'Connection String Pwd', severity: 'high', pattern: /(?:Password|PWD)\s*=\s*(?!your|example|<)[^\s;,'"]{4,}/gi },
    // .env-style unquoted values (KEY=value with no quotes)
    { name: 'ENV Secret Variable', severity: 'high', pattern: /(?:^|[\s;])(?:[A-Z][A-Z0-9_]*_)?(?:API_?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|AUTH_?TOKEN|PRIVATE_?KEY|ACCESS_?KEY|CLIENT_?SECRET)\s*=\s*(?!your|example|test|fake|dummy|<|true|false|\s*$)[^\s#'"]{6,}/gm },
    // Quoted values in code / config
    { name: 'Hardcoded Secret', severity: 'medium', pattern: /(?:secret|password|passwd|api[_-]?key|auth[_-]?token)\s*[=:]\s*['"][^'"]{8,}['"]/gi },
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
    /\.md$/,
    /\.mdx$/,
    /\.txt$/,
    /\.rst$/,
];
const SKIP_LINE_PATTERN = /example|placeholder|your[_-]?(?:key|secret|token)|<[^>]+>|\*{4,}|dummy|fake/i;
function shouldSkipFile(filePath) {
    return SKIP_FILE_PATTERNS.some(p => p.test(filePath));
}
function isSensitiveFile(filePath) {
    for (const { pattern, label } of SENSITIVE_FILE_PATTERNS) {
        if (pattern.test(filePath))
            return label;
    }
    return null;
}
async function scanSecretsInDiff(diff) {
    const findings = [];
    const flaggedFiles = new Set();
    if (!diff)
        return findings;
    let currentFile = '';
    let lineNum = 0;
    for (const raw of diff.split('\n')) {
        if (raw.startsWith('+++ b/')) {
            currentFile = raw.slice(6);
            lineNum = 0;
            // Flag sensitive files by name the moment they appear in the diff
            const sensitiveLabel = isSensitiveFile(currentFile);
            if (sensitiveLabel && !flaggedFiles.has(currentFile)) {
                flaggedFiles.add(currentFile);
                findings.push({
                    file: currentFile,
                    line: 0,
                    type: `Sensitive file committed (${sensitiveLabel})`,
                    severity: 'critical',
                    content: currentFile,
                });
            }
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
            for (const { name, severity, pattern } of SECRET_PATTERNS) {
                pattern.lastIndex = 0;
                if (pattern.exec(content)) {
                    findings.push({
                        file: currentFile,
                        line: lineNum,
                        type: name,
                        severity,
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
function severityColor(severity) {
    if (severity === 'critical')
        return chalk_1.default.red;
    if (severity === 'high')
        return chalk_1.default.yellow;
    return chalk_1.default.magenta;
}
function printSecurityReport(report) {
    console.log('\n' + chalk_1.default.bold('━━━ Security Scan Report ━━━'));
    console.log(chalk_1.default.gray(`  Time: ${report.timestamp}`));
    if (report.secrets.length === 0) {
        console.log(chalk_1.default.green('  ✔  No secrets detected'));
    }
    else {
        const critCount = report.secrets.filter(s => s.severity === 'critical').length;
        const highCount = report.secrets.filter(s => s.severity === 'high').length;
        const medCount = report.secrets.filter(s => s.severity === 'medium').length;
        console.log(chalk_1.default.red(`  ✖  ${report.secrets.length} secret(s) found:`));
        if (critCount)
            console.log(chalk_1.default.red(`     Critical : ${critCount}`));
        if (highCount)
            console.log(chalk_1.default.yellow(`     High     : ${highCount}`));
        if (medCount)
            console.log(chalk_1.default.magenta(`     Medium   : ${medCount}`));
        console.log('');
        for (const s of report.secrets) {
            const color = severityColor(s.severity);
            const location = s.line > 0 ? `${s.file}:${s.line}` : s.file;
            console.log(color(`     [${s.severity.toUpperCase()}] ${s.type}`));
            console.log(chalk_1.default.gray(`       ${location}`));
            if (s.line > 0)
                console.log(chalk_1.default.gray(`       → ${s.content}`));
        }
    }
    const v = report.vulnerabilities;
    console.log('');
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
    // Scan unstaged working-directory changes (before git add)
    let diff = '';
    try {
        diff = await git.diff();
    }
    catch { /* no diff available */ }
    const secrets = await scanSecretsInDiff(diff);
    const vulnerabilities = runVulnerabilityAudit(projectPath);
    return {
        timestamp: new Date().toISOString(),
        passed: secrets.length === 0,
        secrets,
        vulnerabilities,
    };
}
