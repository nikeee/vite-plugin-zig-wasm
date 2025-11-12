export type Options = {
  /**
   * Temporary dir to store generated .wasm files and zig-cache during transform
   */
  cacheDir?: string | false;
  /**
   * Enable optimize after building .wasm file using `wasm-opt`.
   *
   * Default run with ["-Oz", "--strig-debug"]
   */
  optimize?: boolean | string[];

  /**
   * CPU capabilities.
   */
  cpu?: Partial<CpuOptions>;

  /**
   * Fine-grained control about memory layout that zig assumes.
   */
  memory?: Partial<MemoryOptions>;

  /**
   * Effected zig build command
   */
  zig?: Partial<ZigBuildOptions>;
};

export type ZigBuildOptions = {
  /**  @default "ReleaseFast" */
  releaseMode: "ReleaseSmall" | "ReleaseFast" | "Debug";
  /** @default false */
  strip: boolean;
  binPath: string;
  cacheDir: string;
  extraArgs: string[];
};

// Supported features:
// https://webassembly.org/features/#feature-note-13
// zig targets | jq .cpus.wasm32
export type CpuOptions = {
  /**
   * `baseline`
   * @default true
   */
  baseline: boolean;
  /**
   * `simd128`
   * @default true
   */
  simd128: boolean;
  /**
   * `sign_ext`
   * @default true
   */
  signExt: boolean;
  /**
   * `nontrapping_fptoint`
   * @default true
   */
  nonTrappingFpToInt: boolean;
  /**
   * `bulk_memory`
   * @default true
   */
  bulkMemory: boolean;
};

export type MemoryOptions = {
  /**
   * `--import-memory` option
   * @default true
   */
  importMemory: boolean;
  /**
   * `--initial-memory`
   * @default undefined
   */
  initialMemory: number | undefined;
  /**
   * `--max-memory`
   * @default undefined
   */
  maxMemory: number | undefined;
  /**
   * `--global-base`
   * @default undefined
   */
  globalBase: number | undefined;
};
