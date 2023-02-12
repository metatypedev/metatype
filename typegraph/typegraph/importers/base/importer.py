# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
import itertools
import re
import sys
from ast import literal_eval
from typing import Dict, List, Optional, Set, Tuple

import black
from attrs import define, field, frozen
from redbaron import AtomtrailersNode, NameNode, RedBaron

from typegraph import TypeGraph, t
from typegraph.importers.base.typify import Typify
from typegraph.types import reserved_types

# TODO: detect indentation size/character from file


@define
class Codegen:
    indent: str = field(default=" " * 4)
    indent_level: int = field(default=1)
    res: str = field(default="", init=False)

    def line(self, line: str = "", indent_level=0):
        indent = self.indent * (self.indent_level + indent_level)
        if line == "":
            self.res += "\n"
        else:
            self.res += f"{indent}{line}\n"


class Importer:
    """Base importer class"""

    imports: Set[Tuple[str, str]]
    headers: List[str]  # codegen header lines
    name: str
    types: Dict[str, t.typedef]
    exposed: Dict[str, t.func]
    renames: Dict[str, str]
    tg: TypeGraph

    def __init__(
        self, name: str, *, renames: Dict[str, str] = {}, keep_names: List[str] = []
    ):
        """
        Args:
            `name`: name of the importer
            `renames`: a dictionary mapping original (imported) names to exposed names
            `keep_names`: a list of names to keep as the original (imported)
        """

        self.imports = {
            ("typegraph", "t"),
        }
        self.headers = []

        valid_name = re.sub("\\W", "_", name)
        if valid_name != name:
            raise Exception(
                f"'{name}' is not a valid name for an importer, use '{valid_name}'"
            )
        self.name = name
        self.types = {}
        self.exposed = {}
        self.renames = renames
        if not set(renames).isdisjoint(set(keep_names)):
            raise Exception(
                f"Names are in both `renames` and `keep_names`: {', '.join(set(renames).intersection(keep_names))}"
            )
        self.renames.update({name: name for name in keep_names})
        reserved = [name for name in self.renames.values() if name in reserved_types]
        if len(reserved) > 0:
            raise Exception(f"Cannot use reserved types: {', '.join(reserved)}")

        self.tg = TypeGraph(name="__importer__")

    def __enter__(self):
        ImporterContext.push(self)
        self.tg.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.tg.__exit__(exc_type, exc_value, exc_tb)
        ImporterContext.pop()

    def add_type(self, name: str, typ: t.typedef):
        if name in self.types:
            raise Exception(f"Cannot duplicate name '{name}'")
        self.types[name] = typ

    def __call__(self, preferred_name: str, typ: t.typedef):
        return self.add_type(preferred_name, typ)

    def expose(self, name: str, fn: t.func):
        if name in self.exposed:
            raise Exception(f"Cannot expose '{name}' more than once")
        self.exposed[name] = fn

    def generate(self):
        raise Exception("Must be overriden")

    def codegen(self, cg: Codegen):
        self.generate()

        typify = Typify(self, "t")

        for header_line in self.headers:
            cg.line(header_line)
        cg.line()

        counter = itertools.count(1)
        renames = {name: f"_{self.name}_{next(counter)}_{name}" for name in self.types}
        renames.update(self.renames)

        cg.line(f"renames = {repr(renames)}")
        cg.line()

        cg.line("types = {}")

        if len(self.types) > 0:
            for name, tpe in self.types.items():
                cg.line(f"types[{repr(name)}] = {typify(tpe, name)}")

            cg.line()

        cg.line("functions = {}")
        for name, fn in self.exposed.items():
            cg.line(f"functions[{repr(name)}] = {typify(fn)}")
        cg.line()

        self.imports.add(("typegraph.importers.base.importer", "Import"))
        cg.line(
            f"return Import(importer={repr(self.name)}, renames=renames, types=types, functions=functions)"
        )

        return cg

    def imp(self, gen: bool):
        if not gen:
            return

        file = inspect.stack()[1].filename

        with open(file) as f:
            code = RedBaron(f.read())

        gen_arg = self.find_generate_arg(code)
        if not gen_arg:
            raise Exception("Expected to find generate argument import node")
        gen_arg.value = "False"

        cg = self.codegen(Codegen()).res

        for frm, imp in self.imports:
            if not code.find(
                "from_import",
                value=lambda x: x.dumps() == frm,
                targets=lambda x: x.dumps() == imp,
            ):
                code.insert(0, f"from {frm} import {imp}\n")

        name = f"import_{self.name}"
        target_node = code.find("def", lambda node: node.name == name)
        wth = code.find("with")

        comment = f"# Function generated by {type(self).__name__}. Do not change."

        if target_node is not None:
            comment_node = next(
                (
                    node
                    for node in target_node.previous_generator()
                    if node.type != "endl"
                ),
                None,
            )
            if comment_node.type != "comment":
                target_node.insert_before(comment)
            else:
                comment_node.value = comment
            target_node.value = cg
        else:
            wth.insert_before(comment)
            wth.insert_before(f"def {name}():\n{cg}")

        new_code = black.format_str(code.dumps(), mode=black.FileMode())

        with open(file, "w") as f:
            f.write(new_code)

        print(f"File updated: {file}", file=sys.stderr)
        exit(0)

    def find_generate_arg(self, code: RedBaron) -> Optional[NameNode]:
        for node in code.find_all("atomtrailers"):
            found = self.find_generate_arg_in(node)
            if found:
                return found

        return None

    def find_generate_arg_in(self, node: AtomtrailersNode) -> Optional[NameNode]:
        if len(node.node_list) != 5:
            return None

        first = node.node_list[0]

        if first.type != "name" or first.value != type(self).__name__:
            return None

        if not node.find("string", value=lambda v: literal_eval(v) == self.name):
            return None

        [imp, call] = node.node_list[-2:]
        if imp.type != "name" or imp.value != "imp":
            return None

        if call.type != "call":
            return None

        gen = call.find("name", value="True")
        if not gen:
            return None

        return gen


class ImporterContext:
    importer: Optional[Importer] = None

    @classmethod
    def push(cls, importer: Importer):
        if cls.importer is not None and cls.importer is not importer:
            raise Exception(f"Cannot replace active ImporterContext {cls.importer}")
        cls.importer = importer

    @classmethod
    def pop(cls) -> Optional[Importer]:
        temp = cls.importer
        cls.importer = None
        return temp

    @classmethod
    def get_active(cls) -> Optional[Importer]:
        return cls.importer


@frozen
class Import:
    importer: str
    renames: Dict[str, str]
    types: Dict[str, t.typedef]
    functions: Dict[str, t.func]

    def type(self, name: str):
        typ = self.types.get(name)
        if typ is None:
            raise Exception(f"Type '{name}' not found in import '{self.importer}")

    def func(self, name: str):
        fn = self.functions.get(name)
        if fn is None:
            raise Exception(f"Function '{name}' not found in import '{self.importer}'")
        return fn

    def all(self):
        return self.functions
