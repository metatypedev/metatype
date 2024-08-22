// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  EffectCreate,
  EffectDelete,
  EffectRead,
  EffectUpdate,
} from "./gen/typegraph_core.d.ts";

/** effect for read-only operations */
export function read(): EffectRead {
  return { tag: "read" };
}

/** effect for create operations */
export function create(idempotent = false): EffectCreate {
  return { tag: "create", val: idempotent };
}


/** effect for delete operations */
export function delete_(idempotent = true): EffectDelete {
  return { tag: "delete", val: idempotent };
}

/** effect for update operations */
export function update(idempotent = true): EffectUpdate {
  return { tag: "update", val: idempotent };
}

export const UPDATE = Symbol("update");
export const DELETE = Symbol("delete");
export const CREATE = Symbol("create");
export const READ = Symbol("read");
export type PerEffect = {
  [CREATE]?: string;
  [UPDATE]?: string;
  [DELETE]?: string;
  [READ]?: string;
};
