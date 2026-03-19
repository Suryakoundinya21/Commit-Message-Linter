// scorer.js — Scoring logic for commit messages

const VAGUE_WORDS = [
  "fix", "fixes", "fixed", "fixing",
  "update", "updated", "updates", "updating",
  "misc", "miscellaneous",
  "wip", "work in progress",
  "changes", "change", "changed",
  "stuff", "things", "tweaks", "tweak",
  "edit", "edits", "edited",
  "minor", "small", "quick",
  "temp", "temporary",
  "test", "testing"
];

const CONVENTIONAL_PREFIXES = [
  "feat", "fix", "docs", "style", "refactor",
  "perf", "test", "chore", "ci", "build", "revert"
];

/**
 * Score 1: Length Score (0–10)
 * < 10 chars  → 0
 * 10–19 chars → 4
 * 20–49 chars → 10
 * 50–72 chars → 8  (slightly too long)
 * > 72 chars  → 5  (too long, hard to read)
 */
function scoreLengthCriteria(message) {
  const len = message.trim().length;
  let score, note;

  if (len < 10) {
    score = 0;
    note = `Too short (${len} chars) — provides no context`;
  } else if (len < 20) {
    score = 4;
    note = `Short (${len} chars) — could use more detail`;
  } else if (len <= 50) {
    score = 10;
    note = `Ideal length (${len} chars)`;
  } else if (len <= 72) {
    score = 8;
    note = `Slightly long (${len} chars) — consider trimming`;
  } else {
    score = 5;
    note = `Too long (${len} chars) — hard to scan in git log`;
  }

  return { score, note, maxScore: 10 };
}

/**
 * Score 2: Clarity Score (0–10)
 * Penalizes vague words, rewards descriptive messages
 */
function scoreClarityCriteria(message) {
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const foundVague = [];

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (VAGUE_WORDS.includes(clean)) {
      foundVague.push(clean);
    }
  }

  // Check if message is ONLY a vague word or two
  const isAlmostEmpty = words.length <= 2;
  let score, note;

  if (foundVague.length === 0) {
    score = 10;
    note = "Clear and descriptive";
  } else if (foundVague.length === 1 && !isAlmostEmpty) {
    score = 7;
    note = `Contains vague word: "${foundVague[0]}" — add more context`;
  } else if (foundVague.length === 1 && isAlmostEmpty) {
    score = 2;
    note = `Message is just a vague word: "${foundVague[0]}"`;
  } else {
    score = Math.max(0, 4 - (foundVague.length - 2) * 2);
    note = `Multiple vague words: ${foundVague.map(w => `"${w}"`).join(", ")}`;
  }

  return { score, note, maxScore: 10, vagueWords: foundVague };
}

/**
 * Score 3: Conventional Commit Format Score (0–10)
 * Checks for: type(scope): description  OR  type: description
 */
function scoreConventionalCriteria(message) {
  const trimmed = message.trim();

  // Full conventional commit: feat(auth): add login endpoint
  const fullPattern = /^(\w+)\([\w\-/]+\):\s.+/;
  // Simple conventional: feat: add login
  const simplePattern = /^(\w+):\s.+/;

  let score, note, detectedType = null;

  if (fullPattern.test(trimmed)) {
    const match = trimmed.match(/^(\w+)\(/);
    detectedType = match ? match[1].toLowerCase() : null;
    if (CONVENTIONAL_PREFIXES.includes(detectedType)) {
      score = 10;
      note = `Follows conventional format with scope: ${detectedType}(scope): ...`;
    } else {
      score = 6;
      note = `Has scope format but non-standard type: "${detectedType}"`;
    }
  } else if (simplePattern.test(trimmed)) {
    const match = trimmed.match(/^(\w+):/);
    detectedType = match ? match[1].toLowerCase() : null;
    if (CONVENTIONAL_PREFIXES.includes(detectedType)) {
      score = 8;
      note = `Follows conventional format: ${detectedType}: ...`;
    } else {
      score = 5;
      note = `Has colon format but non-standard type: "${detectedType}"`;
    }
  } else {
    score = 0;
    note = "No conventional prefix (feat/fix/docs/chore/etc.) found";
  }

  return { score, note, maxScore: 10, detectedType };
}

/**
 * Main scorer — returns full breakdown for a commit message
 */
function scoreCommit(message) {
  const length = scoreLengthCriteria(message);
  const clarity = scoreClarityCriteria(message);
  const conventional = scoreConventionalCriteria(message);

  const totalScore = length.score + clarity.score + conventional.score;
  const maxPossible = length.maxScore + clarity.maxScore + conventional.maxScore;
  const percentage = Math.round((totalScore / maxPossible) * 100);

  return {
    message,
    totalScore,
    maxPossible,
    percentage,
    grade: getGrade(percentage),
    criteria: { length, clarity, conventional }
  };
}

function getGrade(pct) {
  if (pct >= 90) return { letter: "A", label: "Excellent" };
  if (pct >= 75) return { letter: "B", label: "Good" };
  if (pct >= 55) return { letter: "C", label: "Fair" };
  if (pct >= 35) return { letter: "D", label: "Poor" };
  return { letter: "F", label: "Very Poor" };
}

module.exports = { scoreCommit };