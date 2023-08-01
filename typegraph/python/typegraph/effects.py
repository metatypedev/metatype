# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from enum import auto, Enum

from attrs import frozen


class EffectType(Enum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    NONE = auto()

    def __str__(self):
        return self.name.lower()

    def __repr__(self):
        return f"EffectType.{self.name}"


@frozen
class Effect:
    effect: EffectType
    # see: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
    idempotent: bool

    def is_none(self) -> bool:
        return self.effect == EffectType.NONE


CREATE = EffectType.CREATE
UPDATE = EffectType.UPDATE
DELETE = EffectType.DELETE
NONE = EffectType.NONE


def none():
    return Effect(NONE, True)


def create(idempotent=False):
    return Effect(CREATE, idempotent)


def update(idempotent=False):
    return Effect(UPDATE, idempotent)


def delete(idempotent=True):
    return Effect(DELETE, idempotent)
