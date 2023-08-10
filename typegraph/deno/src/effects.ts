import {
  EffectCreate,
  EffectDelete,
  EffectNone,
  EffectUpdate,
} from "../gen/exports/metatype-typegraph-runtimes.d.ts";

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
