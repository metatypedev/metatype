# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typegraph import t
from typing import Dict, List, Optional
import json
import re

import httpx
from box import Box
from typegraph.importers.base.importer import Importer
from typegraph.importers.base.typify import Typify


def camel_to_snake(name):
    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def upper_first(s):
    return f"{s[0].upper()}{s[1:]}"


# {+some_param} => {some_param}
def reformat_params(path: str):
    return re.sub("{\+([A-Za-z0-9_]+)}", r"{\1}", path)


class GoogleDiscoveryImporter(Importer):
    generated_obj_fields: Dict[str, Dict[str, str]] = {}

    def __init__(
        self,
        name: str,
        *,
        url: Optional[str] = None,
        file: Optional[str] = None,
        renames: Dict[str, str] = {},
        keep_names: List[str] = [],
    ):
        super().__init__(name, renames=renames, keep_names=keep_names)
        self.imports = {
            ("typegraph", "t"),
            ("typegraph", "TypeGraph"),
            ("typegraph", "effects"),
            ("typegraph.runtimes.http", "HTTPRuntime"),
        }

        if file is None:
            self.specification = Box(httpx.get(url).json())
        else:
            with open(file) as f:
                self.specification = Box(json.loads(f.read()))

        self.headers.append(f"{name} = HTTPRuntime({repr(self.specification.rootUrl)})")

    def generate(self):
        assert self.specification.discoveryVersion == "v1"
        assert self.specification.protocol == "rest"

        self.specification.revision
        self.specification.version

        self.specification.canonicalName
        self.specification.description
        self.specification.documentationLink

        self.types["error_response"] = self.error_struct()
        for schema in self.specification.schemas.values():
            assert schema.type == "object"
            self.types[f"{camel_to_snake(schema.id)}_in"] = self.typify(
                schema,
                has_error=False,
                filter_read_only=False,
                suffix="In",
                allow_opt=False,
            )
            self.types[f"{camel_to_snake(schema.id)}_out"] = self.typify(
                schema,
                has_error=True,
                filter_read_only=True,
                suffix="Out",
                allow_opt=False,
            )

        self.prepare_expose(
            self.specification,
            url_prefix=self.specification.rootUrl,
        )

    def error_struct(self) -> t.struct:
        return t.struct(
            {"code": t.integer(), "message": t.string(), "status": t.string()}
        ).named("ErrorResponse")

    def typify_object(self, cursor, has_error=False, filter_read_only=False, suffix=""):
        fields: Dict[str, t.typedef] = {}

        for f, v in cursor.get("properties", {}).items():
            if filter_read_only or "readOnly" not in v or not v.readOnly:
                fields[f] = self.typify(v, False, filter_read_only, suffix)

        if has_error:
            fields["error"] = t.optional(t.proxy("ErrorResponse"))

        ret = t.struct(fields)
        if "id" in cursor:
            ref = f"{cursor.id}{suffix}"
            self.renames[ref] = ref
            self.generated_obj_fields[ref] = fields

        return ret

    def typify(
        self, cursor, has_error=False, filter_read_only=False, suffix="", allow_opt=True
    ):
        if (
            allow_opt
            and "description" in cursor
            and not cursor.description.startswith("Required")
        ):
            return self.typify(
                cursor=cursor,
                has_error=False,
                filter_read_only=filter_read_only,
                suffix=suffix,
                allow_opt=False,
            ).optional()

        if "$ref" in cursor:
            return t.proxy(f'"{cursor["$ref"]}{suffix}"')

        simple_type = {
            "string": t.string(),
            "boolean": t.boolean(),
            "integer": t.integer(),
            "number": t.float(),
            "any": t.any(),
        }

        tpe = simple_type.get(cursor.type)
        if tpe is not None:
            return tpe

        if cursor.type == "array":
            inner_type = self.typify(
                cursor["items"], has_error, filter_read_only, suffix, False
            )
            return t.array(inner_type)

        if cursor.type == "object":
            return self.typify_object(cursor, has_error, filter_read_only, suffix)

        raise Exception(f"Unexpect type {cursor}")

    def prepare_expose(self, cursor, hierarchy="", url_prefix=""):
        if "methods" not in cursor:
            return
        for methodName, method in cursor.methods.items():
            inp_fields: Dict[str, t.typedef] = {}
            # query params
            for parameterName, parameter in method.parameters.items():
                if parameterName != "readMask":
                    inp_fields[parameterName] = self.typify(parameter, suffix="In")

            # flatten first depth fields
            if "$ref" in method.request:
                # resolve first depth
                ref = f"{method.request.get('$ref')}In"
                for k, v in self.generated_obj_fields.get(ref):
                    inp_fields[k] = v
            inp_fields["auth"] = t.string()

            # In/Out
            inp = t.struct(inp_fields)
            out = self.typify(method.response, suffix="Out")

            # kwargs
            fparams = {
                "auth_token_field": "auth",  # Bearer token
                "content_type": "application/json",
            }
            kwargs = ", ".join([f'"{k}": {v}' for k, v in fparams.items()])

            all_finputs = ", ".join(
                [repr(reformat_params(method.path)), inp, out, kwargs]
            )

            func_key = f"{hierarchy}{upper_first(methodName)}"
            func_def = f'{self.name}.{method.httpMethod.lower}({all_finputs}).named("{method.id}")'

            self.exposed[func_key] = t.func(inp, out, Typify(lambda i, o: func_def))
