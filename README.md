# 🔍 Commit Message Linter

A CLI tool that fetches the last 20 commit messages from any public GitHub repository and scores each one across three quality criteria, then outputs a full health report.

---

## 📦 Setup

### Prerequisites
- Node.js v14 or higher ([download](https://nodejs.org))

### Install
```bash
git clone https://github.com/YOUR_USERNAME/commit-linter.git
cd commit-linter
npm install
```

---

## 🚀 Usage

```bash
node index.js <github-url-or-owner/repo>
```

### Examples

```bash
# Using full GitHub URL
node index.js https://github.com/facebook/react

# Using short owner/repo format
node index.js torvalds/linux

# VS Code repo
node index.js microsoft/vscode
```

### Help

```bash
node index.js --help
```

---

## 📊 Scoring Criteria

Each commit message is scored out of **30 points** across three criteria:

| Criteria | Max | Description |
|---|---|---|
| **Length** | 10 | Ideal is 20–50 chars. Too short (<10) scores 0, too long (>72) penalized |
| **Clarity** | 10 | Vague words like `fix`, `update`, `misc`, `wip` are flagged and penalized |
| **Convention** | 10 | Checks for `feat:`, `fix(scope):`, `docs:` etc. (Conventional Commits format) |

### Grade Scale
| Grade | Range | Label |
|---|---|---|
| A | 90–100% | Excellent |
| B | 75–89% | Good |
| C | 55–74% | Fair |
| D | 35–54% | Poor |
| F | 0–34% | Very Poor |

---

## 🖥️ Sample Run

```
╔══════════════════════════════════════════════════════╗
║        COMMIT MESSAGE LINTER — HEALTH REPORT         ║
╚══════════════════════════════════════════════════════╝
  Repository: https://github.com/microsoft/vscode
  Analyzed:   Last 20 commits
  Date:       3/19/2026, 10:30:00 AM

  #01  [a3f2b1c]  A  "feat: add notebook diff editor support"
        Score: ████████████████████ 28/30 (93%) — Excellent
        ✔ Length     (10/10): Ideal length (41 chars)
        ✔ Clarity    (10/10): Clear and descriptive
        ✔ Convention  (8/10): Follows conventional format: feat: ...
  ...

╔══════════════════════════════════════════════════════╗
║                  REPOSITORY SUMMARY                  ║
╚══════════════════════════════════════════════════════╝

  Overall Health Score: ████████████████░░░░ 78% — GOOD 👍

  Grade Distribution:
    A    5 commits  █████
    B    8 commits  ████████
    C    5 commits  █████
    D    2 commits  ██
    F    0 commits

  💡 Improvement Tips:
     • 7 commit(s) missing conventional prefix — use feat/fix/docs/chore/etc.
     • 2 commit(s) use vague words — describe the WHY, not just the WHAT
```

---

## 📁 Project Structure

```
commit-linter/
├── index.js      ← CLI entry point, fetches GitHub API
├── scorer.js     ← Scoring logic for all 3 criteria
├── reporter.js   ← Terminal output and report formatting
├── package.json
└── README.md
```

---

## 🔧 Optional: GitHub Token (for higher rate limits)

GitHub's public API allows 60 requests/hour without auth. If you hit rate limits:

1. Create a token at https://github.com/settings/tokens (no scopes needed for public repos)
2. Add it to `index.js` in the headers:
   ```js
   "Authorization": "token YOUR_TOKEN_HERE"
   ```

---

## 🔄 Future Improvements

- Support private repos via GitHub token in `.env`
- Export report as JSON or HTML
- Compare commit quality over time
- Add more conventional commit types
- Support GitLab/Bitbucket APIs