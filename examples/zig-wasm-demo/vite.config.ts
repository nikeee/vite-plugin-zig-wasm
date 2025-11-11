import { defineConfig } from "vite";

// Use
// import zigWasmPlugin from "vite-plugin-zig-wasm"
// here
import zigWasmPlugin from "../../src/index.ts";

export default defineConfig({
  plugins: [zigWasmPlugin()],
});
