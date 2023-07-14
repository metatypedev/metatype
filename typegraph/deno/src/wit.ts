import { Core } from "../gen/exports/core.d.ts";
import { Runtimes } from "../gen/exports/runtimes.d.ts";
import * as js from "../gen/typegraph_core.js";

export const core = js.core as typeof Core;
export const runtimes = js.runtimes as typeof Runtimes;
