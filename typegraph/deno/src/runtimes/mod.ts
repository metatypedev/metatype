import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";

export class Runtime {
  constructor(public readonly _id: number) {}
}

export interface Materializer {
  _id: number;
}
