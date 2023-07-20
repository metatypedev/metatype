import { ExportsMetatypeTypegraphCore } from "../gen/exports/metatype-typegraph-core.d.ts";
import { ExportsMetatypeTypegraphRuntimes } from "../gen/exports/metatype-typegraph-runtimes.d.ts";
import * as js from "../gen/typegraph_core.js";

export const core = js.core as typeof ExportsMetatypeTypegraphCore;
export const runtimes = js.runtimes as typeof ExportsMetatypeTypegraphRuntimes;
