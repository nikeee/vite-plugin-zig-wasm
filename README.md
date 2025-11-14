<p>
  <a href="https://npmjs.com/package/vite-plugin-zig-wasm"><img src="https://img.shields.io/npm/v/vite-plugin-zig-wasm.svg" alt="npm package"></a>
  <a href="https://ziglang.org/"><img src="https://img.shields.io/badge/zig-%3E%3D%200.15.0-yellow?logo=zig" alt="zig language"></a>
  <a href="https://ziglang.org/"><img src="https://img.shields.io/badge/vite-%5E7.2.2-blue?logo=vite&&labelColor=ffffff" alt="zig language"></a>
</p>

# vite-plugin-zig-wasm
Fork of [utherpally/vite-wasm-zig](https://github.com/utherpally/vite-wasm-zig).

If you are using tsdown or rolldown, try [rolldown-plugin-zig-wasm](https://github.com/nikeee/rolldown-plugin-zig-wasm).

Why use this instead of one of the other solutions?
- More compiler options
- Compatible with latest Zig version
- Uses SIMD128 instruction set by default
- Also exposes a `WebAssembly.Module` instead of `WebAssembly.Instance`, so it's easier to create multiple instances and have more control over when an instance is created

## Install
```sh
npm i -D vite-plugin-zig-wasm
npm i -D @ziglang/cli # add a zig compiler for CI environments
```

## Usage
```js
// vite.config.{js, ts}
import zig from 'vite-plugin-zig-wasm';

export default defineConfig(({ mode }) => {
    return {
        plugins: {
            zig({
                zig: {
                  strip: mode === 'production',
                },
            })
        }
    }
}
```

```zig
// main.zig
export fn add(a: i32, b: i32) i32 {
    return a + b;
}
```
### Compiled `WebAsembly.Module`
```js
// index.{js,ts}
import compileModule from "./main.zig?compile";

const module = await compileModule();

const importObject = {
  /* ... */
};

const instance = await WebAssembly.instantiate(module, importObject);

console.log(instance.exports.add(1, 10));
export default instance.exports;
```

### Compiled `WebAssembly.Instance`
```js
// index.{js,ts}
import createInstance from "./main.zig?init";

const importObject = {
  /* ... */
};

const instance = await createInstance(importObject);

console.log(instance.exports.add(1, 10));
export default instance.exports;
```



## With Typescript
Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client", "vite-plugin-zig-wasm/client"]
  }
}
```
