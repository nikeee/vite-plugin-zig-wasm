import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";

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

function buildZigFile(
  compilerPath: string,
  sourceFilePath: string,
  options: DeepRequired<Options>,
): string {
  const filePath = fsPathFromUrl(sourceFilePath);
  const hash = getHash(cleanUrl(filePath));
  const uniqWasmName = `${path.basename(filePath, ".zig")}.${hash}.wasm`;
  const wasmPath = path.join(options.cacheDir, uniqWasmName);

  const args = buildArguments(options, filePath, wasmPath);

  const result = spawnSync(compilerPath, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  return wasmPath;
}

export default function zigWasmPlugin(options: Options = {}): Plugin {
  const optionsWithDefaults = getEffectiveOptions(options);
  const zigBinPath = which.sync(optionsWithDefaults.zig.binPath ?? "zig");

  const version = getZigVersion(zigBinPath);
  ensureZigVersion(version, ">= 0.15.0");

  let resolvedOptions: DeepRequired<Options> | undefined;
  return {
    name: "vite-plugin-zig-wasm",

    resolveId(source, importer) {
      if (resolvedOptions !== undefined) {
        // configResolved has been called, we're running in vite. Transformation is done in transform
        return;
      }

      if (!importer) {
        return;
      }

      if (
        source.endsWith(compileSuffix) ||
        source.endsWith(instanciateSuffix)
      ) {
        return {
          id: path.join(path.dirname(importer), source),
        };
      }
      return null;
    },

    async load(id) {
      if (resolvedOptions !== undefined) {
        // configResolved has been called, we're running in vite. Transformation is done in transform
        return null;
      }

      if (!id.endsWith(compileSuffix) && !id.endsWith(instanciateSuffix)) {
        return;
      }

      const cacheDir =
        options.cacheDir ??
        (await fs.mkdtemp(path.join(os.tmpdir(), "vite-plugin-zig-wasm-")));

      const rollupOptions = {
        ...optionsWithDefaults,
        cacheDir,
        zig: { ...optionsWithDefaults.zig, cacheDir },
      };

      const fileName = path.basename(id.substring(0, id.indexOf("?")));

      const useInternalInstance = id.endsWith(instanciateSuffix);
      const wasmPath = buildZigFile(zigBinPath, id, rollupOptions);

      const emittedFile = this.emitFile({
        name: fileName,
        originalFileName: fileName,
        source: await fs.readFile(wasmPath),
        type: "asset",
      });

      return getRolldownLoaderSource(
        this.getFileName(emittedFile),
        useInternalInstance,
      );
    },

    async transform(_code, id, options) {
      console.log("transform", id);
      if (resolvedOptions === undefined) {
        // configResolved has not been called, we're running in rolldown (compilation handled in load)
        return;
      }

      if (!id.endsWith(compileSuffix) && !id.endsWith(instanciateSuffix)) {
        return;
      }

      const useInternalInstance = id.endsWith(instanciateSuffix);

      const wasmPath = buildZigFile(zigBinPath, id, resolvedOptions);

      return {
        code: getLoaderSource(
          wasmPath,
          options?.ssr ?? false,
          useInternalInstance,
        ),
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

function getLoaderSource(
  wasmPath: string,
  ssr: boolean,
  useInternalInstance: boolean,
) {
  if (useInternalInstance) {
    return ssr
      ? `
import * as fs from "node:fs/promises";

export default async function init(instantiateOptions) {
  const bytes = await fs.readFile('${normalizePath(wasmPath)}');
  const result = await WebAssembly.instantiate(bytes, instantiateOptions);
  return result.instance;
}`
      : `
import init from '${normalizePath(wasmPath)}?init';
export default init;`;
  }

  return ssr
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
}`;
}

function getRolldownLoaderSource(
  emittedFile: string,
  useInternalInstance: boolean,
) {
  return useInternalInstance
    ? `
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default async function init(instantiateOptions) {
  const bytes = await readFile(fileURLToPath(import.meta.resolve("./${emittedFile}")));
  const result = await WebAssembly.instantiate(bytes, instantiateOptions);
  return result.instance;
}
`
    : `
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default async function compileModule() {
  const bytes = await readFile(fileURLToPath(import.meta.resolve("./${emittedFile}")));
  return await WebAssembly.compile(bytes);
}
`;
}
