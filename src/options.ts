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
