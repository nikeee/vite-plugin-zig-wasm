import { describe } from "node:test";

import { expect } from "expect";
import { ensureZigVersion } from "../helper/index.ts";

describe("ensure zig version", () => {
  expect(() => ensureZigVersion("0.9.0", ">=0.10.0")).toThrow();
  expect(() => ensureZigVersion("invalid", ">=0.10.0")).toThrow();

  expect(() => ensureZigVersion("0.11.0-dev", ">=0.10.0")).not.toThrow();
  expect(() =>
    ensureZigVersion("0.10.0-dev.4720+9b54c9de", ">=0.10.0"),
  ).not.toThrow();
});
