# Repository Rules — Git AI Pilot

This document explains how this repository is protected and the exact steps every contributor must follow to participate.

---

## Who can push directly?

**Only the repository owner (@mirzasaikatahmmed) can push directly to `main`.**

All other contributors — no matter their experience level — must go through a Pull Request. Direct pushes from external accounts are blocked by GitHub branch protection rules.

---

## Branch Protection Setup (for the owner)

> These are one-time settings you configure in **GitHub → Settings → Branches**.

### Steps

1. Go to your repository on GitHub
2. Click **Settings** → **Branches** (left sidebar)
3. Under **Branch protection rules**, click **Add rule**
4. In **Branch name pattern**, type: `main`
5. Enable the following options:

| Setting | Value |
|--------|-------|
| Require a pull request before merging | ✅ ON |
| Require approvals | ✅ ON (set to **1**) |
| Dismiss stale pull request approvals when new commits are pushed | ✅ ON |
| Require status checks to pass before merging | ✅ ON (add your CI workflows) |
| Require branches to be up to date before merging | ✅ ON |
| Do not allow bypassing the above settings | ✅ ON |
| Restrict who can push to matching branches | ✅ ON → add only `mirzasaikatahmmed` |
| Allow force pushes | ❌ OFF |
| Allow deletions | ❌ OFF |

6. Click **Save changes**

After this, **no one** — not even collaborators — can push to `main` without a reviewed and approved PR.

---

## Contributor Workflow

Every contributor must follow these 5 steps in order.

### Step 1 — Star the repository

Click the **Star** button at the top-right of the repository page.

This shows support for the project and helps others discover it.

### Step 2 — Fork the repository

Click the **Fork** button at the top-right of the repository page.

GitHub will create a full copy of the repository under **your own account**:

```
https://github.com/<your-username>/git-ai-pilot
```

You own this fork — you can do anything inside it without affecting the original.

### Step 3 — Clone your fork locally

```bash
git clone https://github.com/<your-username>/git-ai-pilot.git
cd git-ai-pilot
```

Add the original repository as an upstream remote so you can stay in sync:

```bash
git remote add upstream https://github.com/mirzasaikatahmmed/git-ai-pilot.git
```

Verify your remotes:

```bash
git remote -v
# origin    https://github.com/<your-username>/git-ai-pilot.git (fetch)
# origin    https://github.com/<your-username>/git-ai-pilot.git (push)
# upstream  https://github.com/mirzasaikatahmmed/git-ai-pilot.git (fetch)
# upstream  https://github.com/mirzasaikatahmmed/git-ai-pilot.git (push)
```

### Step 4 — Create a branch and make your changes

Never work directly on `main`. Create a dedicated branch:

```bash
# Pull the latest changes from upstream first
git fetch upstream
git checkout -b feat/your-feature-name upstream/main
```

Make your changes, then build and test:

```bash
cd apps/cli
npm install
npm run build
```

Commit using the project's emoji convention (or use `git-auto` itself):

```bash
git add .
git commit -m "✨ feat: describe what you added"
```

Push your branch to **your fork** (not the original):

```bash
git push origin feat/your-feature-name
```

### Step 5 — Open a Pull Request

1. Go to your fork on GitHub: `https://github.com/<your-username>/git-ai-pilot`
2. Click the **Compare & pull request** button that appears after your push
3. Set the base repository to `mirzasaikatahmmed/git-ai-pilot` and base branch to `main`
4. Fill in the PR description:
   - What did you change?
   - Why did you change it?
   - How did you test it?
5. Click **Create pull request**

The maintainer (@mirzasaikatahmmed) will review, leave feedback if needed, and merge when it's ready.

---

## Keeping your fork up to date

Before starting any new contribution, sync your fork with the latest upstream changes:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

This prevents merge conflicts when you open your PR.

---

## What happens if you try to push directly?

If you attempt to push directly to the `mirzasaikatahmmed/git-ai-pilot` repository without going through a PR, GitHub will reject it:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Required status check "build" is required.
To https://github.com/mirzasaikatahmmed/git-ai-pilot.git
 ! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs
```

This is expected behaviour. Follow the fork → branch → PR workflow above.

---

## Summary

```
Star the repo
  └── Fork to your account
        └── Clone your fork locally
              └── Create a feature branch
                    └── Push to your fork
                          └── Open a Pull Request → reviewed & merged by @mirzasaikatahmmed
```

Questions? Open an [issue](https://github.com/mirzasaikatahmmed/git-ai-pilot/issues) or start a [discussion](https://github.com/mirzasaikatahmmed/git-ai-pilot/discussions).
