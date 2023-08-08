from typegraph_next.gen.exports.runtimes import (
    EffectCreate,
    EffectDelete,
    EffectNone,
    EffectUpdate,
)


def none():
    return EffectNone()


def create(idempotent: bool = False):
    return EffectCreate(idempotent)


def update(idempotent: bool = False):
    return EffectUpdate(idempotent)


def delete(idempotent: bool = True):
    return EffectDelete(idempotent)
