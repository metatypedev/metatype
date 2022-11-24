# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
import re

import black
from box import Box
import httpx
import redbaron


def camel_to_snake(name):
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def upper_first(s):
    return f"{s[0].upper()}{s[1:]}"


def typify(cursor, filter_read_only=False, suffix="", opt=False):

    if (
        not opt
        and "description" in cursor
        and cursor.description.startswith("Optional")
    ):
        return f"t.optional({typify(cursor, filter_read_only, suffix, True)})"

    if "$ref" in cursor:
        return f'g("{cursor["$ref"]}{suffix}")'

    if cursor.type == "string":
        return f"t.string()"

    if cursor.type == "boolean":
        return f"t.boolean()"

    if cursor.type == "integer":
        # cursor.format = 'int32'
        return f"t.integer()"

    if cursor.type == "number":
        # cursor.format = 'double'
        return f"t.float()"

    if cursor.type == "any":
        return f"t.any()"

    if cursor.type == "array":
        return f't.array({typify(cursor["items"], filter_read_only, suffix)})'

    if cursor.type == "object":
        ret = "t.struct({"

        fields = []
        for f, v in cursor.properties.items():
            if filter_read_only or "readOnly" not in v or not v.readOnly:
                fields.append(f'"{f}": {typify(v, filter_read_only, suffix)}')

        if len(fields) == 0:
            # FIXME : accept empty object?
            fields.append('"_": t.optional(t.any())')

        ret += ",".join(fields)

        ref = f"{cursor.id}{suffix}"
        ret += f'}}).named("{ref}")'
        return ret

    raise Exception(f"Unexpect type {cursor}")


def flatten_calls(cursor, hierarchy="", url_prefix=""):
    ret = ""

    if "methods" in cursor:
        for methodName, method in cursor.methods.items():
            inp = ""
            for parameterName, parameter in method.parameters.items():
                if parameterName != "readMask":
                    inp += f'"{parameterName}": {typify(parameter, suffix="In")},'

            out = typify(method.response, suffix="Out")

            ret += f'{hierarchy}{upper_first(methodName)}=t.func(t.struct({{{inp}}}),{out},googleapis.RestMat("{method.httpMethod}", "{url_prefix}{method.path}")).named("{method.id}"),\n'

    if "resources" in cursor:
        for resourceName, resource in cursor.resources.items():
            ret += flatten_calls(
                resource,
                resourceName
                if hierarchy == ""
                else f"{hierarchy}{upper_first(resourceName)}",
                url_prefix=url_prefix,
            )

    return ret


def codegen(discovery):
    assert discovery.discoveryVersion == "v1"
    assert discovery.protocol == "rest"

    discovery.revision
    discovery.version

    discovery.canonicalName
    discovery.description
    discovery.documentationLink

    cg = ""

    for schema in discovery.schemas.values():
        assert schema.type == "object"

        cg += f'    {camel_to_snake(schema.id)}_in = {typify(schema, filter_read_only=False, suffix="In")}\n'
        cg += f'    {camel_to_snake(schema.id)}_out = {typify(schema, filter_read_only=True, suffix="Out")}\n'

        schema.description

    cg += f"    g.expose({flatten_calls(discovery, url_prefix=discovery.rootUrl)})"

    return cg


def import_googleapis(uri: str, gen: bool) -> None:
    if not gen:
        return

    file = inspect.stack()[1].filename

    with open(file, "r") as f:
        code = redbaron.RedBaron(f.read())

    imports = [
        ["typegraph.materializers", "googleapis"],
        ["typegraph.types", "types as t"],
        ["typegraph.graphs.typegraph", "TypeGraph"],
    ]

    importer = code.find(
        "atomtrailers", value=lambda x: x.find("name", value="import_googleapis")
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

    discovery = Box(httpx.get(uri).json())

    wth = code.find("with")
    wth.contexts = f'TypeGraph(name="{discovery.name}") as g'
    wth.value = codegen(discovery)

    new_code = black.format_str(code.dumps(), mode=black.FileMode())

    with open(file, "w") as f:
        f.write(new_code)
