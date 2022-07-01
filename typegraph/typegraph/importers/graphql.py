import inspect

import black
from box import Box
from gql import Client
from gql import gql
from gql.transport.requests import RequestsHTTPTransport
from graphql import get_introspection_query
from redbaron import RedBaron


def struct_field(name, type):
    return f'"{name}": {typify(type, True, object_as_ref=True)},'


def typify(tpe: Box, opt: bool, name=None, object_as_ref=False):

    if tpe.kind == "NON_NULL":
        return typify(tpe.ofType, False, name, object_as_ref)

    if opt:
        return f"t.optional({typify(tpe, False, name, object_as_ref)})"

    if object_as_ref and (tpe.kind == "OBJECT" or tpe.kind == "INPUT_OBJECT"):
        return f'g("{tpe.name}")'

    if name is not None:
        return f'{typify(tpe, opt)}.named("{name}")'

    if tpe.kind == "SCALAR":
        match tpe.name:
            case "Int" | "Long":
                return "t.integer()"
            case "Float":
                return "t.float()"
            case "String":
                return "t.string()"
            case "Boolean":
                return "t.boolean()"
            case "ID":
                return "t.string()"
            case _:
                raise Exception(f"Unsupported scalar type {tpe.name}")

    if tpe.kind == "ENUM":
        return "t.string()"

    if tpe.kind == "LIST":
        return f"t.list({typify(tpe.ofType, False, object_as_ref=True)})"

    if tpe.kind == "OBJECT":
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

    def skip_type(tpe):
        return (
            tpe.kind == "SCALAR"
            or tpe.name.startswith("__")
            or tpe.name == queryType
            or tpe.name == mutationType
        )

    for tpe in schema.types:
        if skip_type(tpe):
            continue
        cg += f"    {typify(tpe, False, name=tpe.name)} # kind: {tpe.kind}\n"

    cg += f"    schema = {schema}\n"

    return cg


def import_graphql(uri: str, gen: bool):
    if not gen:
        return

    file = inspect.stack()[1].filename

    with open(file) as f:
        code = RedBaron(f.read())

    imports = [
        ["typegraph.materializers.graphql", "GraphQLRuntime"],
        ["typegraph.types", "typedefs as t"],
        ["typegraph.graphs.typegraph", "TypeGraph"],
        ["typegraph.policies", "allow_all"],
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
    wth.value = codegen(Box(schema))

    new_code = black.format_str(code.dumps(), mode=black.FileMode())

    with open(file, "w") as f:
        f.write(new_code)
