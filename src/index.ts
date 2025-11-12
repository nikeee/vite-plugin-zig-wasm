import * as path from "node:path";
import * as fs from "node:fs/promises";

import type { Plugin } from "vite";
import { sync as spawnSync } from "cross-spawn";
import which from "which";
import {
  fsPathFromUrl,
  cleanUrl,
  getHash,
  normalizePath,
  ensureZigVersion,
} from "./helper/index.ts";

import type { Options } from "./types.ts";
import {
  buildArguments,
  getEffectiveOptions,
  type DeepRequired,
} from "./options.ts";

const compileSuffix = ".zig?compile";
const instanciateSuffix = ".zig?init";

function getZigVersion(binPath: string) {
  const versionCmd = spawnSync(binPath, ["version"]);
  if (versionCmd.error) {
    throw new Error(`Failed when execute "${binPath} version" command.`);
  }
  return versionCmd.stdout.toString().trim();
}

export default function zigWasmPlugin(options: Options = {}): Plugin {
  const optionsWithDefaults = getEffectiveOptions(options);
  const zigBinPath = which.sync(optionsWithDefaults.zig.binPath ?? "zig");

  const version = getZigVersion(zigBinPath);
  ensureZigVersion(version, ">= 0.15.0");

  let resolvedOptions: DeepRequired<Options> | undefined;
  return {
    name: "vite-plugin-zig-wasm",
    async transform(_code, id, options) {
      if (resolvedOptions === undefined) {
        // configResolved has not been called, we're running in rolldown
        return;
      }

      if (!id.endsWith(compileSuffix) && !id.endsWith(instanciateSuffix)) {
        return;
      }

      const useInternalInstance = id.endsWith(instanciateSuffix);

      const filePath = fsPathFromUrl(id);

      const hash = getHash(cleanUrl(id));
      const uniqWasmName = `${path.basename(filePath, ".zig")}.${hash}.wasm`;
      const wasmPath = path.join(resolvedOptions.cacheDir, uniqWasmName);

      const args = buildArguments(resolvedOptions, filePath, wasmPath);
      this.debug(`Building zig (using v${version}): ${args.join(" ")}`);

      const result = spawnSync(zigBinPath, args, { stdio: "inherit" });

      if (result.error) {
        throw result.error;
      }

      if (useInternalInstance) {
        return {
          code: options?.ssr
            ? `
import * as fs from "node:fs/promises";

export default async function init(instantiateOptions) {
  const bytes = await fs.readFile('${normalizePath(wasmPath)}');
  const result = await WebAssembly.instantiate(bytes, instantiateOptions);
  return result.instance;
}`
            : `
import init from '${normalizePath(wasmPath)}?init';
export default init;`,
          map: { mappings: "" },
        };
      }

      return {
        code: options?.ssr
          ? `
import * as fs from "node:fs/promises";

export default async function compileModule() {
  const bytes = await fs.readFile("${normalizePath(wasmPath)}");
  return await WebAssembly.compile(bytes);
}`
          : `
import moduleUrl from "${normalizePath(wasmPath)}?url";
export default async function compileModule() {
  return await WebAssembly.compileStreaming(fetch(moduleUrl));
}`,
        map: { mappings: "" },
      };
    },

    configResolved: async config => {
      const resolvedCacheDir = options.cacheDir
        ? path.resolve(config.root, options.cacheDir)
        : path.join(config.root, "node_modules/.vite-plugin-zig-wasm");

      const resolvedZigCacheDir = options.zig?.cacheDir
        ? path.join(config.root, options.zig?.cacheDir)
        : path.join(resolvedCacheDir, "zig-cache");

      await fs.mkdir(resolvedCacheDir, { recursive: true });
      await fs.mkdir(resolvedZigCacheDir, { recursive: true });

      resolvedOptions = {
        ...optionsWithDefaults,
        cacheDir: resolvedCacheDir,
        zig: { ...optionsWithDefaults.zig, cacheDir: resolvedZigCacheDir },
      };
    },
  };
}
