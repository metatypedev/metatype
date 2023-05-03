# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import json
import pathlib
import re
from sys import stderr
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import httpx
import semver
import yaml
from box import Box

from typegraph import t
from typegraph.importers.base.importer import Importer
from typegraph.importers.base.typify import TypifyMat
from typegraph.utils.jsonschema import TypedefFromJsonSchema

MIME_TYPES = Box(
    {
        "json": "application/json",
        "urlenc": "application/x-www-form-urlencoded",
        "multipart": "multipart/form-data",
    }
)


def ref_to_name(ref: str) -> str:
    match = re.match(r"^#/components/schemas/(\w+)$", ref)
    if not match:
        raise Exception(f"Could not resolve $ref '{ref}'")
    return match.group(1)


class OpenApiImporter(Importer):
    base_url: str
    specification: Box
    additional_types: List[str]
    typedef_from_jsonschema: TypedefFromJsonSchema

    def __init__(
        self,
        name: str,
        *,
        url: Optional[str] = None,
        file: Optional[str] = None,
        base_url: Optional[str] = None,
        renames: Dict[str, str] = {},
        keep_names: List[str] = [],
    ):
        """Requires either only `url` or `file` and `base_url`"""

        super().__init__(name, renames=renames, keep_names=keep_names)

        self.name = name
        self.additiona_types = []

        if url is not None:
            assert file is None and base_url is None

            res = httpx.get(url)
            if res.headers.get("content-type").find("yaml") >= 0 or re.search(
                r"\.yaml$", url
            ):
                self.specification = Box(yaml.safe_load(res.text))
            else:  # suppose it is JSON
                self.specification = Box(res.json())

            self.base_url = url

        else:
            assert file is not None and base_url is not None
            self.base_url = base_url

            path = pathlib.Path(file)
            with open(path) as f:
                if path.suffix == ".json":
                    self.specification = Box(json.loads(f.read()))
                elif path.suffix in [".yaml", ".yml"]:
                    self.specification = Box(yaml.safe_load(f.read()))
                else:
                    raise Exception(
                        f"Expected a JSON or a YAML file, but got a file with extension '{path.suffix}'"
                    )

        self.typedef_from_jsonschema = TypedefFromJsonSchema(
            ref_to_name, lambda ref: self.resolve_ref(ref)
        )

        self.imports.add(("typegraph.runtimes.http", "HTTPRuntime"))

        if "servers" in self.specification:
            server_url = self.specification.servers[0].url
        else:
            server_url = "/"
        url = urljoin(self.base_url, server_url)
        self.headers.append(f"{name} = HTTPRuntime({repr(url)})")

    def resolve_ref(self, obj: Box):
        if "$ref" not in obj:
            return obj

        match = re.match(r"#/components/([^/]+)/([^/]+)$", obj["$ref"])
        if not match:
            raise Exception(f'Unsupported (external?) reference "{obj["$ref"]}"')
        return self.specification.components[match.group(1)][match.group(2)]

    def generate(self):
        ver = semver.VersionInfo.parse(self.specification.openapi)
        assert ver.major == 3
        assert ver.minor <= 0

        self.specification.info
        self.specification.paths

        schemas = self.specification.get("components", {}).get("schemas", [])
        for name, schema in schemas.items():
            self.add_schema(name, schema)

        with self as imp:
            for path in self.specification.paths:
                for name, fn in self.gen_functions(path).items():
                    imp.expose(name, fn)

    def add_schema(self, name: str, schema: Box):
        with self as imp:
            imp(name, self.typedef_from_jsonschema(schema))

    def gen_functions(self, path: str):
        return Path(self, path).generate_functions()


METHODS = (
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
)


def get_success_code(responses: Box) -> Optional[str]:
    if "200" in responses:
        return "200"
    for status in responses:
        if re.match(r"^2\d\d$", status):
            return status
    # TODO what if there are more than one 2xx codes

    if "default" in responses:
        return "default"

    return None


class Path:
    path: str
    spec: Box
    runtime: str
    typedef_from_jsonschema: TypedefFromJsonSchema
    resolve_ref: Callable[[str], str]

    def __init__(self, importer: OpenApiImporter, path: str):
        self.path = path
        self.spec = importer.resolve_ref(importer.specification.paths[path])
        self.runtime = importer.name
        self.typedef_from_jsonschema = importer.typedef_from_jsonschema
        self.resolve_ref = lambda ref: importer.resolve_ref(ref)

    def generate_functions(self):
        ret = {}
        for method in self.spec:
            if method in METHODS:
                try:
                    name, fn = self.generate_function(method)
                    ret[name] = fn
                except Exception as e:
                    name = self.spec[method].operationId
                    print(
                        f"Warning: Generation of function '{name}' skipped: {e}",
                        file=stderr,
                    )
            else:
                print(
                    f"Warning: Unsupported method {method}: generation skipped",
                    file=stderr,
                )
        return ret

    def generate_function(self, method: str) -> Tuple[str, t.func]:
        spec = self.spec[method]
        inp_type, inp_config = self.gen_input_type(spec)
        success_code = get_success_code(spec.responses)

        if success_code is None:
            out = t.struct()
        elif success_code == "204":  # No Content
            out = t.boolean()
        else:
            res = spec.responses[success_code]
            if "content" in res:
                content = res.content
                if MIME_TYPES.json in content:
                    out = self.typedef_from_jsonschema(content[MIME_TYPES.json].schema)
                else:
                    raise Exception(
                        f"No supported content type for response: {', '.join(content)}"
                    )
            else:
                out = t.struct()

        # TODO what for other 4xx codes
        if "404" in spec.responses:
            out = out.optional()

        return (
            spec.operationId,
            t.func(
                inp_type,
                out,
                TypifyMat(
                    lambda inp, out: f"{self.runtime}.{method}('{self.path}', {inp}, {out}, {as_kwargs(inp_config)})"
                ),
            ),
        )

    def gen_input_type(self, op_spec: Box) -> Tuple[t.typedef, Box]:
        """Returns a tuple of t.typedef and a box of kwargs"""

        params = [*self.spec.get("parameters", []), *op_spec.get("parameters", [])]

        kwargs = Box({})
        props = {}
        for param in params:
            param = self.resolve_ref(param)
            if "schema" not in param:
                raise Exception(f"Unsupported parameter definition '{param}'")
            props[param.name] = self.typedef_from_jsonschema(param.schema)

        if "requestBody" in op_spec:
            body = op_spec.requestBody.content
            types = body.keys()
            if MIME_TYPES.json in types:
                content_type = MIME_TYPES.json
            elif MIME_TYPES.urlenc in types:
                content_type = MIME_TYPES.json
            elif MIME_TYPES.multipart in types:
                content_type = MIME_TYPES.multipart
            else:
                raise Exception(
                    f"No supported content type for request: {', '.join(types)}"
                )

            schema = body[content_type].schema
            schema = self.resolve_ref(schema)
            if schema.type != "object":
                raise Exception(f"Unsupported type for request body: {schema.type}")

            for name, typ in self.typedef_from_jsonschema(schema).props.items():
                if name in props:
                    raise Exception(
                        f"Name clash: '{name}' present in both query parameters and request body"
                    )
                props[name] = typ

            kwargs.content_type = repr(content_type)
            kwargs.body_fields = repr(tuple(schema.properties.keys()))

        return (t.struct(props), kwargs)


def as_kwargs(kwargs: Dict[str, str]):
    cg = ""
    for key, val in kwargs.items():
        cg += f"{key}={val},"
    return cg
