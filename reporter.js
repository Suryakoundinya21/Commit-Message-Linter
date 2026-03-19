// reporter.js — Terminal output formatter (uses chalk v4 for CommonJS)

const chalk = require("chalk");

const BAR_WIDTH = 20;

function makeBar(score, max) {
  const filled = Math.round((score / max) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function gradeColor(letter) {
  if (letter === "A") return chalk.bgGreen.black;
  if (letter === "B") return chalk.bgCyan.black;
  if (letter === "C") return chalk.bgYellow.black;
  if (letter === "D") return chalk.bgRed.white;
  return chalk.bgRed.white.bold;
}

function criteriaIcon(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 80) return chalk.green("✔");
  if (pct >= 50) return chalk.yellow("⚠");
  return chalk.red("✖");
}

function printHeader(repoUrl) {
  console.log();
  console.log(chalk.bold.cyan("╔══════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║        COMMIT MESSAGE LINTER — HEALTH REPORT         ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════════╝"));
  console.log(chalk.gray(`  Repository: ${repoUrl}`));
  console.log(chalk.gray(`  Analyzed:   Last 20 commits`));
  console.log(chalk.gray(`  Date:       ${new Date().toLocaleString()}`));
  console.log();
}

function printCommitResult(result, index, sha) {
  const { message, totalScore, maxPossible, percentage, grade, criteria } = result;
  const shortSha = sha ? sha.slice(0, 7) : "unknown";
  const gColor = gradeColor(grade.letter);

  // Truncate long messages for display
  const displayMsg = message.length > 60
    ? message.slice(0, 57) + "..."
    : message;

  console.log(chalk.bold(`  #${String(index + 1).padStart(2, "0")}  `) +
    chalk.yellow(`[${shortSha}]`) +
    "  " +
    gColor(` ${grade.letter} `) +
    "  " +
    chalk.white(`"${displayMsg}"`));

  console.log(`        Score: ${makeBar(totalScore, maxPossible)} ${chalk.bold(totalScore)}/${maxPossible} (${percentage}%) — ${chalk.italic(grade.label)}`);

  // Criteria breakdown
  const { length, clarity, conventional } = criteria;
  console.log(
    `        ${criteriaIcon(length.score, length.maxScore)} Length     (${String(length.score).padStart(2)}/${length.maxScore}): ${chalk.gray(length.note)}`
  );
  console.log(
    `        ${criteriaIcon(clarity.score, clarity.maxScore)} Clarity    (${String(clarity.score).padStart(2)}/${clarity.maxScore}): ${chalk.gray(clarity.note)}`
  );
  console.log(
    `        ${criteriaIcon(conventional.score, conventional.maxScore)} Convention (${String(conventional.score).padStart(2)}/${conventional.maxScore}): ${chalk.gray(conventional.note)}`
  );
  console.log();
}

function printSummary(results) {
  const total = results.length;
  const avgPct = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / total);
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach(r => grades[r.grade.letter]++);

  // Worst and best commit
  const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Overall health label
  let healthLabel, healthColor;
  if (avgPct >= 85) { healthLabel = "EXCELLENT 🏆"; healthColor = chalk.green.bold; }
  else if (avgPct >= 70) { healthLabel = "GOOD 👍"; healthColor = chalk.cyan.bold; }
  else if (avgPct >= 50) { healthLabel = "FAIR ⚠️"; healthColor = chalk.yellow.bold; }
  else if (avgPct >= 30) { healthLabel = "POOR 👎"; healthColor = chalk.red.bold; }
  else { healthLabel = "CRITICAL 🔴"; healthColor = chalk.red.bold; }

  console.log(chalk.bold.cyan("╔══════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║                  REPOSITORY SUMMARY                  ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════════╝"));
  console.log();

  console.log(`  Overall Health Score: ${makeBar(avgPct, 100)} ${chalk.bold(avgPct + "%")} — ${healthColor(healthLabel)}`);
  console.log();

  console.log(chalk.bold("  Grade Distribution:"));
  const gradeLetters = ["A", "B", "C", "D", "F"];
  gradeLetters.forEach(g => {
    const count = grades[g];
    const bar = "■".repeat(count);
    const color = gradeColor(g);
    console.log(`    ${color(` ${g} `)}  ${chalk.bold(String(count).padStart(2))} commits  ${chalk.gray(bar)}`);
  });

  console.log();
  console.log(chalk.bold("  🏅 Best Commit:"));
  console.log(`     "${best.message.slice(0, 65)}" — ${chalk.green(best.percentage + "%")}`);
  console.log();
  console.log(chalk.bold("  ⚠️  Worst Commit:"));
  console.log(`     "${worst.message.slice(0, 65)}" — ${chalk.red(worst.percentage + "%")}`);
  console.log();

  // Tips
  const lowClarity = results.filter(r => r.criteria.clarity.score < 5).length;
  const lowConvention = results.filter(r => r.criteria.conventional.score < 5).length;
  const lowLength = results.filter(r => r.criteria.length.score < 5).length;

  if (lowClarity > 0 || lowConvention > 0 || lowLength > 0) {
    console.log(chalk.bold.yellow("  💡 Improvement Tips:"));
    if (lowConvention > 0)
      console.log(chalk.yellow(`     • ${lowConvention} commit(s) missing conventional prefix — use feat/fix/docs/chore/etc.`));
    if (lowClarity > 0)
      console.log(chalk.yellow(`     • ${lowClarity} commit(s) use vague words — describe the WHY, not just the WHAT`));
    if (lowLength > 0)
      console.log(chalk.yellow(`     • ${lowLength} commit(s) are too short — aim for 20–50 characters`));
    console.log();
  }

  console.log(chalk.bold.cyan("══════════════════════════════════════════════════════"));
  console.log();
}

module.exports = { printHeader, printCommitResult, printSummary };