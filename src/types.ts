export type Options = {
  /**
   * Temporary dir to store generated .wasm files and zig-cache during transform
   */
  cacheDir?: string | false;
  /**
   * Enable optimize after building .wasm file from zig file.
   *
   * Default run with ["-Oz", "--strig-debug"]
   */
  optimize?: boolean | string[];

  cpu?: Partial<CpuOptions>;

  /**
   * `--import-memory` option
   * @default true
   */
  importMemory?: boolean;

  /**
   * Effected zig build command
   */
  zig?: {
    releaseMode?: "safe" | "small" | "fast";
    strip?: boolean;
    binPath?: string;
    cacheDir?: string;
    extraArgs?: string[];
  };
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
