import { defineConfig } from "tsdown";

import zig from "../../src/index.ts";

export default defineConfig({
	entry: ["src/index.ts"],
	target: "esnext",
	plugins: [
		zig(),
	],
});
