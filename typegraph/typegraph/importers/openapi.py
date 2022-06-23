from dataclasses import dataclass
import inspect
import re
from urllib.parse import urljoin

import black
from box import Box
import httpx
from redbaron import RedBaron
import semver
import yaml


MIME_TYPES = Box(
    {
        "json": "application/json",
        "urlenc": "application/x-www-form-urlencoded",
        "multipart": "multipart/form-data",
    }
)


def merge_into(dest: dict, source: dict):
    for key, value in source.items():
        if isinstance(value, dict):
            node = dest.setdefault(key, {})
            # ? what if node is not a dict??
            merge_into(node, value)
        else:
            dest[key] = value
    return dest


def merge_all(items: list[dict]):
    ret = {}
    for item in items:
        ret = merge_into(ret, item)
    return ret


@dataclass
class Input:
    type: str
    kwargs: dict


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

    def merge_schemas(self, schemas: list[Box]):
        schemas = [self.resolve_ref(s["$ref"]) if "$ref" in s else s for s in schemas]
        return Box(merge_all(schemas))

    def typify(self, schema: Box, name: str = "", opt: bool = False):
        if opt:
            return f"t.optional({self.typify(schema, name)})"

        if len(name) > 0:
            return f'{self.typify(schema)}.named("{name}")'

        if "$ref" in schema:
            match = re.match(r"^#/components/schemas/(\w+)$", schema["$ref"])
            if match:
                return f'g("{match.group(1)}")'
            else:  # unlikely??
                return self.typify(self.resolve_ref(schema["$ref"]))

        if "allOf" in schema:
            return self.typify(self.merge_schemas(schema.allOf))

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
        for name, schema in schemas.items():
            cg += f"    {self.typify(schema, name)}\n"
        return cg

    def resolve_ref(self, ref: str):
        match = re.match(r"#/components/([^/]+)/([^/]+)$", ref)
        if not match:
            raise Exception(f'Unsupported (external?) reference "{ref}"')
        return self.root.components[match.group(1)][match.group(2)]

    def schema_obj(self, schema: Box):
        if "$ref" in schema:
            return self.resolve_ref(schema["$ref"])
        return schema

    def input_type(self, path: str, method: str) -> Input:
        props = {}
        required = []
        kwargs = Box({})

        path_obj = self.root.paths[path]
        op_obj = path_obj[method]
        params = [*path_obj.get("parameters", []), *op_obj.get("parameters", [])]
        for param in params:
            # TODO: optional???
            if "$ref" in param:
                param = self.resolve_ref(param["$ref"])
            if "schema" not in param:
                print(f"param: {param}")
                raise Exception(f"Unsupported param def")
            props[param.name] = param.schema
            if "required" in param and param.required:
                required.append(param.name)

        if "requestBody" in op_obj:
            body = op_obj.requestBody.content
            types = body.keys()
            if MIME_TYPES.json in types:
                content_type = MIME_TYPES.json
            elif MIME_TYPES.urlenc in types:
                content_type = MIME_TYPES.json
            elif MIME_TYPES.multipart in types:
                content_type = MIME_TYPES.multipart
            else:
                raise Exception(f'Unsupported content types "types"')
            body_schema = self.schema_obj(body[content_type].schema)
            assert body_schema.type == "object"
            for name, schema in body_schema.properties.items():
                # TODO: handle name clash
                props[name] = schema

            kwargs.content_type = repr(content_type)
            kwargs.body_fields = repr(tuple(body_schema.properties.keys()))

            if "required" in body_schema:
                required += body_schema.required

        return Input(
            self.typify(
                Box({"type": "object", "properties": props, "required": required})
            ),
            kwargs,
        )

    def gen_functions(self, paths: Box):
        fns = {}
        for path, item in paths.items():
            if "$ref" in item:
                raise "$ref not supported in path definition"

            # TODO: params

            METHODS = [
                "get",
                "put",
                "post",
                "delete",
                "options",
                "head",
                "patch",
                "trace",
            ]
            for method in METHODS:
                if method in item:
                    op_obj = item[method]
                    inp = self.input_type(path, method)
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
                    ] = f'remote.{method}("{path}", {inp.type}, {out}, {as_kwargs(inp.kwargs)}).add_policy(allow_all())'

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
