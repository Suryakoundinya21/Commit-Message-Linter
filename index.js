#!/usr/bin/env node
// index.js — Commit Message Linter CLI

const axios = require("axios");
const chalk = require("chalk");
const { scoreCommit } = require("./scorer");
const { printHeader, printCommitResult, printSummary } = require("./reporter");

// ─── Parse GitHub URL ─────────────────────────────────────────────────────────
function parseGitHubRepo(input) {
  // Accept: https://github.com/owner/repo OR owner/repo
  const httpsMatch = input.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };

  const shortMatch = input.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };

  return null;
}

// ─── Fetch Commits from GitHub API ───────────────────────────────────────────
async function fetchCommits(owner, repo, count = 20) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${count}`;

  try {
    const res = await axios.get(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "commit-linter-cli"
      }
    });
    return res.data.map(c => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0].trim() // Only first line of commit message
    }));
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found. Is it public?`);
    }
    if (err.response?.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Wait a minute and try again, or add a token.");
    }
    throw new Error(`GitHub API error: ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const input = process.argv[2];

  if (!input || input === "--help" || input === "-h") {
    console.log();
    console.log(chalk.bold.cyan("  Commit Message Linter"));
    console.log(chalk.gray("  Scores the last 20 commits of any public GitHub repo\n"));
    console.log(chalk.bold("  Usage:"));
    console.log("    node index.js <github-url-or-owner/repo>\n");
    console.log(chalk.bold("  Examples:"));
    console.log("    node index.js https://github.com/facebook/react");
    console.log("    node index.js torvalds/linux");
    console.log("    node index.js microsoft/vscode\n");
    process.exit(0);
  }

  const parsed = parseGitHubRepo(input);
  if (!parsed) {
    console.error(chalk.red(`\n  ✖ Invalid input: "${input}"`));
    console.error(chalk.gray("  Expected: https://github.com/owner/repo  OR  owner/repo\n"));
    process.exit(1);
  }

  const { owner, repo } = parsed;

  console.log(chalk.gray(`\n  Fetching commits for ${chalk.white(`${owner}/${repo}`)}...`));

  let commits;
  try {
    commits = await fetchCommits(owner, repo, 20);
  } catch (err) {
    console.error(chalk.red(`\n  ✖ ${err.message}\n`));
    process.exit(1);
  }

  if (!commits.length) {
    console.error(chalk.red("\n  ✖ No commits found in this repository.\n"));
    process.exit(1);
  }

  const repoUrl = `https://github.com/${owner}/${repo}`;
  printHeader(repoUrl);

  const results = commits.map((c, i) => {
    const result = scoreCommit(c.message);
    printCommitResult(result, i, c.sha);
    return result;
  });

  printSummary(results);
}

main();