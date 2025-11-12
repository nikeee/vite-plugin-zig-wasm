declare module "*.zig?init" {
  export const instantiate: (
    options: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  export default instantiate;
}
declare module "*.zig?compile" {
  export const compileModule: () => ReturnType<typeof WebAssembly.compile>;
  export default compileModule;
}