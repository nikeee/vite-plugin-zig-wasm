import compileModule from "./math.zig?compile";

const module = await compileModule();

const instance = await WebAssembly.instantiate(module, {
  env: {
    memory: new WebAssembly.Memory({ initial: 16 }),
  },
});
const result = instance.exports.add(1, 2);

console.log("hi");
console.log("Result:", result);
