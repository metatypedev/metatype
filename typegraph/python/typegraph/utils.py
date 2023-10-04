# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from functools import reduce
from typing import Dict, List, Union, Tuple, Optional, Any
from typegraph.injection import InheritDef
from typegraph.gen.exports.utils import ApplyPath, ApplyValue
from typegraph.injection import serialize_static_injection


# def serialize_record_values(obj: Union[Dict[str, any], None]):
#     return [(k, json.dumps(v)) for k, v in obj.items()] if obj is not None else None


ConfigSpec = Union[List[Union[str, Dict[str, Any]]], Dict[str, Any]]


def serialize_config(config: Optional[ConfigSpec]) -> Optional[List[Tuple[str, str]]]:
    if config is None:
        return None

    if isinstance(config, list):
        return reduce(
            lambda acc, c: acc + [(c, "true")]
            if isinstance(c, str)
            else acc + serialize_config(c),
            config,
            [],
        )

    return [(k, json.dumps(v)) for k, v in config.items()]


def build_apply_data(node: any, paths: List[ApplyPath], curr_path: List[str]):
    if node is None:
        raise Exception(f"unsupported value {str(node)} at {'.'.join(curr_path)},")

    if isinstance(node, InheritDef):
        paths.append(
            ApplyPath(
                path=curr_path, value=ApplyValue(inherit=True, payload=node.payload)
            )
        )
        return paths

    if isinstance(node, list):
        paths.append(
            ApplyPath(
                path=curr_path,
                value=ApplyValue(
                    inherit=False, payload=serialize_static_injection(node)
                ),
            )
        )
        return paths

    if isinstance(node, dict):
        for k, v in node.items():
            build_apply_data(v, paths, curr_path + [k])
        return paths

    if isinstance(node, int) or isinstance(node, str) or isinstance(node, bool):
        paths.append(
            ApplyPath(
                path=curr_path,
                value=ApplyValue(
                    inherit=False, payload=serialize_static_injection(node)
                ),
            )
        )
        return paths

    raise Exception(f"unsupported type {type(node)} at {'.'.join(curr_path)}")
