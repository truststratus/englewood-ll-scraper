import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import pLimit from "p-limit";

export const ROOT = process.cwd();
export const SNAP_DIR = path.join(ROOT, "snapshots");
export const limit = pLimit(1); // 1 request at a time (polite & safe)

export function hash(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 10);
}

export function toSnapshotPath(urlObj) {
  // Save by host + hashed path to avoid super long filenames
  const host = urlObj.host.replace(/[^a-z0-9.-]/gi, "_");
  const cleanPath = urlObj.pathname + (urlObj.search || "");
  const filename = `${hash(cleanPath)}.html`;
  return path.join(SNAP_DIR, host, filename);
}

export async function saveSnapshot(filePath, html) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, html, "utf8");
}
