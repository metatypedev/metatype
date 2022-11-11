# Copyright Metatype under the Elastic License 2.0.

from argparse import ArgumentParser
from dataclasses import dataclass
import importlib
from pathlib import Path
import pkgutil
import re
import traceback
from typing import Dict
from typing import List
from typing import Union

from frozendict import frozendict
import orjson
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import Relation


# TDM is: typegraph definition module, defining one or more typegraphs
@dataclass
class LoadedTdm:
    path: str
    typegraphs: List[dict]


@dataclass
class TypegraphError:
    path: str
    message: str


def import_file(path: str) -> List[TypeGraph]:
    """
    Import typegraphs from a TDM.
    """

    path = Path(path)

    spec = importlib.util.spec_from_file_location(path.name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    return find_typegraphs(module)


def try_import_file(path: str) -> Union[List[TypeGraph], str]:
    """
    Returns the defined typegraphs or a error message
    """
    try:
        return import_file(path)
    except Exception:
        return traceback.format_exc()


def import_folder(path) -> Dict[str, Union[List[TypeGraph], str]]:
    ret = {}

    for p in Path(path).glob("**/*.py"):
        if ".venv" not in str(p):
            ret[str(p)] = try_import_file(p)

    return ret


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
    parser.add_argument("modules", nargs="*")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--nofail", action="store_true")
    # TODO option: output file

    args = parser.parse_args()

    import_res: Dict[str, Union[List[TypeGraph], str]] = {}
    for m in args.modules:
        if re.search("\\.py$", m):
            import_res[m] = try_import_file(m)
        else:
            import_res |= import_folder(m)

    ret: Dict[str, Union[List[dict], str]] = {}
    for p, res in import_res.items():
        if isinstance(res, list):
            try:
                ret[p] = {"typegraphs": [tg.build() for tg in res]}
            except Exception:
                ret[p] = {"message": traceback.format_exc()}
        else:
            ret[p] = {"message": res}

    def default(obj):
        if isinstance(obj, frozendict):
            return dict(obj)
        if isinstance(obj, Relation):
            return {}
        raise TypeError

    opt = dict(option=orjson.OPT_INDENT_2) if args.pretty else {}
    json = orjson.dumps(ret, default=default, **opt).decode()
    print(json)
