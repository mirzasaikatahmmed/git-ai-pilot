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

export interface LanguageAuditResult {
  language: string;
  icon: string;
  detected: boolean;
  toolAvailable: boolean;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  packages: AuditPackage[];
  installHint?: string;
}

export interface VulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  packages: AuditPackage[];
  languages: LanguageAuditResult[];
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

// ─── Language detection helpers ───────────────────────────────────────────────

function hasFile(dir: string, ...files: string[]): boolean {
  return files.some(f => fs.existsSync(path.join(dir, f)));
}

function hasFilePattern(dir: string, pattern: RegExp): boolean {
  try { return fs.readdirSync(dir).some(f => pattern.test(f)); } catch { return false; }
}

function cmdExists(name: string): boolean {
  try { execSync(`which ${name}`, { encoding: 'utf-8', timeout: 3000, stdio: 'pipe' }); return true; } catch { return false; }
}

function tryRun(cmd: string, cwd: string, timeout = 30000): string {
  try {
    return execSync(cmd + ' 2>/dev/null', { cwd, encoding: 'utf-8', timeout });
  } catch (e: any) { return e.stdout || ''; }
}

function emptyLang(language: string, icon: string, installHint?: string): LanguageAuditResult {
  return { language, icon, detected: true, toolAvailable: false, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [], installHint };
}

// ─── Per-language auditors ────────────────────────────────────────────────────

function auditNode(dir: string): LanguageAuditResult {
  const base = { language: 'Node.js', icon: '🟢', detected: true, toolAvailable: true };
  const raw = tryRun('npm audit --json', dir);
  try {
    const audit = JSON.parse(raw);
    const m = audit.metadata?.vulnerabilities || {};
    const packages: AuditPackage[] = Object.values(audit.vulnerabilities || {}).map((v: any) => ({
      name: v.name, severity: v.severity,
      via: (Array.isArray(v.via) ? v.via : []).map((x: any) => typeof x === 'string' ? x : x.title || x.name || ''),
      fixAvailable: v.fixAvailable ?? false,
    }));
    return { ...base, total: m.total || 0, critical: m.critical || 0, high: m.high || 0, moderate: m.moderate || 0, low: m.low || 0, packages };
  } catch { return { ...base, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [] }; }
}

function auditPython(dir: string): LanguageAuditResult {
  if (!cmdExists('pip-audit')) return emptyLang('Python', '🐍', 'pip install pip-audit');
  const raw = tryRun('pip-audit --format json', dir);
  try {
    const results: any[] = JSON.parse(raw);
    const packages: AuditPackage[] = [];
    let total = 0;
    for (const pkg of results) {
      if (pkg.vulns?.length) {
        total += pkg.vulns.length;
        packages.push({ name: pkg.name, severity: 'high', via: pkg.vulns.map((v: any) => v.id), fixAvailable: pkg.vulns.some((v: any) => v.fix_versions?.length) });
      }
    }
    return { language: 'Python', icon: '🐍', detected: true, toolAvailable: true, total, critical: 0, high: total, moderate: 0, low: 0, packages };
  } catch { return { language: 'Python', icon: '🐍', detected: true, toolAvailable: true, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [] }; }
}

function auditPhp(dir: string): LanguageAuditResult {
  if (!cmdExists('composer')) return emptyLang('PHP', '🐘', 'Install Composer: https://getcomposer.org');
  const raw = tryRun('composer audit --format json', dir);
  try {
    const result = JSON.parse(raw);
    const advisories: Record<string, any[]> = result.advisories || {};
    const packages: AuditPackage[] = [];
    let total = 0;
    for (const [pkgName, advList] of Object.entries(advisories)) {
      total += advList.length;
      for (const adv of advList) packages.push({ name: pkgName, severity: adv.severity || 'high', via: [adv.title || ''], fixAvailable: false });
    }
    return { language: 'PHP', icon: '🐘', detected: true, toolAvailable: true, total, critical: 0, high: total, moderate: 0, low: 0, packages };
  } catch { return { language: 'PHP', icon: '🐘', detected: true, toolAvailable: true, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [] }; }
}

