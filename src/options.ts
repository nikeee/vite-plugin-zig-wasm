import type { CpuOptions } from "./types.ts";

export function getMcpuOption(
  options: Partial<CpuOptions>,
): string | undefined {
  const {
    baseline = true,
    bulkMemory = true,
    nonTrappingFpToInt = true,
    signExt = true,
    simd128 = true,
  } = options;

  const o = [];
  if (baseline) {
    o.push("baseline");
  }
  if (simd128) {
    o.push("simd128");
  }
  if (signExt) {
    o.push("sign_ext");
  }
  if (nonTrappingFpToInt) {
    o.push("nontrapping_fptoint");
  }
  if (bulkMemory) {
    o.push("bulk_memory");
  }
  return o.length === 0 ? undefined : o.join("+");
}

//#region taken from https://gist.github.com/esamattis/70e9c780e08937cb0b016e04a7422010
type NotNill<T> = T extends null | undefined ? never : T;
// biome-ignore lint/complexity/noBannedTypes: wanted here
type Primitive = undefined | null | boolean | string | number | Function;

type DeepRequired<T> = T extends Primitive
  ? NotNill<T>
  : {
      [P in keyof T]-?: T[P] extends Array<infer U>
        ? Array<DeepRequired<U>>
        : T[P] extends ReadonlyArray<infer U2>
          ? DeepRequired<U2>
          : DeepRequired<T[P]>;
    };
//#endregion
