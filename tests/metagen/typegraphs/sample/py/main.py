# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from client import (
    QueryGraph,
    PostSelections,
    SelectionFlags,
    UserSelections,
    Alias,
    Transports,
)
import json
import os

qg = QueryGraph()
port = os.getenv("TG_PORT")
gql_client = Transports.graphql_sync(qg, f"http://localhost:{port}/sample")

prepared_q = gql_client.prepare_query(
    lambda args: {
        "user": qg.get_user(
            UserSelections(
                _=SelectionFlags(select_all=True),
                posts=Alias(
                    post1=PostSelections(
                        id=True,
                        slug=True,
                        title=True,
                    ),
                    post2=PostSelections(
                        _=SelectionFlags(select_all=True),
                        id=False,
                    ),
                ),
            ),
        ),
        "posts": qg.get_posts({"_": SelectionFlags(select_all=True)}),
        "scalarNoArgs": qg.scalar_no_args(),
    },
)

prepared_m = gql_client.prepare_mutation(
    lambda args: {
        "scalarArgs": qg.scalar_args(
            {
                "id": args.get("id"),
                "slug": args.get("slug"),
                "title": args.get("title"),
            }
        ),
        "compositeNoArgs": qg.composite_no_args({"_": SelectionFlags(select_all=True)}),
        "compositeArgs": qg.composite_args(
            {
                "id": args.get("id"),
            },
            {"_": SelectionFlags(select_all=True)},
        ),
    },
)

res1 = prepared_q.perform({})
res1a = prepared_q.perform({})

res2 = prepared_m.perform(
    {
        "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
        "slug": "s",
        "title": "t",
    }
)

res3 = gql_client.query(
    {
        "user": qg.get_user(
            UserSelections(
                _=SelectionFlags(select_all=True),
                posts=Alias(
                    post1=PostSelections(
                        id=True,
                        slug=True,
                        title=True,
                    ),
                    post2=PostSelections(
                        _=SelectionFlags(select_all=True),
                        id=False,
                    ),
                ),
            ),
        ),
        "posts": qg.get_posts({"_": SelectionFlags(select_all=True)}),
        "scalarNoArgs": qg.scalar_no_args(),
    }
)

res4 = gql_client.mutation(
    {
        "scalarArgs": qg.scalar_args(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
                "slug": "",
                "title": "",
            }
        ),
        "compositeNoArgs": qg.composite_no_args({"_": SelectionFlags(select_all=True)}),
        "compositeArgs": qg.composite_args(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            },
            {"_": SelectionFlags(select_all=True)},
        ),
    }
)

res5 = gql_client.query(
    {
        "scalarUnion": qg.scalar_union(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            }
        ),
        "compositeUnion1": qg.composite_union(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            },
            {"post": {"_": SelectionFlags(select_all=True)}},
        ),
        "compositeUnion2": qg.composite_union(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            },
            {"user": {"_": SelectionFlags(select_all=True)}},
        ),
        "mixedUnion": qg.mixed_union(
            {
                "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            },
            {
                "post": {"_": SelectionFlags(select_all=True)},
                "user": {"_": SelectionFlags(select_all=True)},
            },
        ),
    }
)

res6 = gql_client.query(
    {
        "scalarOnly": qg.nested_composite({"_": SelectionFlags(select_all=True)}),
        "withStruct": qg.nested_composite(
            {
                "_": SelectionFlags(select_all=True),
                "composite": {"_": SelectionFlags(select_all=True)},
            }
        ),
        "withStructNested": qg.nested_composite(
            {
                "_": SelectionFlags(select_all=True),
                "composite": {
                    "_": SelectionFlags(select_all=True),
                    "nested": {"_": SelectionFlags(select_all=True)},
                },
            }
        ),
        "withList": qg.nested_composite(
            {
                "_": SelectionFlags(select_all=True),
                "list": {"_": SelectionFlags(select_all=True)},
            }
        ),
    },
)

res7a = gql_client.query(qg.get_posts({"_": SelectionFlags(select_all=True)}))
res7b = gql_client.mutation(
    qg.scalar_args(
        {
            "id": "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
            "slug": "s",
            "title": "t",
        }
    )
)
res7c = gql_client.prepare_query(
    lambda args: qg.identity({"input": args.get("num")}, {"input": True})
).perform({"num": 0})
res7d = gql_client.prepare_mutation(
    lambda args: qg.identity_update({"input": args.get("num")}, {"input": True})
).perform({"num": 0})

res7 = {
    "singleQuery": res7a,
    "singleMutation": res7b,
    "singlePreparedQuery": res7c,
    "singlePreparedMutation": res7d,
}

print(json.dumps([res1, res1a, res2, res3, res4, res5, res6, res7]))
