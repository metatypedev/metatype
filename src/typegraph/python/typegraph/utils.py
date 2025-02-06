# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from dataclasses import dataclass
from functools import reduce
from typing import Any, Dict, List, Optional, Union, cast

from typegraph.gen.core import SerializeParams
from typegraph.gen.utils import ReduceEntry
from typegraph.graph.shared_types import FinalizationResult, TypegraphOutput
from typegraph.injection import InheritDef, serialize_static_injection

# def serialize_record_values(obj: Union[Dict[str, any], None]):
#     return [(k, json.dumps(v)) for k, v in obj.items()] if obj is not None else None


ConfigSpec = Union[List[Union[str, Dict[str, Any]]], Dict[str, Any]]


def serialize_config(config: Optional[ConfigSpec]) -> Optional[str]:
    if config is None:
        return None

    if isinstance(config, list):
        lst = config
    else:
        lst = [config]

    if len(lst) == 0:
        return None

    config_object = reduce(
        lambda acc, conf: acc | ({conf: True} if isinstance(conf, str) else conf),
        lst,
        {},
    )
    return json.dumps(config_object)


def build_reduce_entries(node: Any, paths: List[ReduceEntry], curr_path: List[str]):
    if node is None:
        raise Exception(f"unsupported value {str(node)} at {'.'.join(curr_path)},")

    if isinstance(node, InheritDef):
        if node.payload is None:
            return paths
        paths.append(ReduceEntry(path=curr_path, injection_data=node.payload))
        return paths

    if isinstance(node, list):
        paths.append(
            ReduceEntry(
                path=curr_path,
                injection_data=serialize_static_injection(node),
            )
        )
        return paths

    if isinstance(node, dict):
        for k, v in node.items():
            build_reduce_entries(v, paths, curr_path + [k])
        return paths

    if isinstance(node, int) or isinstance(node, str) or isinstance(node, bool):
        paths.append(
            ReduceEntry(
                path=curr_path,
                injection_data=serialize_static_injection(node),
            )
        )
        return paths

    raise Exception(f"unsupported type {type(node)} at {'.'.join(curr_path)}")


frozen_memo: Dict[str, FinalizationResult] = {}


def freeze_tg_output(
    config: SerializeParams, tg_output: TypegraphOutput
) -> TypegraphOutput:
    if tg_output.name not in frozen_memo:
        frozen_memo[tg_output.name] = tg_output.serialize(config)
    return TypegraphOutput(
        name=tg_output.name, serialize=lambda _: frozen_memo[tg_output.name]
    )


@dataclass
class ResolvedModule:
    module: str
    deps: List[str]
    func_name: str


class Module:
    def __init__(self, path: str, deps: Optional[List[str]] = None):
        self.source = path
        self.deps = deps

    def import_(self, name: str):
        return ResolvedModule(module=self.source, deps=self.deps or [], func_name=name)


def resolve_module_params(
    module: Union[str, ResolvedModule],
    name: Optional[str] = None,
    deps: Optional[List[str]] = None,
):
    if isinstance(module, ResolvedModule):
        return module

    return ResolvedModule(module=module, deps=deps or [], func_name=cast(str, name))
