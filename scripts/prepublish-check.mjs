import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = ["README.md", "LICENSE", "PRIVACY.md", ".env.example", ".gitignore", "package.json"];
const sensitivePaths = [".env", ".env.local", "storage", "public/generated", ".next", "node_modules"];
const ignoredDirs = new Set([".git", ".next", "node_modules", "storage", "public/generated"]);
const textExtensions = new Set([
  ".bat",
  ".css",
  ".example",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function runGit(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function isGitRepo() {
  return Boolean(runGit(["rev-parse", "--show-toplevel"]));
}

async function walk(dir, output = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relative = rel(full);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(relative) || ignoredDirs.has(entry.name)) continue;
      await walk(full, output);
    } else {
      output.push(full);
    }
  }
  return output;
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
const warnings = [];

for (const file of requiredFiles) {
  assert(existsSync(path.join(root, file)), `Missing required file: ${file}`, failures);
}

const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
for (const item of [".env.local", "storage", "public/generated", "node_modules", ".next"]) {
  assert(gitignore.includes(item), `.gitignore does not mention ${item}`, failures);
}

if (isGitRepo()) {
  const tracked = runGit(["ls-files"]).split(/\r?\n/).filter(Boolean);
  for (const item of sensitivePaths) {
    const normalized = item.replaceAll("\\", "/");
    const found = tracked.filter((file) => file === normalized || file.startsWith(`${normalized}/`));
    assert(found.length === 0, `Sensitive path is tracked by git: ${found.join(", ")}`, failures);
  }
} else {
  warnings.push("Git repository is not initialized yet; tracked-file checks were skipped.");
}

const suspiciousPatterns = [
  { name: "OpenAI-style secret key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub token", pattern: /\bgh[opsu]_[A-Za-z0-9_]{30,}\b/g },
  { name: "Non-empty OPENAI_API_KEY assignment", pattern: /^OPENAI_API_KEY[ \t]*=[ \t]*[^\s#]+/gm },
  { name: "Non-empty ZHIPU_API_KEY assignment", pattern: /^ZHIPU_API_KEY[ \t]*=[ \t]*[^\s#]+/gm },
  { name: "Zhipu key-like token", pattern: /\b[A-Fa-f0-9]{32}\.[A-Za-z0-9_-]{8,}\b/g },
];

for (const file of await walk(root)) {
  const relative = rel(file);
  const extension = path.extname(file);
  if (!textExtensions.has(extension) && !relative.endsWith(".env.example")) continue;
  if (statSync(file).size > 1024 * 1024) continue;
  const text = readFileSync(file, "utf8");

  for (const item of suspiciousPatterns) {
    const matches = [...text.matchAll(item.pattern)];
    const meaningful = matches.filter((match) => {
      const value = match[0];
      if (relative === ".env.example" && value.endsWith("=")) return false;
      if (/你的|your|example|placeholder/i.test(value)) return false;
      if (/OPENAI_API_KEY=$|ZHIPU_API_KEY=$/.test(value)) return false;
      return true;
    });
    if (meaningful.length) {
      failures.push(`Possible secret in ${relative}: ${item.name}`);
    }
  }
}

if (failures.length) {
  console.error("\nPrepublish check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Prepublish check passed.");
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
