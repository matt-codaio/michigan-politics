/**
 * Writes ~/Applications/Michigan Voting Explorer.app so Spotlight / Dock
 * can launch this repo's Electron app without Terminal or Chrome.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPS_DIR = path.join(os.homedir(), "Applications");
const DEST = path.join(APPS_DIR, "Michigan Voting Explorer.app");

const npmCli = process.env.npm_execpath;
const nodeBin = process.execPath;
if (!npmCli) {
  console.error("Run this with npm run install:app so npm's path is known.");
  process.exitCode = 1;
  process.exit();
}

function asLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

fs.mkdirSync(APPS_DIR, { recursive: true });

const logFile = path.join(os.tmpdir(), "michigan-voting-explorer.log");
const script = [
  `set repo to ${asLiteral(REPO_ROOT)}`,
  `set nodeBin to ${asLiteral(nodeBin)}`,
  `set npmCli to ${asLiteral(npmCli)}`,
  `set logFile to ${asLiteral(logFile)}`,
  'do shell script "cd " & quoted form of repo & " && " & quoted form of nodeBin & " " & quoted form of npmCli & " start >" & quoted form of logFile & " 2>&1 &"',
].join("\n");

const scriptPath = path.join(os.tmpdir(), "mi-explorer-launcher.applescript");
fs.writeFileSync(scriptPath, script);

if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}

execFileSync("osacompile", ["-o", DEST, scriptPath]);
fs.unlinkSync(scriptPath);

console.log(`Installed ${DEST}`);
console.log("Open it from Spotlight or drag it to the Dock. Data still lives in this repo's local/ folder.");
