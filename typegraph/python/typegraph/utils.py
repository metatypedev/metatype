# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from functools import reduce
from typing import Any, Dict, List, Optional, Tuple, Union

from typegraph.gen.exports.core import SerializeParams
from typegraph.gen.exports.utils import ReducePath, ReduceValue
from typegraph.graph.shared_types import FinalizationResult, TypegraphOutput
from typegraph.injection import InheritDef, serialize_static_injection
from typegraph.wit import store, wit_utils

# def serialize_record_values(obj: Union[Dict[str, any], None]):
#     return [(k, json.dumps(v)) for k, v in obj.items()] if obj is not None else None


ConfigSpec = Union[List[Union[str, Dict[str, Any]]], Dict[str, Any]]


def serialize_config(config: Optional[ConfigSpec]) -> Optional[List[Tuple[str, str]]]:
    if config is None:
        return None

    if isinstance(config, list):
        return reduce(
            lambda acc, c: (
                acc + [(c, "true")] if isinstance(c, str) else acc + serialize_config(c)
            ),
            config,
            [],
        )

    return [(k, json.dumps(v)) for k, v in config.items()]


def build_reduce_data(node: Any, paths: List[ReducePath], curr_path: List[str]):
    if node is None:
        raise Exception(f"unsupported value {str(node)} at {'.'.join(curr_path)},")

    if isinstance(node, InheritDef):
        paths.append(
            ReducePath(
                path=curr_path, value=ReduceValue(inherit=True, payload=node.payload)
            )
        )
        return paths

    if isinstance(node, list):
        paths.append(
            ReducePath(
                path=curr_path,
                value=ReduceValue(
                    inherit=False, payload=serialize_static_injection(node)
                ),
            )
        )
        return paths

    if isinstance(node, dict):
        for k, v in node.items():
            build_reduce_data(v, paths, curr_path + [k])
        return paths

    if isinstance(node, int) or isinstance(node, str) or isinstance(node, bool):
        paths.append(
            ReducePath(
                path=curr_path,
                value=ReduceValue(
                    inherit=False, payload=serialize_static_injection(node)
                ),
            )
        )
        return paths

    raise Exception(f"unsupported type {type(node)} at {'.'.join(curr_path)}")


def unpack_tarb64(tar_b64: str, dest: str):
    return wit_utils.unpack_tarb64(store, tar_b64, dest)


frozen_memo: Dict[str, FinalizationResult] = {}


def freeze_tg_output(
    config: SerializeParams, tg_output: TypegraphOutput
) -> TypegraphOutput:
    if tg_output.name not in frozen_memo:
        frozen_memo[tg_output.name] = tg_output.serialize(config)
    return TypegraphOutput(
        name=tg_output.name, serialize=lambda _: frozen_memo[tg_output.name]
    )
