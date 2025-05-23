#![deny(clippy::all)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
pub mod client;
use client::*;
use metagen_client::prelude::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let addr: Url = format!("http://localhost:{port}/sample").parse()?;
    let api1 = query_graph();

    let (res2, res3) = {
        // blocking reqwest uses tokio under the hood
        let gql_sync = client::transports::graphql_sync(&api1, addr.clone());
        let res3 = gql_sync.query((
            api1.get_user().select_aliased(UserSelections {
                posts: alias([
                    (
                        "post1",
                        select(PostSelections {
                            id: get(),
                            slug: get(),
                            title: get(),
                        }),
                    ),
                    ("post2", select(PostSelections { id: get(), ..all() })),
                ]),
                ..all()
            }),
            api1.get_posts().select(all()),
            api1.scalar_no_args(),
        ))?;
        let prepared_m = gql_sync.prepare_mutation(|args| {
            (
                api1.scalar_args(args.get("post", |val: types::Post| val)),
                api1.composite_no_args().select(all()),
                api1.composite_args(
                    args.get("id", |id: String| types::RootCompositeArgsFnInput { id }),
                )
                .select(all()),
            )
        })?;

        let prepared_clone = prepared_m.clone();
        let res2 = prepared_clone.perform([
            (
                "post",
                serde_json::json!(types::Post {
                    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    slug: "".into(),
                    title: "".into(),
                }),
            ),
            (
                "id",
                serde_json::json!("94be5420-8c4a-4e67-b4f4-e1b2b54832a2"),
            ),
        ])?;
        (res2, res3)
    };
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            let gql = client::transports::graphql(&api1, addr.clone());
            let prepared_q = gql.prepare_query(|_args| {
                (
                    api1.get_user().select_aliased(UserSelections {
                        posts: alias([
                            (
                                "post1",
                                select(PostSelections {
                                    id: get(),
                                    slug: get(),
                                    title: get(),
                                }),
                            ),
                            ("post2", select(PostSelections { id: get(), ..all() })),
                        ]),
                        ..all()
                    }),
                    api1.get_posts().select(all()),
                    api1.scalar_no_args(),
                )
            })?;

            let res1 = prepared_q.perform::<String, ()>([]).await?;
            let res1a = prepared_q.perform::<String, ()>([]).await?;

            let res4 = gql
                .mutation((
                    api1.scalar_args(types::Post {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                        slug: "".into(),
                        title: "".into(),
                    }),
                    api1.composite_no_args().select(all()),
                    api1.composite_args(types::RootCompositeArgsFnInput {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    })
                    .select(all()),
                ))
                .await?;

            let res5 = gql
                .query((
                    api1.scalar_union(types::RootCompositeArgsFnInput {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    }),
                    // allows ignoring some members
                    api1.composite_union(types::RootCompositeArgsFnInput {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    })
                    .select(RootCompositeUnionFnOutputSelections {
                        post: select(all()),
                        ..default()
                    }),
                    // returns empty if returned type wasn't selected
                    // in union member
                    api1.composite_union(types::RootCompositeArgsFnInput {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    })
                    .select(RootCompositeUnionFnOutputSelections {
                        user: select(all()),
                        ..default()
                    }),
                    api1.mixed_union(types::RootCompositeArgsFnInput {
                        id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    })
                    .select(RootMixedUnionFnOutputSelections {
                        post: select(all()),
                        user: select(all()),
                    }),
                ))
                .await?;

            let res6 = gql
                .query((
                    api1.nested_composite().select(all()),
                    api1.nested_composite()
                        .select(RootNestedCompositeFnOutputSelections {
                            composite: select(all()),
                            ..all()
                        }),
                    api1.nested_composite()
                        .select(RootNestedCompositeFnOutputSelections {
                        composite: select(RootNestedCompositeFnOutputCompositeStructSelections {
                            nested: select(
                                RootNestedCompositeFnOutputCompositeStructNestedStructSelections {
                                    ..all()
                                },
                            ),
                            ..all()
                        }),
                        ..all()
                    }),
                    api1.nested_composite()
                        .select(RootNestedCompositeFnOutputSelections {
                            list: select(all()),
                            ..all()
                        }),
                ))
                .await?;

            let res7a = gql.query(api1.get_posts().select(all())).await?;
            let res7b = gql
                .mutation(api1.scalar_args(types::Post {
                    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into(),
                    slug: "".into(),
                    title: "".into(),
                }))
                .await?;
            let res7c = gql
                .prepare_query(|args| {
                    api1.identity(
                        args.get("num", |val: i64| types::RootIdentityFnInput { input: val }),
                    )
                    .select(all())
                })?
                .perform::<_, i64>([("num", 0)])
                .await?;
            let res7d = gql
                .prepare_mutation(|args| {
                    api1.identity_update(
                        args.get("num", |val: i64| types::RootIdentityFnInput { input: val }),
                    )
                    .select(all())
                })?
                .perform::<_, i64>([("num", 0)])
                .await?;

            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!([
                    {
                        "user": res1.0,
                        "posts": res1.1,
                        "scalarNoArgs": res1.2,
                    },
                    {
                        "user": res1a.0,
                        "posts": res1a.1,
                        "scalarNoArgs": res1a.2,
                    },
                    {
                        "scalarArgs": res2.0,
                        "compositeNoArgs": res2.1,
                        "compositeArgs": res2.2,
                    },
                    {
                        "user": res3.0,
                        "posts": res3.1,
                        "scalarNoArgs": res3.2,
                    },
                    {
                        "scalarArgs": res4.0,
                        "compositeNoArgs": res4.1,
                        "compositeArgs": res4.2,
                    },
                    {
                        "scalarUnion": res5.0,
                        "compositeUnion1": res5.1,
                        "compositeUnion2": res5.2,
                        "mixedUnion": res5.3
                    },
                    {
                        "scalarOnly": res6.0,
                        "withStruct": res6.1,
                        "withStructNested": res6.2,
                        "withList": res6.3
                    },{
                        "singleQuery": res7a,
                        "singleMutation": res7b,
                        "singlePreparedQuery": res7c,
                        "singlePreparedMutation": res7d,
                    }
                ]))?
            );
            Ok(())
        })
}
