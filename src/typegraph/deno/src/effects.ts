// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Effect } from "./gen/runtimes.ts";

export function read(): Effect {
  return "read";
}

export function create(idempotent = false): Effect {
  return { create: idempotent };
}

export function delete_(idempotent = true): Effect {
  return { delete: idempotent };
}

export function update(idempotent = false): Effect {
  return { update: idempotent };
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
