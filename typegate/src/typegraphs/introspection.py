# Copyright Metatype under the Elastic License 2.0.

from typegraph import Graph, Policy, fx, t, typegraph
from typegraph.gen.exports.runtimes import (
    TypegraphOperation,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer
from typegraph.wit import runtimes, store


@typegraph()
def introspection(g: Graph):
    resolver_mat_id = runtimes.register_typegraph_materializer(
        store, TypegraphOperation.RESOLVER
    )
    if isinstance(resolver_mat_id, Err):
        raise Exception(resolver_mat_id.value)
    resolver_mat = Materializer(resolver_mat_id.value, effect=fx.read())

    type_mat_id = runtimes.register_typegraph_materializer(
        store, TypegraphOperation.GET_TYPE
    )
    if isinstance(type_mat_id, Err):
        raise Exception(type_mat_id.value)
    type_mat = Materializer(type_mat_id.value, effect=fx.read())

    schema_mat_id = runtimes.register_typegraph_materializer(
        store, TypegraphOperation.GET_SCHEMA
    )
    if isinstance(schema_mat_id, Err):
        raise Exception(schema_mat_id.value)
    schema_mat = Materializer(schema_mat_id.value, effect=fx.read())

    enum_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        },
        name="enum_value",
    )

    input_value = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "type": g.ref("type"),
            "defaultValue": t.string().optional(),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        },
        name="input_value",
    )

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
                t.list(input_value),
                resolver_mat,
            ),
            "type": g.ref("type"),
            "isDeprecated": t.boolean(),
            "deprecationReason": t.string().optional(),
        },
        name="field",
    )

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
        ],
        name="type_kind",
    )

    type = t.struct(
        {
            "kind": kind,
            "name": t.string().optional(),
            "description": t.string().optional(),
            "specifiedByURL": t.string().optional(),
            "fields": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.list(field).optional(),
                resolver_mat,
            ),
            "interfaces": t.list(g.ref("type")).optional(),
            "possibleTypes": t.list(g.ref("type")).optional(),
            "enumValues": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.list(enum_value).optional(),
                resolver_mat,
            ),
            "inputFields": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.list(input_value).optional(),
                resolver_mat,
            ),
            "ofType": g.ref("type").optional(),
        },
        name="type",
    )

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
        ],
        name="directive_location",
    )

    directive = t.struct(
        {
            "name": t.string(),
            "description": t.string().optional(),
            "isRepeatable": t.boolean(),
            "locations": t.list(directive_location),
            "args": t.func(
                t.struct({"includeDeprecated": t.boolean().optional()}),
                t.list(input_value),
                resolver_mat,
            ),
        },
        name="directive",
    )

    public = Policy.public()

    get_type = t.func(
        t.struct({"name": t.string()}), type.optional(), type_mat
    ).with_policy(public)
    g.expose(__type=get_type)

    schema = t.struct(
        {
            "description": t.string().optional(),
            "types": t.list(type),
            "queryType": type,
            "mutationType": type.optional(),
            "subscriptionType": type.optional(),
            "directives": t.list(directive),
        },
        name="schema",
    )

    get_schema = t.func(t.struct({}), schema, schema_mat).with_policy(public)
    g.expose(__schema=get_schema)
