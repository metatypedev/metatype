import importlib
from pathlib import Path
import pkgutil
from typing import List

from typegraph.graphs.typegraph import TypeGraph


def import_file(path: Path) -> List[TypeGraph]:
    typegraphs = []

    spec = importlib.util.spec_from_file_location(path.name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for tg in find_typegraphs(module):
        typegraphs.append(tg)

    return typegraphs


def import_folder(path) -> List[TypeGraph]:
    typegraphs = []

    for p in Path(path).glob("**/*.py"):
        if ".venv" not in str(p):
            typegraphs += import_file(p)

    return typegraphs


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
