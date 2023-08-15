// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Effect } from "../../gen/exports/metatype-typegraph-runtimes.d.ts";

export class Runtime {
  constructor(public readonly _id: number) {}
}

export interface Materializer {
  _id: number;
}
