# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from enum import Enum, auto

from typegraph.gen.runtimes import (
    Effect,
)


def read() -> Effect:
    return "read"


def create(idempotent: bool = False) -> Effect:
    return {"create": idempotent}


def delete(idempotent: bool = True) -> Effect:
    return {"delete": idempotent}


def update(idempotent: bool = False) -> Effect:
    return {"update": idempotent}


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
