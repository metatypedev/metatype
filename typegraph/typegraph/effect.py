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
    UNKNOWN = auto()


@frozen
class Effect:
    effect: Optional[EffectType]
    # see: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
    idempotent: bool

    @classmethod
    def none(cls):
        return cls(None, True)

    @classmethod
    def create(cls, idempotent=False):
        return cls(EffectType.CREATE, idempotent)

    @classmethod
    def update(cls, idempotent=False):
        return cls(EffectType.UPDATE, idempotent)

    @classmethod
    def upsert(cls, idempotent=True):
        return cls(EffectType.UPSERT, idempotent)

    @classmethod
    def delete(cls, idempotent=True):
        return cls(EffectType.DELETE, idempotent)
