// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeGraphDS } from "../../typegraph/mod.ts";
import { Runtime } from "../Runtime.ts";

export class TypeVisibility {
  visibilityCache: Map<number, boolean>;
  constructor(
    private tg: TypeGraphDS,
    private denoRuntime: Runtime, // 
    ) {
    this.visibilityCache = new Map<number, boolean>();
  }


  // TODO:
  // 
  // Prepare visibility for each type in traversal order
  // (How to reuse the same logic as the stage ones?? otherwise redo/refactor)
  // If done, cache resolver results for the type idx
  // 
  // Bring context
  // use check to filter out types

  check(_typeIdx: number): boolean {
    // resolve and cache by idx
    return false;
  }
}
