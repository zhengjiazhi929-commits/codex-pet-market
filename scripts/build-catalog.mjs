#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const petsRoot = path.join(root, "pets");
const catalogPath = path.join(root, "catalog.json");

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function fileRecord(file) {
  const bytes = await readFile(file);
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

const entries = [];
for (const dirent of (await readdir(petsRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!dirent.isDirectory()) continue;
  const petDir = path.join(petsRoot, dirent.name);
  const pet = await json(path.join(petDir, "pet.json"));
  const market = await json(path.join(petDir, "market.json"));
  const spritesheet = await fileRecord(path.join(petDir, "spritesheet.webp"));
  const preview = await fileRecord(path.join(petDir, "preview.gif"));
  entries.push({
    id: pet.id,
    displayName: pet.displayName,
    description: pet.description,
    spriteVersionNumber: pet.spriteVersionNumber,
    author: market.author,
    assetLicense: market.assetLicense,
    tags: market.tags,
    files: { pet: "pet.json", spritesheet: "spritesheet.webp", preview: "preview.gif" },
    sha256: { spritesheet: spritesheet.sha256, preview: preview.sha256 },
    bytes: { spritesheet: spritesheet.bytes, preview: preview.bytes }
  });
}

const catalog = {
  schemaVersion: 1,
  pets: entries
};
const output = `${JSON.stringify(catalog, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(catalogPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("catalog.json is stale. Run: npm run catalog");
    process.exit(1);
  }
  console.log(`catalog.json is current (${entries.length} pet${entries.length === 1 ? "" : "s"}).`);
} else {
  await writeFile(catalogPath, output);
  console.log(`Wrote catalog.json (${entries.length} pet${entries.length === 1 ? "" : "s"}).`);
}
