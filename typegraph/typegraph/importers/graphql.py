# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
import itertools
from typing import Dict

import black
from box import Box
from gql import Client
from gql import gql
from gql.transport.requests import RequestsHTTPTransport
from graphql import get_introspection_query
from redbaron import RedBaron


def struct_field(name, type):
    return f'"{name}": {typify(type, True, object_as_ref=True)},'


def gen_functions(queries, mutations) -> Dict[str, str]:
    fns = {}

    for field in itertools.chain(
        queries.fields if queries else [], mutations.fields if mutations else []
    ):
        inp = "t.struct({"
        for arg in field.args or []:
            # ?? INPUT_OBJECT
            inp += struct_field(arg.name, arg.type)
        inp += "})"
        out = typify(field.type, True, object_as_ref=True)
        fns[field.name] = f"remote.query({inp}, {out})"

    return fns


SCALAR_TYPE_MAP = {
    "Int": "t.integer()",
    "Long": "t.integer()",
    "Float": "t.number()",
    "String": "t.string()",
    "Boolean": "t.boolean()",
    "ID": "t.string()",
}


def typify(tpe: Box, opt: bool = True, name=None, object_as_ref=False):
    # A type is nullable by default, unless it is wrapped in a "NON_NULL".

    if tpe.kind == "NON_NULL":
        return typify(tpe.ofType, False, name, object_as_ref)

    if opt:
        return f"t.optional({typify(tpe, False, name, object_as_ref)})"

    if object_as_ref and (tpe.kind == "OBJECT" or tpe.kind == "INPUT_OBJECT"):
        return f'g("{tpe.name}")'

    if name is not None:
        return f'{typify(tpe, opt)}.named("{name}")'

    if tpe.kind == "SCALAR":
        if tpe.name in SCALAR_TYPE_MAP:
            return SCALAR_TYPE_MAP[tpe.name]
        raise Exception(f"Unsupported scalar type {tpe.name}")

    if tpe.kind == "ENUM":
        return "t.string()"

    if tpe.kind == "LIST":
        return f"t.array({typify(tpe.ofType, False, object_as_ref=True)})"

    if tpe.kind == "UNION":
        return f't.union([{", ".join(map(lambda variant: typify(variant, False, object_as_ref=True), tpe.possibleTypes))}])'

    if tpe.kind == "OBJECT" or tpe.kind == "INTERFACE":
        cg = "t.struct({"
        for field in tpe.fields:
            cg += struct_field(field.name, field.type)
        cg += "})"
        return cg

    if tpe.kind == "INPUT_OBJECT":
        cg = "t.struct({"
        for field in tpe.inputFields:
            cg += struct_field(field.name, field.type)
        cg += "})"
        return cg

    raise Exception(f"Unsupported type kind {tpe.kind}")


def codegen(intros: Box):
    schema = intros.__schema

    cg = ""

    queryType = schema.queryType.name if schema.queryType is not None else None
    mutationType = schema.mutationType.name if schema.mutationType is not None else None

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
        cg += f"    {typify(tpe, False, name=tpe.name)} # kind: {tpe.kind}\n"

    cg += f"    g.expose({as_kwargs(gen_functions(queries, mutations))})\n"

    # View of the introspection data
    # cg += f"    schema = {schema}\n"
    return cg


def as_kwargs(kwargs: Dict[str, str]):
    cg = ""
    for key, val in kwargs.items():
        cg += f"{key}={val},"
    return cg


def import_graphql(uri: str, gen: bool):
    if not gen:
        return

    file = inspect.stack()[1].filename

    with open(file) as f:
        code = RedBaron(f.read())

    imports = [
        ["typegraph.materializers.graphql", "GraphQLRuntime"],
        ["typegraph.types", "types as t"],
        ["typegraph.graphs.typegraph", "TypeGraph"],
    ]

    importer = code.find(
        "atomtrailers", value=lambda x: x.find("name", value="import_graphql")
    ).find("name", value="True")
    if importer:
        importer.value = "False"

    for frm, imp in imports:
        if not code.find(
            "from_import",
            value=lambda x: x.dumps() == frm,
            targets=lambda x: x.dumps() == imp,
        ):
            code.insert(0, f"from {frm} import {imp}\n")

    transport = RequestsHTTPTransport(url=uri, verify=True)
    client = Client(transport=transport, fetch_schema_from_transport=True)

    query = gql(get_introspection_query())

    schema = client.execute(query)

    wth = code.find("with")
    wth.value = f'    remote=GraphQLRuntime("{uri}")\n' + codegen(Box(schema))

    new_code = black.format_str(code.dumps(), mode=black.FileMode())

    with open(file, "w") as f:
        f.write(new_code)
