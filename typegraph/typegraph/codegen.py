import ast
from functools import cached_property
import hashlib
import logging
from pathlib import Path
from typing import Union

import graphql
from graphql.language import ast as gast
from graphql.type import definition as gdef
import httpx
import watchgod


logging.basicConfig(level=logging.INFO, format="%(levelname)s codegen: %(message)s")


def camel(snake):
    return "".join(x.title() for x in snake.split("_"))


class GraphQLVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        super().__init__()
        self.gql = []

    def visit_Str(self, node):
        s = node.s.strip()
        if s.endswith("}") and (
            s.startswith("query")
            or s.startswith("mutation")
            or s.startswith("subscription")
        ):
            self.gql.append(s)

    @cached_property
    def md5(self):
        return hashlib.md5("".join(sorted(self.gql)).encode()).hexdigest()


def parse_gql(path: Union[Path, str]) -> GraphQLVisitor:
    collector = GraphQLVisitor()
    root = ast.parse(Path(path).read_text())
    collector.visit(root)
    return collector


class GQLCodeGen:
    def __init__(
        self, output: Union[Path, str], remote_schema, custom_scalars=None
    ) -> "GQLCodeGen":
        if custom_scalars is None:
            custom_scalars = {}

        self.hashes = {}
        self.memo = {}
        self.output = Path(output)
        self.remote_schema = remote_schema
        self.custom_scalars = custom_scalars

    def fetch_schema(self):
        intro_query = graphql.get_introspection_query()
        intro = httpx.post(**self.remote_schema, json={"query": intro_query})
        return graphql.build_client_schema(intro.json()["data"])

    def materialize(self, node, defs, prefix="", optional=True):
        def opt(tpe, code):
            if optional:
                return f"Optional[{tpe}]", ["from typing import Optional"] + code
            return tpe, code

        # unwrap field
        if isinstance(defs, gdef.GraphQLField):
            return self.materialize(node, defs.type)

        # unwrap non null
        if isinstance(defs, gdef.GraphQLNonNull):
            return self.materialize(node, defs.of_type, prefix=prefix, optional=False)

        # unwrap list
        if isinstance(defs, gdef.GraphQLList):
            tpe, code = self.materialize(node, defs.of_type, prefix=prefix)
            return opt(f"List[{tpe}]", ["from typing import List"] + code)

        # final type
        if isinstance(node, gast.FieldNode) and node.selection_set is None:
            assert isinstance(defs, gdef.GraphQLScalarType)

            if defs.name == "uuid":
                return opt("UUID", ["from uuid import UUID"])

            if defs.name == "String":
                return opt("str", [])

            if defs.name == "Int":
                return opt("int", [])

            if defs.name == "Float":
                return opt("float", [])

            if defs.name in self.custom_scalars:
                tpe, code = self.custom_scalars[defs.name]
                return opt(tpe, [code])

            raise Exception(f"unknown type: {defs.name}")

        if isinstance(node, gast.FieldNode) or isinstance(
            node, gast.OperationDefinitionNode
        ):
            name = f"{prefix}_{node.name.value}"
            code = f"@dataclass(frozen=True)\nclass {camel(name)}:\n"

            children_code = ["from dataclasses import dataclass"]

            for child_node in node.selection_set.selections:

                child_name = child_node.name.value
                field_name = (
                    child_node.alias if child_node.alias is not None else child_name
                )
                child_defs = defs.fields[child_name]

                tpe, child_code = self.materialize(child_node, child_defs, prefix=name)
                children_code.extend(child_code)

                code += f"\t\t{field_name}: {tpe}\n"

            return opt(camel(name), children_code + [code])

        raise Exception(f"unknown ast state: {node} {defs}")

    def update_path(self, path: Union[Path, str]) -> bool:
        visitor = parse_gql(path)

        if self.hashes.get(path) == visitor.md5:
            return False

        logging.info(f"gql changed in {path}")
        self.hashes[path] = visitor.md5

        schema = self.fetch_schema()
        ops = {
            gast.OperationType.QUERY: schema.query_type,
            gast.OperationType.MUTATION: schema.mutation_type,
            gast.OperationType.SUBSCRIPTION: schema.subscription_type,
        }
        codes = []

        for gql in visitor.gql:
            try:
                document_node = graphql.parse(gql)
            except graphql.error.syntax_error.GraphQLSyntaxError as e:
                raise Exception(
                    f"GraphQL syntax error in {path}: {e.description}\n{gql}"
                )

            for node in document_node.definitions:
                if node.name is None:
                    raise Exception(
                        f"{node.operation.value.title()} should be named in {path}.\n{gql}"
                    )

                for op, defs in ops.items():
                    if node.operation == op:
                        try:
                            query, code = self.materialize(
                                node, defs, prefix=op.name, optional=False
                            )
                            codes.extend(code)
                        except KeyError as e:
                            raise Exception(
                                f"Schema does not contain field {e} in {path}\n{gql}"
                            )

        self.memo[path] = codes
        return True

    @property
    def codegen(self) -> str:
        codes = [c for cs in self.memo.values() for c in cs]
        # dedup
        codes = list(dict.fromkeys(codes))
        imports = "\n".join(
            sorted(
                [c for c in codes if c.startswith("import ") or c.startswith("from ")]
            )
        )
        body = "\n\n".join(
            [
                c
                for c in codes
                if not c.startswith("import ") and not c.startswith("from ")
            ]
        )
        return f"{imports}\n\n{body}"

    def update_all(self, folder: str) -> None:
        for path in Path(folder).rglob("**/*.py"):
            self.update_path(path)

    def watch(self, folder: str) -> None:
        for changes in watchgod.watch(folder, watcher_cls=watchgod.PythonWatcher):
            for change, path in changes:
                if change != watchgod.Change.deleted:
                    try:
                        if self.update_path(Path(path)):
                            cg.write()
                    except Exception as e:
                        print(e)

    def write(self) -> None:
        self.output.write_text(self.codegen)


folder = "caress"
output = "caress/typedefs.py"
remote_schema = dict(
    url="http://localhost:8080/v1/graphql", headers={"x-hasura-admin-secret": "admin"}
)
custom_scalars = {"timestamptz": ("datetime", "from datetime import datetime")}

cg = GQLCodeGen(output, remote_schema, custom_scalars)
cg.update_all(folder)
cg.write()
cg.watch(folder)
