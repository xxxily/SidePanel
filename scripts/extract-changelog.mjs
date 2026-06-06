import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const [, , version, changelogPath = 'CHANGELOG.md', outputPath = 'release-notes.md'] = process.argv;

if (!version) {
  console.error('Usage: node scripts/extract-changelog.mjs <version> [changelog] [output]');
  process.exit(1);
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const changelog = await readFile(changelogPath, 'utf8');
const lines = changelog.split(/\r?\n/);
const heading = new RegExp(`^##\\s+v?${escapeRegExp(version)}(?:\\s|$|[-:])`);

let start = -1;
let end = lines.length;

for (let index = 0; index < lines.length; index += 1) {
  if (heading.test(lines[index].trim())) {
    start = index;
    break;
  }
}

if (start === -1) {
  console.error(`No CHANGELOG entry found for version ${version} in ${basename(changelogPath)}.`);
  console.error(`Add a section like "## ${version} - YYYY-MM-DD" before publishing.`);
  process.exit(1);
}

for (let index = start + 1; index < lines.length; index += 1) {
  if (/^##\s+/.test(lines[index].trim())) {
    end = index;
    break;
  }
}

const notes = lines.slice(start, end).join('\n').trim();

if (!notes) {
  console.error(`CHANGELOG entry for version ${version} is empty.`);
  process.exit(1);
}

await writeFile(outputPath, `${notes}\n`);
