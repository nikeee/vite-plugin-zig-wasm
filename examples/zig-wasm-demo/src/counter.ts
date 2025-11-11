import init from "./test.zig?init";

const instance = await init();

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0;
  const setCounter = (count: number) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };
  element.addEventListener("click", () => {
    const newValue = instance.exports.add(counter, 1);
    setCounter(newValue);
  });
  setCounter(0);
}
