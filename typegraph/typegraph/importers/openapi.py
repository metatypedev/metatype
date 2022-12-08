# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
import re
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple
from urllib.parse import urljoin

from attrs import define
import black
from box import Box
from deepmerge import always_merger
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


def merge_all(items: List[dict]):
    ret = {}
    for item in items:
        print(f"MERGE: {item} into {ret}")
        always_merger.merge(ret, item)
        print(f"MERGED: {ret}")
    return ret


@define
class Input:
    type: str
    kwargs: dict


class Document:
    def __init__(self, uri):
        self.uri = uri
        self.root = Document.load(uri)
        self.additional_types = []

    def load(uri: str):
        res = httpx.get(uri)
        if res.headers.get("content-type").find("yaml") >= 0 or re.search(
            r"\.yaml$", uri
        ):
            return Box(yaml.safe_load(res.text))
        # suppose it is JSON
        return Box(res.json())

    def merge_schemas(self, schemas: List[Box]):
        return Box(merge_all([self.resolve_ref(s) for s in schemas]))

    def typify(
        self,
        schema: Box,
        name: Optional[str] = None,
        write_name: bool = False,
        opt: bool = False,
        prop_of: Optional[Tuple[str, str]] = None,
    ):
        if opt:
            return f"t.optional({self.typify(schema, name, prop_of = prop_of)})"

        if name is not None and write_name:
            return f'{self.typify(schema, name)}.named("{name}")'

        if "$ref" in schema:
            match = re.match(r"^#/components/schemas/(\w+)$", schema["$ref"])
            if match:
                return f'g("{match.group(1)}")'
            else:  # unlikely??
                return self.typify(self.resolve_ref(schema))

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
            return f't.array({self.typify(schema["items"])})'

        if schema.type == "object":
            if prop_of is not None:
                type_name = f"{prop_of[0]}__{prop_of[1]}"
                self.additional_types.append((type_name, schema))
                return f'g("{type_name}")'

            ret = "t.struct({"
            required = schema.required if "required" in schema else []
            if "properties" in schema:
                for prop_name, prop_schema in schema.properties.items():
                    ret += f'"{prop_name}": {self.typify(prop_schema, opt = not prop_name in required, prop_of = (name, prop_name))},'
            ret += "})"
            return ret

        raise f'Type "{schema.type}" not supported'

    def gen_schema_defs(self, schemas: Box):
        cg = ""
        for name, schema in schemas.items():
            cg += f"    {self.typify(schema, name, write_name = True)}\n"
            while len(self.additional_types) > 0:
                name, schema = self.additional_types.pop(0)
                cg += f"    {self.typify(schema, name, write_name = True)}\n"
        return cg

    def resolve_ref(self, obj: Box, export_name=False):
        if "$ref" not in obj:
            if export_name:
                return obj, None
            return obj

        match = re.match(r"#/components/([^/]+)/([^/]+)$", obj["$ref"])
        if not match:
            raise Exception(f'Unsupported (external?) reference "{obj["$ref"]}"')
        if export_name:
            return (
                self.root.components[match.group(1)][match.group(2)],
                match.group(2) if match.group(1) == "schemas" else None,
            )
        return self.root.components[match.group(1)][match.group(2)]

    def gen_functions(self):
        fns = []
        for path in self.root.paths:
            fns += Path(self, path).gen_functions()
        return dict(fns)

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
        cg += f"    g.expose({as_kwargs(self.gen_functions())})"
        return cg


class Path:

    methods = (
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace",
    )

    def __init__(self, doc: Document, path: str):
        self.doc = doc
        self.path = path
        self.path_obj = doc.resolve_ref(doc.root.paths[path])

    def input_type(self, method: str) -> Input:
        props = {}
        kwargs = Box({})

        op_obj = self.path_obj[method]
        params = [*self.path_obj.get("parameters", []), *op_obj.get("parameters", [])]
        for param in params:
            # TODO: optional???
            param = self.doc.resolve_ref(param)
            if "schema" not in param:
                print(f"param: {param}")
                raise Exception(f"Unsupported param def")
            props[param.name] = self.doc.typify(
                param.schema, opt=not ("required" in param and param.required)
            )

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
            (body_schema, ref_name) = self.doc.resolve_ref(
                body[content_type].schema, export_name=True
            )
            assert body_schema.type == "object"
            for name, schema in body_schema.properties.items():
                # TODO: handle name clash
                props[name] = self.doc.typify(
                    schema,
                    opt=not (
                        "required" in body_schema and name in body_schema.required
                    ),
                    prop_of=(ref_name, name) if ref_name is not None else None,
                )

            kwargs.content_type = repr(content_type)
            kwargs.body_fields = repr(tuple(body_schema.properties.keys()))

        type = "t.struct({"
        for name, ty in props.items():
            type += f'"{name}":{ty},'
        type += "})"

        return Input(type, kwargs)

    def success_code(responses: Box) -> str:
        if "200" in responses:
            return "200"
        for status in responses:
            if re.match(r"^2\d\d", status):
                return status
        # ? what if there are more than one 2xx codes
        if "default" in responses:
            return "default"
        raise Exception(f"No success response found in {responses}")

    def gen_function(self, method: str) -> Tuple[str, str]:
        op_obj = self.path_obj[method]
        inp = self.input_type(method)
        success_code = Path.success_code(op_obj.responses)
        if success_code == "204":  # No Content
            out = "t.boolean()"
        else:
            res = op_obj.responses[success_code]
            if "content" in res:
                res = res.content
                if "application/json" in res:
                    out = self.doc.typify(res["application/json"].schema)
                else:
                    raise Exception(f"Unsupported response types {res.keys()}")
            else:  # no content ??
                out = "t.struct()"
        # ? or any 4xx ?
        if "404" in op_obj.responses:
            out = f"t.optional({out})"
        return (
            op_obj.operationId,
            f'remote.{method}("{self.path}", {inp.type}, {out}, {as_kwargs(inp.kwargs)}).add_policy(allow_all())',
        )

    def gen_functions(self):
        return [
            self.gen_function(method)
            for method in self.methods
            if method in self.path_obj
        ]


def as_kwargs(kwargs: Dict[str, str]):
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
        ["typegraph.types", "types as t"],
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
