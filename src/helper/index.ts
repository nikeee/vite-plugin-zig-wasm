import * as fs from "node:fs";
import { dirname, join } from "node:path";

import semver from "semver";

export * from "./vite.ts";

export function indexOfAny(s: string, charList: string) {
  for (let i = 0; i < charList.length; ++i) {
    const index = s.indexOf(charList[i]);
    if (index !== -1) {
      return index;
    }
  }
  return null;
}

function cleanVersion(zigVersion: string): string {
  const extraIndex = indexOfAny(zigVersion, "-+");
  const version = zigVersion.substring(0, extraIndex ?? zigVersion.length);
  return version;
}

export function ensureZigVersion(zigVersion: string, range: string): void {
  const version = cleanVersion(zigVersion);
  if (!semver.satisfies(version, range)) {
    throw new Error(
      `Require zig version ${range} but current installed version is ${version}`,
    );
  }
}

export function lookupFile(dir: string, files: string[]): string | undefined {
  for (const file of files) {
    const fullPath = join(dir, file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  const parentDir = dirname(dir);
  if (parentDir !== dir) {
    return lookupFile(parentDir, files);
  }

  return undefined;
}
