# Copyright Metatype under the Elastic License 2.0.

from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.typegate import ResolverMat
from typegraph.materializers.typegate import SchemaMat
from typegraph.materializers.typegate import TypeMat
from typegraph.types import typedefs as t

with TypeGraph("introspection") as g:

    enum_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().s_optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().s_optional(),
        }
    ).named("enum_value")

    input_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().s_optional(),
            "type": g("type"),
            "defaultValue": t.string().s_optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().s_optional(),
        }
    ).named("input_value")

    field = t.struct(
        {
            "name": t.string(),
            "description": t.string().s_optional(),
            "args": t.func(
                t.struct(
                    {
                        "includeDeprecated": t.boolean().s_optional(),
                        # injection test
                        # "fieldName": g.proxy("field", lambda x: x.name),
                        # "parent": g.proxy("type", lambda x: x.name),
                    }
                ),
                t.list(input_value),
                ResolverMat(),
            ),
            "type": g("type"),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().s_optional(),
        }
    ).named("field")

    kind = t.enum(
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
    ).named("type_kind")

    type = t.struct(
        {
            "kind": kind,
            "name": t.string().s_optional(),
            "description": t.string().s_optional(),
            "specifiedByURL": t.string().s_optional(),
            "fields": t.func(
                t.struct({"includeDeprecated": t.boolean().s_optional()}),
                t.list(field).s_optional(),
                ResolverMat(),
            ),
            "interfaces": t.list(g("type")).s_optional(),
            "possibleTypes": t.list(g("type")).s_optional(),
            "enumValues": t.func(
                t.struct({"includeDeprecated": t.boolean().s_optional()}),
                t.list(enum_value).s_optional(),
                ResolverMat(),
            ),
            "inputFields": t.func(
                t.struct({"includeDeprecated": t.boolean().s_optional()}),
                t.list(input_value).s_optional(),
                ResolverMat(),
            ),
            "ofType": g("type", lambda x: x.s_optional()),
        }
    ).named("type")

    directive_location = t.enum(
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
    ).named("directive_location")

    directive = t.struct(
        {
            "name": t.string(),
            "description": t.string().s_optional(),
            "isRepeatable": t.boolean(),
            "locations": t.list(directive_location),
            "args": t.func(
                t.struct({"includeDeprecated": t.boolean().s_optional()}),
                t.list(input_value),
                ResolverMat(),
            ),
        }
    ).named("directive")

    allow_all = t.policy(t.struct(), FunMat.from_lambda(lambda args: True)).named(
        "__allow_all"
    )

    get_type = t.func(
        t.struct({"name": t.string()}), type.s_optional(), TypeMat()
    ).add_policy(allow_all)
    g.expose(__type=get_type)

    schema = t.struct(
        {
            "description": t.string().s_optional(),
            "types": t.list(type),
            "queryType": type,
            "mutationType": type.s_optional(),
            "subscriptionType": type.s_optional(),
            "directives": t.list(directive),
        }
    ).named("schema")

    get_schema = t.func(t.struct({}), schema, SchemaMat()).add_policy(allow_all)
    g.expose(__schema=get_schema)
