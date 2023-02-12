# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import importlib
import json
import pkgutil
from argparse import ArgumentParser
from pathlib import Path
from typing import List

import attrs
from attrs import define
from frozendict import frozendict

from typegraph.graph.typegraph import TypeGraph


# TDM is: typegraph definition module, defining one or more typegraphs
@define
class LoadedTdm:
    path: str
    typegraphs: List[dict]


@define
class TypegraphError:
    path: str
    message: str


def import_file(path: str) -> List[TypeGraph]:
    # Import typegraphs from a TDM.
    path = Path(path)

    spec = importlib.util.spec_from_file_location(path.name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    return find_typegraphs(module)


def import_modules(module, recursive=True):
    modules = {}

    for loader, parent_name, is_pkg in pkgutil.walk_packages(module.__path__):
        name = f"{module.__name__}.{parent_name}"
        modules[name] = importlib.import_module(name)

        if recursive and is_pkg:
            modules.update(import_modules(name))

    typegraphs = []
    for mod in modules.values():
        for tg in find_typegraphs(mod):
            typegraphs.append(tg)

    return typegraphs


def find_typegraphs(module) -> List[TypeGraph]:
    ret = []
    for attr in dir(module):
        obj = getattr(module, attr)
        if isinstance(obj, TypeGraph):
            ret.append(obj)
    return ret


def cmd():
    parser = ArgumentParser()
    parser.add_argument("module")
    parser.add_argument("--pretty", action="store_true")
    # TODO option: output file

    args = parser.parse_args()

    tgs = import_file(args.module)

    class JSONEncoder(json.JSONEncoder):
        def default(self, o):
            if attrs.has(o):
                return attrs.asdict(o)
            if isinstance(o, frozendict):
                return dict(o)
            return super().default(o)

    opt = dict(indent=2) if args.pretty else {}
    output = json.dumps([tg.build() for tg in tgs], cls=JSONEncoder, **opt)
    print(output)
