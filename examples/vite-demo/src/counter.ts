import compileModule from "./math.zig?compile";
import createInstance from "./math.zig?init";

// Method 1
const module = await compileModule();
const instance = await WebAssembly.instantiate(module, {
  // import object
});

// Method 2
const otherInstance = await createInstance({
  // import object
});

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () => {
    const addedTwo = instance.exports.add(counter, 2);
    const newValue = otherInstance.exports.sub(addedTwo, 1);
    setCounter(newValue);
  });
  setCounter(0);
}
