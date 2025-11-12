import { defineConfig } from "tsdown";

// Use
// import zig from "vite-plugin-zig-wasm"
// here
import zig from "../../src/index.ts";

export default defineConfig({
	entry: ["src/index.ts"],
	target: "esnext",
	plugins: [
		zig(),
	],
});
