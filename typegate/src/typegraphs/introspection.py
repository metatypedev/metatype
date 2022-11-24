# Copyright Metatype under the Elastic License 2.0.

from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.typegate import ResolverMat
from typegraph.materializers.typegate import SchemaMat
from typegraph.materializers.typegate import TypeMat
from typegraph.policies import Policy
from typegraph.types import types as t

with TypeGraph("introspection") as g:

    enum_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        }
    ).named("enum_value")

    input_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "type": g("type"),
            "defaultValue": t.string().optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        }
    ).named("input_value")

    field = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "args": t.func(
                t.struct(
                    {
                        "includeDeprecated": t.boolean().optional(),
                        # injection test
                        # "fieldName": g.proxy("field", lambda x: x.name),
                        # "parent": g.proxy("type", lambda x: x.name),
                    }
                ),
                t.array(input_value),
                ResolverMat(),
            ),
            "type": g("type"),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        }
    ).named("field")

    kind = (
        t.string()
        .enum(
            [
                "SCALAR",
                "OBJECT",
                "INTERFACE",
                "UNION",
                "ENUM",
                "INPUT_OBJECT",
                "LIST",
                "NON_NULL",
            ]
        )
        .named("type_kind")
    )

    type = t.struct(
        {
            "kind": kind,
            "name": t.string().optional(),
            "description": t.string().optional(),
            "specifiedByURL": t.string().optional(),
            "fields": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.array(field).optional(),
                ResolverMat(),
            ),
            "interfaces": t.array(g("type")).optional(),
            "possibleTypes": t.array(g("type")).optional(),
            "enumValues": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.array(enum_value).optional(),
                ResolverMat(),
            ),
            "inputFields": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.array(input_value).optional(),
                ResolverMat(),
            ),
            "ofType": g("type", lambda x: x.optional()),
        }
    ).named("type")

    directive_location = (
        t.string()
        .enum(
            [
                "QUERY",
                "MUTATION",
                "SUBSCRIPTION",
                "FIELD",
                "FRAGMENT_DEFINITION",
                "FRAGMENT_SPREAD",
                "INLINE_FRAGMENT",
                "VARIABLE_DEFINITION",
                "SCHEMA",
                "SCALAR",
                "OBJECT",
                "FIELD_DEFINITION",
                "ARGUMENT_DEFINITION",
                "INTERFACE",
                "UNION",
                "ENUM",
                "ENUM_VALUE",
                "INPUT_OBJECT",
                "INPUT_FIELD_DEFINITION",
            ]
        )
        .named("directive_location")
    )

    directive = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "isRepeatable": t.boolean(),
            "locations": t.array(directive_location),
            "args": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.array(input_value),
                ResolverMat(),
            ),
        }
    ).named("directive")

    allow_all = Policy(FunMat.from_lambda(lambda args: True)).named("__allow_all")

    get_type = t.func(
        t.struct({"name": t.string()}), type.optional(), TypeMat()
    ).add_policy(allow_all)
    g.expose(__type=get_type)

    schema = t.struct(
        {
            "description": t.string().optional(),
            "types": t.array(type),
            "queryType": type,
            "mutationType": type.optional(),
            "subscriptionType": type.optional(),
            "directives": t.array(directive),
        }
    ).named("schema")

    get_schema = t.func(t.struct({}), schema, SchemaMat()).add_policy(allow_all)
    g.expose(__schema=get_schema)
