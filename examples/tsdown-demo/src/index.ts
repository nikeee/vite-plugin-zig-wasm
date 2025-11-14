import compileModule from "./math.zig?compile";
import createInstance from "./math.zig?init";

const module = await compileModule();

interface MathInstance extends WebAssembly.Instance {
  exports: {
    add(a: number, b: number): number;
  };
}

const instance = (await WebAssembly.instantiate(module, {
  env: {
    memory: new WebAssembly.Memory({ initial: 16 }),
  },
})) as MathInstance;

const result = instance.exports.add(1, 2);

const otherInstance = (await createInstance({
  env: {
    memory: new WebAssembly.Memory({ initial: 16 }),
  },
})) as MathInstance;

const otherResult = otherInstance.exports.add(result, 4);

console.log(otherResult);
process.exit(otherResult === 7 ? 0 : 1);
