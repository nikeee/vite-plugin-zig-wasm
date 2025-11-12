import compileModule from "./math.zig?compile";

const module = await compileModule();

const instance = await WebAssembly.instantiate(module, {
  // import object
});
const result = instance.exports.add(1, 2);

console.log("hi");
console.log("Result:", result);
