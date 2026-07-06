import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outputPath = process.env.GITHUB_OUTPUT;
if (!outputPath) {
  throw new Error("GITHUB_OUTPUT is required to write release notes output.");
}

const root = process.cwd();
const notesPath = path.join(root, ".github", "release-notes.md");
const fallbackBody = "Monster Tools native desktop release.";
const rawBody = fs.existsSync(notesPath) ? fs.readFileSync(notesPath, "utf8") : fallbackBody;
const body = rawBody.endsWith("\n") ? rawBody : `${rawBody}\n`;

let delimiter = "";
do {
  delimiter = `MONSTER_RELEASE_NOTES_${crypto.randomUUID()}`;
} while (body.split(/\r?\n/).includes(delimiter));

fs.appendFileSync(outputPath, `body<<${delimiter}\n${body}${delimiter}\n`, "utf8");
