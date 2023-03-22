# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
import re

import black
import httpx
import redbaron
from box import Box

generated_obj_fields: dict[str, str] = {}
func_defs: dict[str, str] = {}


def camel_to_snake(name):
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def upper_first(s):
    return f"{s[0].upper()}{s[1:]}"


# {+some_param} => {some_param}
def reformat_params(path: str):
    return re.sub("{\+([A-Za-z0-9_]+)}", r"{\1}", path)


def typify_object(cursor, filter_read_only=False, suffix="", opt=False):
    ret = "t.struct({"
    fields = []
    for f, v in cursor.get("properties", {}).items():
        if filter_read_only or "readOnly" not in v or not v.readOnly:
            fields.append(f'"{f}": {typify(v, filter_read_only, suffix)}')
    ret += ",".join(fields)
    ret += "})"
    if "id" in cursor:
        ref = f"{cursor.id}{suffix}"
        ret += f'.named("{ref}")'
        generated_obj_fields[ref] = ",".join(fields)
    return ret


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
        return "t.string()"

    if cursor.type == "boolean":
        return "t.boolean()"

    if cursor.type == "integer":
        # cursor.format = 'int32'
        return "t.integer()"

    if cursor.type == "number":
        # cursor.format = 'double'
        return "t.float()"

    if cursor.type == "any":
        return "t.any()"

    if cursor.type == "array":
        return f't.array({typify(cursor["items"], filter_read_only, suffix)})'

    if cursor.type == "object":
        return typify_object(cursor, filter_read_only, suffix, opt)

    raise Exception(f"Unexpect type {cursor}")


def get_effect(method):
    effects = {
        "GET": "effects.none()",
        "POST": "effects.create()",
        "PUT": "effects.upsert()",
        "DELETE": "effects.delete()",
        "PATCH": "effects.update()",
    }
    effect = effects.get(method)
    if effect is not None:
        return effect
    raise Exception(f"Unsupported HTTP method '{method}'")


def flatten_calls(cursor, hierarchy="", url_prefix=""):
    ret = ""

    if "methods" in cursor:
        for methodName, method in cursor.methods.items():
            inp_fields = ""
            # query params
            for parameterName, parameter in method.parameters.items():
                if parameterName != "readMask":
                    inp_fields += (
                        f'"{parameterName}": {typify(parameter, suffix="In")},'
                    )
            # body input
            # flatten first depth fields and join with query params
            if "$ref" in method.request:
                # resolve first depth
                ref = f"{method.request.get('$ref')}In"
                inp_fields += generated_obj_fields.get(ref)

            inp = f"t.struct({{{inp_fields}}})"
            out = typify(method.response, suffix="Out")

            effect = get_effect(method.httpMethod)
            path = reformat_params(method.path)
            func = f'googleapis.{method.httpMethod.lower()}("/{path}", {inp}, {out}, effect={effect})'

            func_key = f"{hierarchy}{upper_first(methodName)}"
            func_var = camel_to_snake(func_key)
            func_def = f'{func}.named("{method.id}")'
            func_defs[func_var] = func_def
            # for expose
            ret += f"{func_key}={func_var},\n"

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

    lines = []

    for schema in discovery.schemas.values():
        assert schema.type == "object"
        lines.append(
            f'{camel_to_snake(schema.id)}_in = {typify(schema, filter_read_only=False, suffix="In")}'
        )
        lines.append(
            f'{camel_to_snake(schema.id)}_out = {typify(schema, filter_read_only=True, suffix="Out")}'
        )

        schema.description
    lines.append(f'googleapis = HTTPRuntime("{discovery.rootUrl}")')

    expose_block = f"g.expose({flatten_calls(discovery, url_prefix=discovery.rootUrl)})"

    for func_var, func_def in func_defs.items():
        lines.append(f"{func_var}={func_def}")

    lines.append(expose_block)

    return "\n".join(lines)


def import_googleapis(uri: str, gen: bool) -> None:
    if not gen:
        return

    file = inspect.stack()[1].filename

    with open(file, "r") as f:
        code = redbaron.RedBaron(f.read())

    imports = [
        ["typegraph", "t"],
        ["typegraph", "TypeGraph"],
        ["typegraph", "effects"],
        ["typegraph.runtimes.http", "HTTPRuntime"],
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
