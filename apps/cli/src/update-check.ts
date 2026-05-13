import * as https from 'https';
import chalk from 'chalk';

const W = 50;
const PACKAGE_NAME = 'git-ai-pilot';

function fetchLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.get(
            `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
            { headers: { Accept: 'application/json' } },
            (res) => {
                let data = '';
                res.on('data', (chunk: string) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve((JSON.parse(data) as { version: string }).version);
                    } catch {
                        reject(new Error('Failed to parse npm registry response'));
                    }
                });
            }
        );
        req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('npm registry request timed out'));
        });
        req.on('error', reject);
    });
}

function printUpdateBanner(current: string, latest: string): void {
    const center = (s: string): string => {
        const pad = W - s.length;
        const l = Math.floor(pad / 2);
        return ' '.repeat(l) + s + ' '.repeat(pad - l);
    };
    const line1 = `Update available  v${current} → v${latest}`;
    const line2 = `npm install -g ${PACKAGE_NAME}`;
    console.log('\n' + chalk.yellow('  ╔' + '═'.repeat(W) + '╗'));
    console.log(chalk.yellow('  ║') + chalk.bold.yellowBright(center(` 🚀  ${line1} `)) + chalk.yellow('║'));
    console.log(chalk.yellow('  ║') + chalk.cyan(center(` Run: ${line2} `)) + chalk.yellow('║'));
    console.log(chalk.yellow('  ╚' + '═'.repeat(W) + '╝'));
}

export async function checkForUpdate(currentVersion: string): Promise<void> {
    try {
        const latest = await fetchLatestVersion();
        if (latest && latest !== currentVersion) {
            printUpdateBanner(currentVersion, latest);
        }
    } catch {
        // silently ignore network / timeout errors
    }
}
