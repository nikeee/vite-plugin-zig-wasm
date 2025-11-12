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
  lookupFile,
} from "./helper/index.ts";

import type { Options } from "./types.ts";

const compileSuffix = ".zig?compile";
const instanciateSuffix = ".zig?init";

export default function zigWasmPlugin(options: Options = {}): Plugin {
  const {
    cacheDir,
    zig = {},
    optimize = false,
    cpu: cpuOptions,
    memory: memoryOptions = {},
  } = options;

  const {
    releaseMode = "ReleaseFast",
    strip = false,
    extraArgs = [],
    binPath,
    cacheDir: zigCacheDir,
  } = zig;

  const zigBinPath = which.sync(binPath ?? "zig");
  const versionCmd = spawnSync(zigBinPath, ["version"]);
  if (versionCmd.error) {
    throw new Error(`failed when execute "${zigBinPath} version" command.`);
  }

  const version = versionCmd.stdout.toString();

  const wasmOptPath = optimize
    ? which.sync("wasm-opt", { nothrow: true })
    : false;

  if (wasmOptPath === null) {
    throw new Error(
      "Can't enable wasm optimize option, wasm-opt command not found. Make sure `wasm-opt` in your $PATH.",
    );
  }

  ensureZigVersion(version, ">= 0.9.0");

  let resolvedCacheDir: string;
  let resolvedZigCacheDir: string;
  return {
    name: "vite-plugin-zig-wasm",
    async transform(_code, id, options) {
      if (!id.endsWith(compileSuffix) && !id.endsWith(instanciateSuffix)) {
        return;
      }

      const useInternalInstance = id.endsWith(instanciateSuffix);

      const filePath = fsPathFromUrl(id);

      const hash = getHash(cleanUrl(id));
      const uniqWasmName = `${path.basename(filePath, ".zig")}.${hash}.wasm`;
      const wasmPath = path.join(resolvedCacheDir, uniqWasmName);

      const cpu = getMcpuOption(cpuOptions ?? {});

      const args = [
        "build-exe",
        "-target",
        "wasm32-freestanding",
        "-fno-entry",
        "-rdynamic",

        cpu ? `-mcpu=${cpu}` : undefined,

        memoryOptions.importMemory ? "--import-memory" : undefined,

        memoryOptions.globalBase
          ? `--global-base=${memoryOptions.globalBase}`
          : undefined,
        memoryOptions.initialMemory
          ? `--initial-memory=${memoryOptions.initialMemory}`
          : undefined,
        memoryOptions.maxMemory
          ? `--max-memory=${memoryOptions.maxMemory}`
          : undefined,

        `-femit-bin=${wasmPath}`,
        "-O",
        releaseMode,
        "--cache-dir",
        resolvedZigCacheDir,
        strip ? "--strip" : undefined,
        ...extraArgs,
        filePath,
      ];

      const effectiveArgs = args
        .filter(a => typeof a !== "undefined")
        .filter(a => !!a);

      this.debug(
        `Building zig (using v${version}): ${effectiveArgs.join(" ")}`,
      );

      const result = spawnSync(zigBinPath, effectiveArgs, { stdio: "inherit" });

      if (result.error) {
        throw result.error;
      }

      if (wasmOptPath) {
        const optimizedFile = path.join(
          resolvedCacheDir,
          `wasm-optimized.${uniqWasmName}`,
        );

        const args = ["-o", optimizedFile];
        const extraArgs = Array.isArray(optimize)
          ? optimize
          : ["-Oz", "--strip-debug"];

        const result = spawnSync(
          wasmOptPath,
          [wasmPath, ...args, ...extraArgs],
          { stdio: "inherit" },
        );

        if (result.error) throw result.error;
        await fs.rename(optimizedFile, wasmPath);
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
      const pkgPath = lookupFile(config.root, ["package.json"]);
      resolvedCacheDir = cacheDir
        ? path.resolve(config.root, cacheDir)
        : pkgPath
          ? path.join(
              path.dirname(pkgPath),
              "node_modules/.vite-plugin-zig-wasm",
            )
          : path.join(config.root, ".vite-plugin-zig-wasm");

      resolvedZigCacheDir = zigCacheDir
        ? path.join(config.root, zigCacheDir)
        : path.join(resolvedCacheDir, "zig-cache");

      await fs.mkdir(resolvedZigCacheDir, { recursive: true });
    },
  };
}
