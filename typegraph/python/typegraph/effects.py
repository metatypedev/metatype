# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.runtimes import (
    EffectCreate,
    EffectDelete,
    EffectNone,
    EffectUpdate,
)
from enum import auto, Enum


def none():
    return EffectNone()


def create(idempotent: bool = False):
    return EffectCreate(idempotent)


def update(idempotent: bool = False):
    return EffectUpdate(idempotent)


def delete(idempotent: bool = True):
    return EffectDelete(idempotent)


# For injections
class EffectType(Enum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    NONE = auto()


CREATE = EffectType.CREATE
UPDATE = EffectType.UPDATE
DELETE = EffectType.DELETE
NONE = EffectType.NONE
