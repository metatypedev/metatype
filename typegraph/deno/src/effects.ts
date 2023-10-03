// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  EffectCreate,
  EffectDelete,
  EffectNone,
  EffectUpdate,
} from "./gen/interfaces/metatype-typegraph-runtimes.d.ts";

export function none(): EffectNone {
  return { tag: "none" };
}

export function create(idempotent = false): EffectCreate {
  return { tag: "create", val: idempotent };
}

export function delete_(idempotent = true): EffectDelete {
  return { tag: "delete", val: idempotent };
}

export function update(idempotent = true): EffectUpdate {
  return { tag: "update", val: idempotent };
}

export const UPDATE = Symbol("update");
export const DELETE = Symbol("delete");
export const CREATE = Symbol("create");
export const NONE = Symbol("none");
export type PerEffect = {
  [CREATE]?: string;
  [UPDATE]?: string;
  [DELETE]?: string;
  [NONE]?: string;
};
