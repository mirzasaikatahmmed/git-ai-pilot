# Contributing to Git AI Pilot

Thanks for taking the time to contribute! This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms. Report violations to **contact@saikat.com.bd**.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v7 or higher
- A Git remote configured in your test repository
- (Optional) A Gemini or OpenAI API key for end-to-end testing

### Fork & Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/git-ai-pilot.git
cd git-ai-pilot
```

### Install Dependencies

```bash
npm install
```

This installs root devDependencies (Turborepo, Prettier) and all workspace packages.

### Build

```bash
npm run build          # build all packages via Turborepo
# or for the CLI only:
cd apps/cli && npm run build
```

### Watch Mode (CLI)

```bash
cd apps/cli
npm run dev            # tsc --watch — recompiles on every save
```

---

## Project Structure

```
git-ai-pilot/
├── apps/
│   └── cli/               # The npm package (git-ai-pilot)
│       ├── bin/
│       │   └── cli.js     # CLI entry point (plain JS shim)
│       ├── src/
│       │   ├── index.ts          # Git workflow orchestration
│       │   ├── ai-service.ts     # Gemini → OpenAI fallback logic
│       │   ├── gemini.ts         # Google Gemini integration
│       │   ├── openai.ts         # OpenAI integration
│       │   ├── security.ts       # Secret scanner & vulnerability audit
│       │   ├── config.ts         # API key management (~/.git-ai-pilot/config.json)
│       │   ├── alias.ts          # Custom command alias support
│       │   ├── configure.ts      # Interactive key configuration menu
│       │   ├── help.ts           # Styled --help screen
│       │   └── update-check.ts   # npm update notification
│       ├── dist/                  # Compiled output (git-ignored)
│       ├── scripts/
│       │   └── postinstall.js    # First-run key prompt
│       └── package.json
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       └── publish.yml
├── package.json           # Monorepo root
└── turbo.json
```

---

## Development Workflow

### Running Locally

After building, link the CLI globally so you can test it like a real install:

```bash
cd apps/cli
npm link
```

Now `git-auto` points to your local build. Run it inside any git repo with staged or unstaged changes.

### Testing a Specific Source File

The repo does not yet have a test suite. When adding new functionality, manually verify:

1. The happy path (normal workflow completes without error)
2. Edge cases specific to your change (e.g., no remote, empty diff, missing API key)

If you set up automated tests, open a PR — contributions to the test infrastructure are very welcome.

### Linting & Formatting

```bash
npm run format          # Prettier over all TS/MD files
```

There is currently no ESLint config. Match the style of the surrounding code.

---

## Making Changes

1. Create a branch from `main`:

   ```bash
   git checkout -b feat/your-feature
   # or
   git checkout -b fix/your-bug
   ```

2. Make your changes in `apps/cli/src/`.

3. Rebuild after edits:

   ```bash
   cd apps/cli && npm run build
   ```

4. Test manually with `git-auto` in a scratch repository.

5. Run Prettier before committing:

   ```bash
   npm run format
   ```

### Key Source Areas

| File | What to touch |
|------|--------------|
| `index.ts` | Git workflow steps (pull → scan → stage → commit → push) |
| `ai-service.ts` | AI provider selection and fallback |
| `gemini.ts` / `openai.ts` | Provider-specific API calls and prompt tuning |
| `security.ts` | Secret patterns, file name checks, audit runners |
| `config.ts` | Config file path, read/write helpers |
| `alias.ts` | Custom command alias creation/reset |
| `update-check.ts` | npm registry polling and banner display |

---

## Commit Guidelines

Commits in this project use emoji prefixes. Use `git-auto` itself to commit your changes — it will generate a message for you — or follow this guide manually:

| Prefix | When to use |
|--------|------------|
| `✨ feat:` | New feature |
| `🐛 fix:` | Bug fix |
| `🔒 security:` | Security improvement |
| `♻️ refactor:` | Code change with no behaviour change |
| `📝 docs:` | Documentation only |
| `🏗️ build:` | Build system or dependency change |
| `✅ test:` | Adding or fixing tests |
| `🚀 ci:` | CI/CD changes |

Keep the subject line under 72 characters. Add a body if the *why* is non-obvious.

---

## Pull Request Process

1. Push your branch and open a PR against `main`.
2. Fill in the PR description: what changed, why, and how you tested it.
3. For major changes (new commands, security scanner overhaul), open an issue first to align on the approach.
4. A maintainer will review within a few days. Address feedback and push to the same branch — the PR updates automatically.
5. Once approved, the maintainer will squash-merge and include your change in the next npm release.

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/mirzasaikatahmmed/git-ai-pilot/issues) and include:

- `git-auto --version` output
- Node.js version (`node -v`)
- OS and shell
- Steps to reproduce
- What you expected vs. what actually happened
- Any error output (paste the full terminal output)

---

## Suggesting Features

Open an issue with the `enhancement` label. Describe the use case — not just what you want but *why*. If you're ready to implement it, mention that in the issue so we can discuss the approach before you write code.

---

## Questions?

Open an issue or reach out to [Mirza Saikat Ahmmed](https://github.com/mirzasaikatahmmed).