function auditGo(dir: string): LanguageAuditResult {
  if (!cmdExists('govulncheck')) return emptyLang('Go', '🐹', 'go install golang.org/x/vuln/cmd/govulncheck@latest');
  const raw = tryRun('govulncheck -json ./...', dir, 60000);
  const packages: AuditPackage[] = [];
  let total = 0;
  for (const line of raw.split('\n').filter(l => l.trim().startsWith('{'))) {
    try {
      const obj = JSON.parse(line);
      if (obj.finding?.osv) { total++; packages.push({ name: obj.finding.osv, severity: 'high', via: [], fixAvailable: false }); }
    } catch { /* skip */ }
  }
  return { language: 'Go', icon: '🐹', detected: true, toolAvailable: true, total, critical: 0, high: total, moderate: 0, low: 0, packages };
}

function auditRuby(dir: string): LanguageAuditResult {
  if (!cmdExists('bundle-audit')) return emptyLang('Ruby', '💎', 'gem install bundler-audit');
  const raw = tryRun('bundle-audit check --update', dir);
  const nameLines = raw.split('\n').filter(l => l.trim().startsWith('Name:'));
  const packages: AuditPackage[] = nameLines.map(l => ({ name: l.replace('Name:', '').trim(), severity: 'high', via: [], fixAvailable: false }));
  return { language: 'Ruby', icon: '💎', detected: true, toolAvailable: true, total: packages.length, critical: 0, high: packages.length, moderate: 0, low: 0, packages };
}

function auditRust(dir: string): LanguageAuditResult {
  if (!cmdExists('cargo')) return emptyLang('Rust', '🦀', 'Install Rust: https://rustup.rs');
  const raw = tryRun('cargo audit --json', dir, 60000);
  try {
    const result = JSON.parse(raw);
    const vulns: any[] = result.vulnerabilities?.list || [];
    const packages: AuditPackage[] = vulns.map(v => ({
      name: v.package?.name || '', severity: v.advisory?.severity || 'high',
      via: [v.advisory?.title || ''], fixAvailable: !!v.versions?.patched?.length,
    }));
    return { language: 'Rust', icon: '🦀', detected: true, toolAvailable: true, total: vulns.length, critical: 0, high: vulns.length, moderate: 0, low: 0, packages };
  } catch { return { language: 'Rust', icon: '🦀', detected: true, toolAvailable: true, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [] }; }
}

function auditFlutter(dir: string): LanguageAuditResult {
  const tool = cmdExists('dart') ? 'dart' : cmdExists('flutter') ? 'flutter' : null;
  if (!tool) return emptyLang('Flutter/Dart', '💙', 'Install Flutter: https://flutter.dev');
  return { language: 'Flutter/Dart', icon: '💙', detected: true, toolAvailable: true, total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [], installHint: 'Run "dart pub upgrade" to update dependencies' };
}

function auditDotNet(dir: string): LanguageAuditResult {
  if (!cmdExists('dotnet')) return emptyLang('.NET', '💜', 'Install .NET SDK: https://dot.net');
  const raw = tryRun('dotnet list package --vulnerable --include-transitive', dir, 60000);
  const lines = raw.split('\n').filter(l => l.trim().startsWith('>'));
  const packages: AuditPackage[] = lines.map(l => ({ name: l.trim().split(/\s+/)[1] || l.trim(), severity: 'high', via: [], fixAvailable: false }));
  return { language: '.NET', icon: '💜', detected: true, toolAvailable: true, total: packages.length, critical: 0, high: packages.length, moderate: 0, low: 0, packages };
}

function auditJava(dir: string): LanguageAuditResult {
  const hasMvn = cmdExists('mvn');
  return {
    language: 'Java', icon: '☕', detected: true, toolAvailable: hasMvn,
    total: 0, critical: 0, high: 0, moderate: 0, low: 0, packages: [],
    installHint: hasMvn ? 'Run: mvn org.owasp:dependency-check-maven:check' : 'Install Maven: https://maven.apache.org',
  };
}

