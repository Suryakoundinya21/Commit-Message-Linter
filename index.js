#!/usr/bin/env node
// index.js — Commit Message Linter CLI

const axios = require("axios");
const chalk = require("chalk");
const { scoreCommit } = require("./scorer");
const { printHeader, printCommitResult, printSummary } = require("./reporter");

function parseGitHubRepo(input) {
  const httpsMatch = input.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };
  const shortMatch = input.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };
  return null;
}

async function fetchCommits(owner, repo, count = 20) {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${count}`;
  try {
    const res = await axios.get(url, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "commit-linter-cli" }
    });
    return res.data.map(c => ({ sha: c.sha, message: c.commit.message.split("\n")[0].trim() }));
  } catch (err) {
    if (err.response?.status === 404) throw new Error(`Repository not found. Is it public?`);
    if (err.response?.status === 403) throw new Error("GitHub API rate limit exceeded.");
    throw new Error(`GitHub API error: ${err.message}`);
  }
}

function buildJsonReport(repoUrl, commits, results) {
  const avgPercentage = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length);
  let healthLabel;
  if (avgPercentage >= 85) healthLabel = "EXCELLENT";
  else if (avgPercentage >= 70) healthLabel = "GOOD";
  else if (avgPercentage >= 50) healthLabel = "FAIR";
  else if (avgPercentage >= 30) healthLabel = "POOR";
  else healthLabel = "CRITICAL";

  return {
    repository: repoUrl,
    analysisDate: new Date().toISOString(),
    commits: commits.map((c, i) => {
      const r = results[i];
      return {
        sha: c.sha,
        message: c.message,
        score: r.totalScore,
        maxScore: r.maxPossible,
        percentage: r.percentage,
        grade: { letter: r.grade.letter, label: r.grade.label },
        criteria: {
          length: { score: r.criteria.length.score, maxScore: r.criteria.length.maxScore, note: r.criteria.length.note },
          clarity: { score: r.criteria.clarity.score, maxScore: r.criteria.clarity.maxScore, note: r.criteria.clarity.note, vagueWords: r.criteria.clarity.vagueWords || [] },
          conventional: { score: r.criteria.conventional.score, maxScore: r.criteria.conventional.maxScore, note: r.criteria.conventional.note, detectedType: r.criteria.conventional.detectedType || null }
        }
      };
    }),
    overall: { averagePercentage: avgPercentage, healthLabel }
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const input = args.find(a => !a.startsWith("--"));

  if (!input || input === "--help" || input === "-h") {
    console.log();
    console.log(chalk.bold.cyan("  Commit Message Linter"));
    console.log(chalk.gray("  Scores the last 20 commits of any public GitHub repo\n"));
    console.log(chalk.bold("  Usage:"));
    console.log("    node index.js <github-url-or-owner/repo> [--json]\n");
    console.log(chalk.bold("  Examples:"));
    console.log("    node index.js https://github.com/facebook/react");
    console.log("    node index.js microsoft/vscode --json\n");
    process.exit(0);
  }

  const parsed = parseGitHubRepo(input);
  if (!parsed) {
    console.error(chalk.red(`\n  ✖ Invalid input: "${input}"\n`));
    process.exit(1);
  }

  const { owner, repo } = parsed;
  if (!jsonMode) console.log(chalk.gray(`\n  Fetching commits for ${chalk.white(`${owner}/${repo}`)}...`));

  let commits;
  try {
    commits = await fetchCommits(owner, repo, 20);
  } catch (err) {
    jsonMode ? console.error(JSON.stringify({ error: err.message })) : console.error(chalk.red(`\n  ✖ ${err.message}\n`));
    process.exit(1);
  }

  if (!commits.length) {
    jsonMode ? console.error(JSON.stringify({ error: "No commits found." })) : console.error(chalk.red("\n  ✖ No commits found.\n"));
    process.exit(1);
  }

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const results = commits.map(c => scoreCommit(c.message));

  if (jsonMode) {
    process.stdout.write(JSON.stringify(buildJsonReport(repoUrl, commits, results), null, 2) + "\n");
  } else {
    printHeader(repoUrl);
    results.forEach((result, i) => printCommitResult(result, i, commits[i].sha));
    printSummary(results);
  }
}

main();