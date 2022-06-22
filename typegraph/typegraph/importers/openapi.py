import inspect
import itertools
import re
from urllib.parse import urljoin

import black
from box import Box
import httpx
from redbaron import RedBaron
import semver
import yaml


class Document:
    def __init__(self, uri):
        self.uri = uri
        self.root = Document.load(uri)

    def load(uri: str):
        res = httpx.get(uri)
        if res.headers.get("content-type").find("yaml") >= 0 or re.search(
            r"\.yaml$", uri
        ):
            return Box(yaml.load(res.text, Loader=yaml.Loader))
        # suppose it is JSON
        return Box(res.json())

    def typify(self, schema: Box, name: str = "", opt: bool = False):
        if opt:
            return f"t.optional({self.typify(schema, name)})"

        if len(name) > 0:
            return f'{self.typify(schema)}.named("{name}")'

        if "$ref" in schema:
            match = re.match(r"^#/components/schemas/(\w+)$", schema["$ref"])
            if match:
                return f'g("{match.group(1)}")'
            else:
                raise Exception("Uh oh")

        if "allOf" in schema:
            # TODO: merge
            schemas = [
                self.resolve_ref(s["$ref"]) if "$ref" in s else s for s in schema.allOf
            ]
            return self.typify(
                Box([*itertools.chain(*[schema.items() for schema in schemas])])
            )

        if "type" not in schema:
            print(f"SCHEMA: {schema}")
            raise Exception("Unsupported schema")

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
            return f't.list({self.typify(schema["items"])})'

        if schema.type == "object":
            ret = "t.struct({"
            required = []
            if "required" in schema:
                required = schema.required
            if "properties" in schema:
                for prop_name, prop_schema in schema.properties.items():
                    ret += f'"{prop_name}": {self.typify(prop_schema, opt = not prop_name in required)},'
            ret += "})"
            return ret

        raise f'Type "{schema.type}" not supported'

    def gen_schema_defs(self, schemas: Box):
        cg = ""
        for name, schema_obj in schemas.items():
            cg += f"    {self.typify(schema_obj, name)}\n"
        return cg

    def resolve_ref(self, ref: str):
        match = re.match(r"#/components/([^/]+)/([^/]+)$", ref)
        if not match:
            raise Exception(f'Unsupported (external) reference "{ref}"')
        return self.root.components[match.group(1)][match.group(2)]

    def input_type(self, op: Box):
        props = {}
        required = []
        if "parameters" in op:
            for param in op.parameters:
                # TODO: optional???
                if "$ref" in param:
                    param = self.resolve_ref(param["$ref"])
                if "schema" not in param:
                    print(f"param: {param}")
                    raise Exception(f"Unsupported param def")
                props[param.name] = param.schema
                if "required" in param and param.required:
                    required.append(param.name)
        return self.typify(
            Box({"type": "object", "properties": props, "required": required})
        )

    def gen_functions(self, paths: Box):
        fns = {}
        for path, item in paths.items():
            if "$ref" in item:
                raise "$ref not supported in path definition"

            # TODO: params

            OPS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"]
            for op in OPS:
                if op in item:
                    op_obj = item[op]
                    inp = self.input_type(op_obj)
                    out = "t.struct({})"
                    has_default = "default" in op_obj.responses
                    if has_default or "200" in op_obj.responses:
                        res = op_obj.responses["default" if has_default else "200"]
                        if "content" in res:
                            res = res.content
                            if "application/json" in res:
                                out = self.typify(res["application/json"].schema)
                            else:
                                raise Exception(
                                    f"Unsupported response types {res.keys()}"
                                )
                        else:  # no content
                            out = "t.optional(t.boolean())"
                    if "404" in op_obj.responses:
                        out = f"t.optional({out})"
                    fns[
                        op_obj.operationId
                    ] = f'remote.{op}("{path}", {inp}, {out}).add_policy(allow_all())'

        return fns

    def codegen(self):
        ver = semver.VersionInfo.parse(self.root.openapi)
        assert ver.major == 3
        assert ver.minor <= 0

        self.root.info
        self.root.paths

        if "servers" in self.root:
            server_url = self.root.servers[0].url
        else:
            server_url = "/"

        url = urljoin(self.uri, server_url)

        cg = ""
        cg += f'    remote = HTTPRuntime("{url}")\n'
        if "components" in self.root:
            if "schemas" in self.root.components:
                cg += self.gen_schema_defs(self.root.components.schemas)
        cg += f"    g.expose({as_kwargs(self.gen_functions(self.root.paths))})"
        return cg


def as_kwargs(kwargs: dict[str, str]):
    cg = ""
    for key, val in kwargs.items():
        cg += f"{key}={val},"
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
    wth.value = Document(uri).codegen()

    new_code = black.format_str(code.dumps(), mode=black.FileMode())

    with open(file, "w") as f:
        f.write(new_code)
