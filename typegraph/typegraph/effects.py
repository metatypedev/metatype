# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from enum import auto
from typing import Optional

from attrs import frozen
from strenum import LowercaseStrEnum


class EffectType(LowercaseStrEnum):
    CREATE = auto()
    UPDATE = auto()
    UPSERT = auto()
    DELETE = auto()


@frozen
class Effect:
    effect: Optional[EffectType]
    # see: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
    idempotent: bool

    def is_none(self) -> bool:
        return self.effect is None


def none():
    return Effect(None, True)


def create(idempotent=False):
    return Effect(EffectType.CREATE, idempotent)


def update(idempotent=False):
    return Effect(EffectType.UPDATE, idempotent)


def upsert(idempotent=True):
    return Effect(EffectType.UPSERT, idempotent)


def delete(idempotent=True):
    return Effect(EffectType.DELETE, idempotent)
