# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from enum import Enum, auto

from typegraph.gen.exports.runtimes import (
    EffectCreate,
    EffectDelete,
    EffectRead,
    EffectUpdate,
)


def read():
    return EffectRead()


def create(idempotent: bool = False):
    return EffectCreate(idempotent)


def delete(idempotent: bool = True):
    return EffectDelete(idempotent)


def update(idempotent: bool = False):
    return EffectUpdate(idempotent)


# For injections
class EffectType(Enum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    READ = auto()


CREATE = EffectType.CREATE
UPDATE = EffectType.UPDATE
DELETE = EffectType.DELETE
READ = EffectType.READ
