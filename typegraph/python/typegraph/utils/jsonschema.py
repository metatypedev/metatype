# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Callable, Dict, List

from attrs import field, frozen
from box import Box
from deepmerge import always_merger

from typegraph import t

# TODO support for boolean schemas


@frozen
class TypedefFromJsonSchema:
    ref_to_name: Callable[[str], str]
    resolve_ref: Callable[[str], Box]
    type_dispatch: Dict[str, Callable[[Box], t.typedef]] = field(
        init=False, factory=dict
    )
    # resolve_ref: Callable[[str], str]

    def __attrs_post_init__(self):
        object.__setattr__(self, "type_dispatch", self._type_dispatch())

    def _type_dispatch(self):
        return {
            "integer": lambda _s: t.integer(),
            "number": lambda _s: t.float(),
            "string": lambda _s: t.string(),
            "boolean": lambda _s: t.boolean(),
            "array": lambda s: t.array(self(s["items"])),
            "object": lambda s: t.struct(
                {
                    prop_name: (
                        self(prop_schema)
                        if prop_name in s.get("required", [])
                        else self(prop_schema).optional()
                    )
                    for prop_name, prop_schema in s.get("properties", dict()).items()
                }
            ),
            "union": lambda s: (
                self(s.anyOf[0])
                if len(s.anyOf) == 1
                else t.union([self(t) for t in s.anyOf])
            ),
            "either": lambda s: (
                self(s.oneOf[0])
                if len(s.oneOf) == 1
                else t.either([self(t) for t in s.oneOf])
            ),
        }

    def __call__(self, schema: Box):
        if "$ref" in schema:
            return t.proxy(self.ref_to_name(schema["$ref"]))

        if "allOf" in schema:
            return self(Box(merge_all([self.resolve_ref(s) for s in schema.allOf])))

        schema_type = schema.get("type")

        if "anyOf" in schema:
            schema_type = "union"

        if "oneOf" in schema:
            schema_type = "either"

        if schema_type is None:
            raise Exception(f'Unsupported schema, field "type" not found: {schema}')

        gen = self.type_dispatch.get(schema_type)
        if gen is None:
            raise Exception(f"Unsupported type '{schema_type}'")

        if "nullable" in schema:  # and "type" in schema
            schema = Box({k: v for k, v in schema.items() if k != "nullable"})
            return gen(schema).optional()

        return gen(schema)


def merge_all(items: List[dict]):
    ret = {}
    for item in items:
        always_merger.merge(ret, item)
    return ret
