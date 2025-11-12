import { defineConfig } from "vite";

// Use
// import zig from "vite-plugin-zig-wasm"
// here
import zig from "../../src/index.ts";

export default defineConfig({
  plugins: [zig()],
});
