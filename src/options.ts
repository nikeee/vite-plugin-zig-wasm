import type { CpuOptions, Options, ZigBuildOptions } from "./types.ts";

export type EffectiveOptions = DeepRequired<
  Omit<Options, "cacheDir" | "zig"> & { zig: Omit<ZigBuildOptions, "cacheDir"> }
>;

export function getEffectiveOptions(
  options: Partial<Options>,
): EffectiveOptions {
  const {
    cpu: cpuOptions = {},
    memory: memoryOptions = {},
    zig = {},
  } = options;

  return {
    optimize: options.optimize ?? false,
    cpu: {
      baseline: cpuOptions.baseline ?? true,
      simd128: cpuOptions.simd128 ?? true,
      signExt: cpuOptions.signExt ?? true,
      nonTrappingFpToInt: cpuOptions.nonTrappingFpToInt ?? true,
      bulkMemory: cpuOptions.bulkMemory ?? true,
    },
    memory: {
      importMemory: memoryOptions.importMemory ?? true,
      initialMemory: memoryOptions.initialMemory ?? null,
      maxMemory: memoryOptions.maxMemory ?? null,
      globalBase: memoryOptions.globalBase ?? null,
    },
    zig: {
      releaseMode: zig.releaseMode ?? "ReleaseFast",
      strip: zig.strip ?? false,
      binPath: zig.binPath ?? "zig",
      extraArgs: zig.extraArgs ?? [],
    },
  };
}

export function buildArguments(
  options: DeepRequired<Options>,
  zigFilePath: string,
  outputWasmPath: string,
  extraArgs: string[] = [],
): string[] {
  const cpu = getMcpuOption(options.cpu);

  const { memory } = options;

  const args = [
    "build-exe",
    "-target",
    "wasm32-freestanding",
    "-fno-entry",
    "-rdynamic",

    cpu ? `-mcpu=${cpu}` : undefined,

    memory.importMemory ? "--import-memory" : undefined,

    memory.globalBase ? `--global-base=${memory.globalBase}` : undefined,
    memory.initialMemory
      ? `--initial-memory=${memory.initialMemory}`
      : undefined,
    memory.maxMemory ? `--max-memory=${memory.maxMemory}` : undefined,

    `-femit-bin=${outputWasmPath}`,
    "-O",
    options.zig.releaseMode,
    "--cache-dir",
    options.zig.cacheDir,
    options.zig.strip ? "--strip" : undefined,
    ...extraArgs,
    zigFilePath,
  ];

  return args.filter(a => typeof a !== "undefined").filter(a => !!a);
}

function getMcpuOption(options: CpuOptions): string | undefined {
  const o = [];
  if (options.baseline) {
    o.push("baseline");
  }
  if (options.simd128) {
    o.push("simd128");
  }
  if (options.signExt) {
    o.push("sign_ext");
  }
  if (options.nonTrappingFpToInt) {
    o.push("nontrapping_fptoint");
  }
  if (options.bulkMemory) {
    o.push("bulk_memory");
  }
  return o.length === 0 ? undefined : o.join("+");
}

//#region taken from https://gist.github.com/esamattis/70e9c780e08937cb0b016e04a7422010
type NotNill<T> = T extends undefined ? never : T;
// biome-ignore lint/complexity/noBannedTypes: wanted here
type Primitive = undefined | null | boolean | string | number | Function;

export type DeepRequired<T> = T extends Primitive
  ? NotNill<T>
  : {
      [P in keyof T]-?: T[P] extends Array<infer U>
        ? Array<DeepRequired<U>>
        : T[P] extends ReadonlyArray<infer U2>
          ? DeepRequired<U2>
          : DeepRequired<T[P]>;
    };
//#endregion
