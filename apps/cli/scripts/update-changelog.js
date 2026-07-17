#!/usr/bin/env node

// Runs automatically via npm's "version" lifecycle hook (see package.json).
// Moves everything under "## [Unreleased]" into a new "## [<version>] - <date>"
// section using the version npm just wrote to package.json, and leaves a fresh
// empty [Unreleased] section on top for the next round of changes.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

const UNRELEASED_HEADER = '## [Unreleased]';

function main() {
  const { version } = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);

  let changelog = fs.readFileSync(CHANGELOG, 'utf-8');

  const startIdx = changelog.indexOf(UNRELEASED_HEADER);
  if (startIdx === -1) {
    console.warn('  ⚠  CHANGELOG.md has no [Unreleased] section — skipping.');
    return;
  }

  if (changelog.includes(`## [${version}]`)) {
    console.warn(`  ⚠  CHANGELOG.md already has an entry for ${version} — skipping.`);
    return;
  }

  const bodyStart = startIdx + UNRELEASED_HEADER.length;
  const nextHeaderMatch = changelog.slice(bodyStart).match(/\n## \[/);
  const bodyEnd = nextHeaderMatch ? bodyStart + nextHeaderMatch.index : changelog.length;
  const body = changelog.slice(bodyStart, bodyEnd);

  if (!body.trim()) {
    console.warn('  ⚠  Nothing under [Unreleased] — skipping changelog version bump.');
    return;
  }

  const replacement = `${UNRELEASED_HEADER}\n\n## [${version}] - ${today}${body}`;
  changelog = changelog.slice(0, startIdx) + replacement + changelog.slice(bodyEnd);

  fs.writeFileSync(CHANGELOG, changelog);
  console.log(`  ✔  CHANGELOG.md: moved Unreleased notes under [${version}] - ${today}`);
}

main();
