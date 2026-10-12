// Registration entry point for the TypeScript resolver hook in loadTs.mjs.
//
// Passed to node as `--import ./scripts/registerTs.mjs`. The split matters: a module
// loaded with `--import` is evaluated on the main thread, while `module.register()`
// installs the hooks onto the loader thread. Having loadTs.mjs call register() on
// import would mean it also registers itself, which is not what module.register()
// expects -- it wants the hooks from a separate file.

import { register } from "node:module";

register("./loadTs.mjs", import.meta.url);