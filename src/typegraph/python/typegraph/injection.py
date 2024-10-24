# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import Callable, Dict, Union, Optional

from typegraph.effects import EffectType


def serialize_injection(
    source: str,
    value: Union[any, Dict[EffectType, any]],
    value_mapper: Callable[[any], any] = lambda x: x,
):
    if (
        isinstance(value, dict)
        and len(value) > 0
        and all(isinstance(k, EffectType) for k in value.keys())
    ):
        value_per_effect = {
            str(k.name.lower()): value_mapper(v) for k, v in value.items()
        }
        return json.dumps({"source": source, "data": value_per_effect})

    if value is None:
        return json.dumps({"source": source, "data": {"value": None}})

    return json.dumps({"source": source, "data": {"value": value_mapper(value)}})


def serialize_static_injection(value: Union[any, Dict[EffectType, any]]):
    return serialize_injection(
        "static", value=value, value_mapper=lambda x: json.dumps(x)
    )


def serialize_generic_injection(source: str, value: Union[any, Dict[EffectType, any]]):
    allowed = ["dynamic", "context", "secret", "random"]
    if source in allowed:
        return serialize_injection(source, value=value)
    raise Exception(f"source must be one of ${', '.join(allowed)}")


def serialize_parent_injection(value: Union[str, Dict[EffectType, str]]):
    if not isinstance(value, str):
        if not isinstance(value, dict):
            raise Exception("type not supported")

        is_per_effect = len(value) > 0 and all(
            isinstance(k, EffectType) for k in value.keys()
        )
        if not is_per_effect:
            raise Exception("object keys should be of type EffectType")

    return serialize_injection("parent", value=value, value_mapper=lambda x: x)


class InheritDef:
    payload: Optional[str] = None

    def set(self, value: Union[any, Dict[EffectType, any]]):
        self.payload = serialize_static_injection(value)
        return self

    def inject(self, value: Union[any, Dict[EffectType, any]]):
        self.payload = serialize_generic_injection("dynamic", value)
        return self

    def from_context(self, value: Union[str, Dict[EffectType, str]]):
        self.payload = serialize_generic_injection("context", value)
        return self

    def from_secret(self, value: Union[str, Dict[EffectType, str]]):
        self.payload = serialize_generic_injection("secret", value)
        return self

    def from_parent(self, value: Union[str, Dict[EffectType, str]]):
        self.payload = serialize_parent_injection(value)
        return self

    def from_random(self):
        self.payload = serialize_generic_injection("random", None)
        return self
