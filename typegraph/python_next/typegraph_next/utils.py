# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import Dict, Union, Callable
from typegraph_next.effects import EffectType


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

    return json.dumps({"source": source, "data": {"value": value_mapper(value)}})


def serialize_record_values(obj: Union[Dict[str, any], None]):
    return [(k, json.dumps(v)) for k, v in obj.items()] if obj is not None else None
