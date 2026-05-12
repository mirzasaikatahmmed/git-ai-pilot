import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SimpleGit } from 'simple-git';

export interface SecretFinding {
  file: string;
  line: number;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  content: string;
}

export interface AuditPackage {
  name: string;
  severity: string;
  via: string[];
  fixAvailable: boolean | string;
}

export interface VulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  packages: AuditPackage[];
}

export interface SecurityReport {
  timestamp: string;
  passed: boolean;
  secrets: SecretFinding[];
  vulnerabilities: VulnerabilitySummary;
}

// Files that should never be committed — flagged on sight regardless of content
const SENSITIVE_FILE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
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
const SECRET_PATTERNS: Array<{ name: string; severity: 'critical' | 'high' | 'medium'; pattern: RegExp }> = [
  // Specific provider tokens — high confidence
  { name: 'AWS Access Key ID',       severity: 'critical', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Access Key',   severity: 'critical', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9+/]{40}['"]?/gi },
  { name: 'Google API Key',          severity: 'critical', pattern: /AIza[0-9A-Za-z\-_]{35}/g },
  { name: 'OpenAI API Key',          severity: 'critical', pattern: /sk-[A-Za-z0-9]{48}/g },
  { name: 'GitHub Token',            severity: 'critical', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Stripe Secret Key',       severity: 'critical', pattern: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g },
  { name: 'Slack Token',             severity: 'high',     pattern: /xox[baprs]-[0-9A-Za-z\-]{10,}/g },
  { name: 'JWT Token',               severity: 'high',     pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Private Key Header',      severity: 'critical', pattern: /-----BEGIN\s+(?:RSA|EC|OPENSSH|DSA|PGP)\s+PRIVATE KEY-----/g },

  // Database / connection strings with embedded credentials
  { name: 'Database URL',            severity: 'critical', pattern: /(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^:/@\s]+:[^@\s]{3,}@/gi },
  { name: 'Connection String Pwd',   severity: 'high',     pattern: /(?:Password|PWD)\s*=\s*(?!your|example|<)[^\s;,'"]{4,}/gi },

  // .env-style unquoted values (KEY=value with no quotes)
  { name: 'ENV Secret Variable',     severity: 'high',     pattern: /(?:^|[\s;])(?:[A-Z][A-Z0-9_]*_)?(?:API_?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|AUTH_?TOKEN|PRIVATE_?KEY|ACCESS_?KEY|CLIENT_?SECRET)\s*=\s*(?!your|example|test|fake|dummy|<|true|false|\s*$)[^\s#'"]{6,}/gm },

  // Quoted values in code / config
  { name: 'Hardcoded Secret',        severity: 'medium',   pattern: /(?:secret|password|passwd|api[_-]?key|auth[_-]?token)\s*[=:]\s*['"][^'"]{8,}['"]/gi },
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

function shouldSkipFile(filePath: string): boolean {
  return SKIP_FILE_PATTERNS.some(p => p.test(filePath));
}

function isSensitiveFile(filePath: string): string | null {
  for (const { pattern, label } of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(filePath)) return label;
  }
  return null;
}

export async function scanSecretsInDiff(diff: string): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];
  const flaggedFiles = new Set<string>();

  if (!diff) return findings;

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
    } else if (raw.startsWith('@@ ')) {
      const m = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      lineNum = m ? parseInt(m[1]) - 1 : 0;
    } else if (raw.startsWith('+') && !raw.startsWith('+++')) {
      lineNum++;
      if (!currentFile || shouldSkipFile(currentFile)) continue;
      const content = raw.slice(1);
      if (SKIP_LINE_PATTERN.test(content)) continue;

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
    } else if (!raw.startsWith('-')) {
      lineNum++;
    }
  }

  return findings;
}

export function runVulnerabilityAudit(projectPath: string): VulnerabilitySummary {
  const empty: VulnerabilitySummary = { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0, packages: [] };

  if (!fs.existsSync(path.join(projectPath, 'package.json'))) return empty;

  let rawOutput = '';
  try {
    rawOutput = execSync('npm audit --json 2>/dev/null', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });
  } catch (err: any) {
    rawOutput = err.stdout || '';
  }

  try {
    const audit = JSON.parse(rawOutput);
    const meta = audit.metadata?.vulnerabilities || {};
    const packages: AuditPackage[] = Object.values(audit.vulnerabilities || {}).map((v: any) => ({
      name: v.name,
      severity: v.severity,
      via: (Array.isArray(v.via) ? v.via : []).map((x: any) =>
        typeof x === 'string' ? x : x.title || x.name || String(x)
      ),
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
  } catch {
    return empty;
  }
}

function severityColor(severity: SecretFinding['severity']): (s: string) => string {
  if (severity === 'critical') return chalk.red;
  if (severity === 'high')     return chalk.yellow;
  return chalk.magenta;
}

function severityBadge(severity: SecretFinding['severity']): string {
  if (severity === 'critical') return chalk.red.bold(`[${severity.toUpperCase()}]`);
  if (severity === 'high')     return chalk.yellow.bold(`[${severity.toUpperCase()}]`);
  return chalk.magenta.bold(`[${severity.toUpperCase()}]`);
}

const L = '  │ ';  // left border prefix

export function printSecurityReport(report: SecurityReport): void {
  const border  = '─'.repeat(48);
  const top     = '  ╭' + border + '╮';
  const bottom  = '  ╰' + border + '╯';
  const divider = '  ├' + border + '┤';

  console.log('\n' + top);
  console.log(L + chalk.bold.cyan('🔒  Security Scan Report'));
  console.log(L + chalk.gray(report.timestamp));
  console.log(divider);

  // Secrets section
  if (report.secrets.length === 0) {
    console.log(L + chalk.green('✔  No secrets detected'));
  } else {
    const critCount = report.secrets.filter(s => s.severity === 'critical').length;
    const highCount  = report.secrets.filter(s => s.severity === 'high').length;
    const medCount   = report.secrets.filter(s => s.severity === 'medium').length;

    console.log(L + chalk.red.bold(`✖  ${report.secrets.length} secret(s) found`));
    if (critCount) console.log(L + chalk.red(`   Critical : ${critCount}`));
    if (highCount) console.log(L + chalk.yellow(`   High     : ${highCount}`));
    if (medCount)  console.log(L + chalk.magenta(`   Medium   : ${medCount}`));

    for (const s of report.secrets) {
      console.log(L);
      console.log(L + `${severityBadge(s.severity)}  ${s.type}`);
      const location = s.line > 0 ? `${s.file}:${s.line}` : s.file;
      console.log(L + chalk.gray(`   ↳  ${location}`));
      if (s.line > 0) {
        console.log(L + chalk.gray(`   ↳  ${s.content}`));
      }
    }
  }

  // Vulnerabilities section
  const v = report.vulnerabilities;
  console.log(divider);

  if (v.total === 0) {
    console.log(L + chalk.green('✔  No npm vulnerabilities found'));
  } else {
    const color = v.critical > 0 || v.high > 0 ? chalk.red : chalk.yellow;
    console.log(L + color.bold(`⚠  ${v.total} npm vulnerabilit${v.total === 1 ? 'y' : 'ies'}`));
    if (v.critical)  console.log(L + chalk.red(`   Critical : ${v.critical}`));
    if (v.high)      console.log(L + chalk.red(`   High     : ${v.high}`));
    if (v.moderate)  console.log(L + chalk.yellow(`   Moderate : ${v.moderate}`));
    if (v.low)       console.log(L + chalk.gray(`   Low      : ${v.low}`));
    for (const pkg of v.packages.slice(0, 5)) {
      console.log(L + chalk.gray(`   •  ${pkg.name} [${pkg.severity}]${pkg.fixAvailable ? ' — fix available' : ''}`));
    }
    if (v.packages.length > 5) {
      console.log(L + chalk.gray(`   …  and ${v.packages.length - 5} more`));
    }
  }

  // Result
  console.log(divider);
  if (report.passed) {
    console.log(L + chalk.green.bold('✔  Result: PASSED'));
  } else {
    console.log(L + chalk.red.bold('✖  Result: BLOCKED — secrets detected'));
  }
  console.log(bottom + '\n');
}

export function saveSecurityReport(report: SecurityReport, reportsDir: string): string {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const filename = `security-report-${Date.now()}.json`;
  const filePath = path.join(reportsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}

export async function runSecurityChecks(git: SimpleGit, projectPath: string): Promise<SecurityReport> {
  // Scan unstaged working-directory changes (before git add)
  let diff = '';
  try {
    diff = await git.diff();
  } catch { /* no diff available */ }

  const secrets = await scanSecretsInDiff(diff);
  const vulnerabilities = runVulnerabilityAudit(projectPath);

  return {
    timestamp: new Date().toISOString(),
    passed: secrets.length === 0,
    secrets,
    vulnerabilities,
  };
}
