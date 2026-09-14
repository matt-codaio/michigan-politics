import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePollsFile } from "../src/polls/validate.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pollsPath =
  process.argv[2] ?? path.join(repoRoot, "local", "polls", "polls.json");

if (!fs.existsSync(pollsPath)) {
  console.error(`Missing ${pollsPath}. Run npm run seed:polls first.`);
  process.exit(1);
}

const raw = fs.readFileSync(pollsPath, "utf8");
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch {
  console.error(`${pollsPath} is not valid JSON.`);
  process.exit(1);
}

const result = validatePollsFile(parsed);
for (const warning of result.warnings) {
  console.warn(`warning: ${warning}`);
}
if (!result.ok) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}

console.log(`OK ${result.polls.length} poll(s) in ${path.relative(repoRoot, pollsPath)}`);
