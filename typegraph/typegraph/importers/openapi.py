import inspect
import re
from urllib.parse import urljoin

import black
from box import Box
import httpx
from redbaron import RedBaron
import semver


def typify(schema: dict, name: str = ""):
    if len(name) > 0:
        return f'{typify(schema)}.named("{name}")'

    if "$ref" in schema:
        print(f"SCHEMA: {schema}")
        match = re.match(r"^#/components/schemas/(\w+)$", schema["$ref"])
        if match:
            return f'g("{match.group(1)}")'
        else:
            raise "Uh oh"

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
        for prop_name, prop_schema in schema.properties.items():
            ret += f'"{prop_name}": {typify(prop_schema)},'
        ret += "})"
        return ret

    raise f'Type "{schema.type}" not supported'


def gen_schema_defs(schemas: dict):
    cg = ""
    for name, schema_obj in schemas.items():
        cg += f"    {typify(schema_obj, name)}\n"
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
