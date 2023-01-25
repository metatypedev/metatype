# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from ast import literal_eval
import inspect
import re
from typing import Dict
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple

from attrs import define
from attrs import field
from attrs import frozen
import black
from redbaron import AtomtrailersNode
from redbaron import NameNode
from redbaron import RedBaron
from typegraph import t
from typegraph import TypeGraph
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

    def __init__(self, name: str):
        self.imports = {
            ("typegraph", "t"),
            ("typegraph.importers.base.importer", "Import"),
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
        self.renames = {}
        self.tg = TypeGraph(name="__importer__")

    def __enter__(self):
        ImporterContext.push(self)
        self.tg.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.tg.__exit__(exc_type, exc_value, exc_tb)
        ImporterContext.pop()

    def add_type(self, preferred_name: str, typ: t.typedef):
        if preferred_name in self.types:
            raise Exception(f"Cannot duplicate name {preferred_name}")
        if preferred_name in reserved_types:
            self.rename(preferred_name)
        self.types[preferred_name] = typ

    def __call__(self, preferred_name: str, typ: t.typedef):
        return self.add_type(preferred_name, typ)

    def expose(self, name: str, fn: t.func):
        if name in self.exposed:
            raise Exception(f"Cannot expose '{name}' more than once")
        self.exposed[name] = fn

    def rename(self, preferred_name: str) -> str:
        def renamed(n: str) -> str:
            self.renames[preferred_name] = n
            return n

        if preferred_name not in reserved_types:
            return preferred_name

        tagged_name = f"{preferred_name}_{self.name}"
        if tagged_name not in self.types:
            return renamed(tagged_name)

        number = 0
        while True:
            name = f"{tagged_name}_{number}"
            if name not in self.types:
                return renamed(name)
            number = number + 1

            if number > 256:
                raise Exception("Iteration limit exceeded")

    def codegen(self, cg: Codegen, tg_alias="g"):
        typify = Typify(self, "t", tg_alias)

        for header_line in self.headers:
            cg.line(header_line)
        cg.line()

        cg.line("types = {}")

        if len(self.types) > 0:
            for pname, tpe in self.types.items():
                name = self.renames[pname] if pname in self.renames else pname
                cg.line(f"types[{repr(pname)}] = {typify(tpe, name)}")

            cg.line()

        cg.line("functions = {}")
        for name, fn in self.exposed.items():
            cg.line(f"functions[{repr(name)}] = {typify(fn)}")

        cg.line()
        cg.line(
            f"return Import(importer={repr(self.name)}, renames={{}}, types=types, functions=functions)"
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
            raise Exception(f"Expected to find generate argument import node")
        gen_arg.value = "False"

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
        tg_alias = wth.contexts[0].as_.value

        comment = f"# Function generated by {type(self).__name__}. Do not change."
        cg = self.codegen(Codegen(), tg_alias=tg_alias).res
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

        # TODO: exit (1)

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