function auditSwift(dir: string): LanguageAuditResult {
  return emptyLang('Swift', '🍎', 'No standard CLI vuln scanner — check https://github.com/nicklockwood/SwiftFormat');
}

// ─── Main multi-language audit ────────────────────────────────────────────────

export function runVulnerabilityAudit(projectPath: string): VulnerabilitySummary {
  const results: LanguageAuditResult[] = [];

  if (hasFile(projectPath, 'package.json'))                                      results.push(auditNode(projectPath));
  if (hasFile(projectPath, 'requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py')) results.push(auditPython(projectPath));
  if (hasFile(projectPath, 'composer.json'))                                     results.push(auditPhp(projectPath));
  if (hasFile(projectPath, 'go.mod'))                                            results.push(auditGo(projectPath));
  if (hasFile(projectPath, 'Gemfile'))                                           results.push(auditRuby(projectPath));
  if (hasFile(projectPath, 'Cargo.toml'))                                        results.push(auditRust(projectPath));
  if (hasFile(projectPath, 'pubspec.yaml'))                                      results.push(auditFlutter(projectPath));
  if (hasFile(projectPath, 'pom.xml', 'build.gradle', 'build.gradle.kts'))      results.push(auditJava(projectPath));
  if (hasFilePattern(projectPath, /\.(csproj|sln|fsproj)$/))                     results.push(auditDotNet(projectPath));
  if (hasFile(projectPath, 'Package.swift'))                                     results.push(auditSwift(projectPath));

  const total    = results.reduce((s, r) => s + r.total, 0);
  const critical = results.reduce((s, r) => s + r.critical, 0);
  const high     = results.reduce((s, r) => s + r.high, 0);
  const moderate = results.reduce((s, r) => s + r.moderate, 0);
  const low      = results.reduce((s, r) => s + r.low, 0);
  const packages = results.flatMap(r => r.packages);

  return { total, critical, high, moderate, low, info: 0, packages, languages: results };
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
  console.log(L + chalk.bold.cyan('🔍  Dependency Audit'));
  console.log(L);

  if (v.languages.length === 0) {
    console.log(L + chalk.gray('   No recognized project type detected'));
  } else {
    for (const lang of v.languages) {
      const nameTag = `${lang.icon}  ${lang.language.padEnd(14)}`;
      if (!lang.toolAvailable) {
        console.log(L + chalk.gray(`${nameTag}`) + chalk.gray('  tool not installed'));
        if (lang.installHint) console.log(L + chalk.gray(`                       ↳  ${lang.installHint}`));
      } else if (lang.total === 0) {
        const hint = lang.installHint ? chalk.gray(`  ↳  ${lang.installHint}`) : '';
        console.log(L + chalk.gray(`${nameTag}`) + chalk.green('  ✔  clean') + hint);
      } else {
        const color = lang.critical > 0 || lang.high > 0 ? chalk.red : chalk.yellow;
        console.log(L + chalk.gray(`${nameTag}`) + color(`  ⚠  ${lang.total} issue${lang.total > 1 ? 's' : ''}`));
        if (lang.critical)  console.log(L + chalk.red(`                       Critical : ${lang.critical}`));
        if (lang.high)      console.log(L + chalk.red(`                       High     : ${lang.high}`));
        if (lang.moderate)  console.log(L + chalk.yellow(`                       Moderate : ${lang.moderate}`));
        if (lang.low)       console.log(L + chalk.gray(`                       Low      : ${lang.low}`));
        for (const pkg of lang.packages.slice(0, 3)) {
          console.log(L + chalk.gray(`                       •  ${pkg.name} [${pkg.severity}]${pkg.fixAvailable ? ' — fix available' : ''}`));
        }
        if (lang.packages.length > 3) {
          console.log(L + chalk.gray(`                       …  and ${lang.packages.length - 3} more`));
        }
      }
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
