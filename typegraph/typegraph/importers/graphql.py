# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import json
from typing import Literal, Optional

import httpx
from box import Box
from graphql import get_introspection_query

from typegraph import t
from typegraph.importers.base.importer import Importer
from typegraph.importers.base.typify import TypifyMat

# map type kind to type key of fields
OBJECT_TYPES = {
    "OBJECT": "fields",
    "INTERFACE": "fields",
    "INPUT_OBJECT": "inputFields",
}

SCALAR_TYPES = {
    "Int": lambda: t.integer(),
    "Long": lambda: t.integer(),
    "Float": lambda: t.number(),
    "String": lambda: t.string(),
    "Boolean": lambda: t.boolean(),
    "ID": lambda: t.string(),
    "Char": lambda: t.string(),
}


class GraphQLImporter(Importer):
    intros: Box

    def __init__(self, name: str, url: str, *, file: Optional[str] = None):
        super().__init__(name)
        self.imports.add(("typegraph.runtimes.graphql", "GraphQLRuntime"))
        self.headers.append(f"{name}=GraphQLRuntime('{url}')")

        if file is None:
            res = httpx.post(url, json={"query": get_introspection_query()})
            self.intros = Box(res.json()).data
        else:
            with open(file) as f:
                self.intros = Box(json.loads(f.read()))

    def generate(self):
        schema = self.intros["__schema"]
        queryType = schema.queryType.name if schema.queryType is not None else None
        mutationType = (
            schema.mutationType.name if schema.mutationType is not None else None
        )

        queries, mutations = None, None

        for tpe in schema.types:
            if tpe.kind == "SCALAR" or tpe.name.startswith("__"):
                continue
            if tpe.name == queryType:
                queries = tpe
                continue
            if tpe.name == mutationType:
                mutations = tpe
                continue
            self.add_type_from_node(tpe)

        def expose(f, method: Literal["query", "mutation"]):
            with self:
                self.expose(
                    f.name,
                    t.func(
                        t.struct(
                            {
                                arg.name: self.type_from_node(arg.type)
                                for arg in f.args or []
                            }
                        ),
                        self.type_from_node(f.type),
                        TypifyMat(
                            lambda inp, out: f"{self.name}.{method}({inp}, {out})"
                        ),
                    ),
                )

        for q in queries.fields if queries is not None else []:
            expose(q, "query")
        for m in mutations.fields if mutations is not None else []:
            expose(m, "mutation")

    def add_type_from_node(self, node: Box):
        with self as imp:
            imp(node.name, self.non_optional_type_from_node(node))

    def non_optional_type_from_node(self, node: Box):
        if node.kind == "SCALAR":
            return self.scalar_type(node.name)

        if node.kind == "ENUM":
            if not hasattr(node, "enumValues"):
                return t.proxy(node.name)
            return t.string().enum([val.name for val in node.enumValues])

        if node.kind == "LIST":
            return t.array(self.type_from_node(node.ofType))

        if node.kind == "UNION":
            return t.union([self.type_from_node(t) for t in node.possibleTypes])

        if node.kind in OBJECT_TYPES:
            if not hasattr(node, OBJECT_TYPES[node.kind]):
                return t.proxy(node.name)

            return t.struct(
                {
                    field.name: self.type_from_node(field.type)
                    for field in node[OBJECT_TYPES[node.kind]]
                }
            )

        raise Exception(f"Unsupported type kind {node.kind}")

    def type_from_node(self, node: Box) -> t.typedef:
        if node.kind == "NON_NULL":
            return self.non_optional_type_from_node(node.ofType)
        else:
            return t.optional(self.non_optional_type_from_node(node))

    def scalar_type(self, name: str) -> t.typedef:
        return SCALAR_TYPES[name]()
