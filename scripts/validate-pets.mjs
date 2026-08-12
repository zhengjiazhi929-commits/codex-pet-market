#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const petsRoot = path.join(root, "pets");
const allowedFiles = new Set(["pet.json", "market.json", "spritesheet.webp", "preview.gif", "README.md", "LICENSE-ASSETS.md"]);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hashPattern = /^[a-f0-9]{64}$/;
const maxPetBytes = 15 * 1024 * 1024;
const maxAtlasBytes = 8 * 1024 * 1024;
const errors = [];

function fail(id, message) {
  errors.push(`${id}: ${message}`);
}

async function json(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${error.message}`);
  }
}

function uint24le(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function inspectWebp(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("spritesheet.webp is not a RIFF WebP file");
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (chunk === "VP8X" && size >= 10 && data + 10 <= buffer.length) {
      return {
        width: 1 + uint24le(buffer, data + 4),
        height: 1 + uint24le(buffer, data + 7),
        alpha: Boolean(buffer[data] & 0x10)
      };
    }
    if (chunk === "VP8L" && size >= 5 && data + 5 <= buffer.length) {
      if (buffer[data] !== 0x2f) throw new Error("spritesheet.webp has an invalid VP8L signature");
      const bits = buffer.readUInt32LE(data + 1);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
        alpha: Boolean((bits >>> 28) & 1),
        lossless: true
      };
    }
    offset = data + size + (size % 2);
  }
  throw new Error("spritesheet.webp must use VP8X or lossless VP8L WebP metadata");
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

for (const dirent of await readdir(petsRoot, { withFileTypes: true })) {
  const id = dirent.name;
  if (!dirent.isDirectory()) {
    fail(id, "pets/ may contain directories only");
    continue;
  }
  if (!idPattern.test(id)) fail(id, "directory ID must use lowercase letters, digits, and single hyphens");
  const petDir = path.join(petsRoot, id);
  const files = await readdir(petDir, { withFileTypes: true });
  let totalBytes = 0;
  for (const entry of files) {
    const full = path.join(petDir, entry.name);
    const info = await lstat(full);
    if (info.isSymbolicLink()) fail(id, `${entry.name} may not be a symlink`);
    if (!entry.isFile()) fail(id, `${entry.name} must be a regular file`);
    if (!allowedFiles.has(entry.name)) fail(id, `${entry.name} is not allowed in a pet directory`);
    totalBytes += info.size;
  }
  for (const required of allowedFiles) {
    if (!files.some((entry) => entry.name === required)) fail(id, `missing ${required}`);
  }
  if (totalBytes > maxPetBytes) fail(id, `package exceeds ${maxPetBytes} bytes`);

  try {
    const pet = await json(path.join(petDir, "pet.json"));
    const market = await json(path.join(petDir, "market.json"));
    if (pet.id !== id || market.id !== id) fail(id, "IDs in directory, pet.json, and market.json must match");
    if (typeof pet.displayName !== "string" || !pet.displayName.trim()) fail(id, "displayName is required");
    if (typeof pet.description !== "string" || !pet.description.trim()) fail(id, "description is required");
    if (pet.spriteVersionNumber !== 2) fail(id, "spriteVersionNumber must be 2");
    if (pet.spritesheetPath !== "spritesheet.webp") fail(id, "spritesheetPath must be exactly spritesheet.webp");
    if (market.author !== "Zhengjiazhi" && (typeof market.author !== "string" || !market.author.trim())) fail(id, "author is required");
    if (typeof market.assetLicense !== "string" || !market.assetLicense.trim()) fail(id, "assetLicense is required");
    if (!Array.isArray(market.tags) || market.tags.length < 1 || market.tags.some((tag) => typeof tag !== "string" || !tag.trim())) fail(id, "tags must be a non-empty string array");

    const atlasPath = path.join(petDir, "spritesheet.webp");
    const atlas = await readFile(atlasPath);
    const dimensions = inspectWebp(atlas);
    if (atlas.length > maxAtlasBytes) fail(id, `spritesheet exceeds ${maxAtlasBytes} bytes`);
    if (dimensions.width !== 1536 || dimensions.height !== 2288) fail(id, `spritesheet must be 1536x2288, got ${dimensions.width}x${dimensions.height}`);
    if (!dimensions.alpha) fail(id, "spritesheet must declare an alpha channel");
    if (market.spriteVersionNumber !== 2) fail(id, "market spriteVersionNumber must be 2");
    if (market.atlas?.width !== 1536 || market.atlas?.height !== 2288 || market.atlas?.columns !== 8 || market.atlas?.rows !== 11 || market.atlas?.cellWidth !== 192 || market.atlas?.cellHeight !== 208) {
      fail(id, "market atlas metadata must be 1536x2288, 8x11, cell 192x208");
    }
    for (const key of ["spritesheet", "preview"]) {
      if (!hashPattern.test(market.sha256?.[key] ?? "")) fail(id, `market sha256.${key} must be 64 lowercase hex characters`);
      if (!Number.isSafeInteger(market.bytes?.[key]) || market.bytes[key] < 1) fail(id, `market bytes.${key} must be a positive integer`);
    }
    const previewPath = path.join(petDir, "preview.gif");
    const preview = await readFile(previewPath);
    if (market.sha256?.spritesheet !== await sha256(atlasPath)) fail(id, "spritesheet SHA-256 does not match market.json");
    if (market.sha256?.preview !== await sha256(previewPath)) fail(id, "preview SHA-256 does not match market.json");
    if (market.bytes?.spritesheet !== atlas.length) fail(id, "spritesheet byte size does not match market.json");
    if (market.bytes?.preview !== preview.length) fail(id, "preview byte size does not match market.json");
    if (preview.toString("ascii", 0, 6) !== "GIF89a" && preview.toString("ascii", 0, 6) !== "GIF87a") fail(id, "preview.gif is not a GIF");
  } catch (error) {
    fail(id, error.message);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("All Codex pet packages passed validation.");
