import inspect
import re
from urllib.parse import urljoin

import black
from box import Box
import httpx
from redbaron import RedBaron
import semver


def typify(schema: Box, name: str = "", opt: bool = False):
    if opt:
        return f"t.optional({typify(schema, name)})"

    if len(name) > 0:
        return f'{typify(schema)}.named("{name}")'

    if "$ref" in schema:
        match = re.match(r"^#/components/schemas/(\w+)$", schema["$ref"])
        if match:
            return f'g("{match.group(1)}")'
        else:
            raise Exception("Uh oh")

    if schema.type == "integer":
        return "t.integer()"

    if schema.type == "number":
        # formats??
        return "t.float()"

    if schema.type == "string":
        # TODO: formats: byte, binary, date, date-time, password
        return "t.string()"

    if schema.type == "boolean":
        return "t.boolean()"

    if schema.type == "array":
        return f't.list({typify(schema["items"])})'

    if schema.type == "object":
        ret = "t.struct({"
        required = []
        if "required" in schema:
            required = schema.required
        if "properties" in schema:
            for prop_name, prop_schema in schema.properties.items():
                ret += f'"{prop_name}": {typify(prop_schema, opt = not prop_name in required)},'
        ret += "})"
        return ret

    raise f'Type "{schema.type}" not supported'


def gen_schema_defs(schemas: Box):
    cg = ""
    for name, schema_obj in schemas.items():
        cg += f"    {typify(schema_obj, name)}\n"
    return cg


OPS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"]


def input_type(op: Box):
    props = {}
    if "parameters" in op:
        for param in op.parameters:
            # TODO: optional???
            props[param.name] = param.schema
    return typify(Box({"type": "object", "properties": props}))


def gen_functions(paths: Box):
    fns = {}
    for path, item in paths.items():
        if "$ref" in item:
            raise "$ref not supported in path definition"

        # TODO: params

        for op in OPS:
            if op in item:
                op_obj = item[op]
                inp = input_type(op_obj)
                out = "t.struct({})"
                has_default = "default" in op_obj.responses
                if has_default or "200" in op_obj.responses:
                    res = op_obj.responses["default" if has_default else "200"]
                    if "content" in res:
                        res = res.content
                        if "application/json" in res:
                            out = typify(res["application/json"].schema)
                        else:
                            raise Exception(f"Unsupported response types {res.keys()}")
                    else:  # no content
                        out = "t.optional(t.boolean())"
                if "404" in op_obj.responses:
                    out = f"t.optional({out})"
                fns[
                    op_obj.operationId
                ] = f'remote.{op}("{path}", {inp}, {out}).add_policy(allow_all())'

    return fns


def as_kwargs(kwargs: dict[str, str]):
    cg = ""
    for key, val in kwargs.items():
        cg += f"{key}={val},"
    return cg


def codegen(uri: str):
    openapi = Box(httpx.get(uri).json())
    ver = semver.VersionInfo.parse(openapi.openapi)
    assert ver.major == 3
    assert ver.minor <= 0

    openapi.info
    openapi.paths

    if "servers" in openapi:
        server_url = openapi.servers[0].url
    else:
        server_url = "/"

    url = urljoin(uri, server_url)

    cg = ""

    cg += f'    remote = HTTPRuntime("{url}")\n'

    if "components" in openapi:
        if "schemas" in openapi.components:
            cg += gen_schema_defs(openapi.components.schemas)

    cg += f"    g.expose({as_kwargs(gen_functions(openapi.paths))})"

    return cg


def import_openapi(uri: str, gen: bool):
    if not gen:
        return

    file = inspect.stack()[1].filename

    with open(file) as f:
        code = RedBaron(f.read())

    imports = [
        ["typegraph.materializers.http", "HTTPRuntime"],
        ["typegraph.types", "typedefs as t"],
        ["typegraph.graphs.typegraph", "TypeGraph"],
        ["typegraph.policies", "allow_all"],
    ]

    importer = code.find(
        "atomtrailers", value=lambda x: x.find("name", value="import_openapi")
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

    wth = code.find("with")
    wth.value = codegen(uri)

    new_code = black.format_str(code.dumps(), mode=black.FileMode())

    with open(file, "w") as f:
        f.write(new_code)
