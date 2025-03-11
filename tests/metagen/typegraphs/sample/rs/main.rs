#![deny(clippy::all)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
pub mod client;
use client::*;
use metagen_client::prelude::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);

    let (res2, res3) = {
        // blocking reqwest uses tokio under the hood
        let gql_sync = api1.graphql_sync();
        let res3 = gql_sync.query((
            api1.get_user().select_aliased(User0Selections {
                posts: alias([
                    (
                        "post1",
                        select(Post0Selections {
                            id: get(),
                            slug: get(),
                            title: get(),
                        }),
                    ),
                    ("post2", select(Post0Selections { id: get(), ..all() })),
                ]),
                ..all()
            }),
            api1.get_posts().select(all()),
            api1.scalar_no_args(),
        ))?;
        //     let prepared_m = gql_sync.prepare_mutation(|args| {
        //         (
        //             api1.scalar_args(args.get("post", |val: types::Post0Partial| val)),
        //             api1.composite_no_args().select(all()),
        //             api1.composite_args(args.get("id", |id: String| {
        //                 types::RootCompositeArgsFnInput0 { id: Some(id) }
        //             }))
        //             .select(all()),
        //         )
        //     })?;
        //
        //     let prepared_clone = prepared_m.clone();
        //     let res2 = prepared_clone.perform([
        //         (
        //             "post",
        //             serde_json::json!(types::Post0Partial {
        //                 id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
        //                 slug: Some("".into()),
        //                 title: Some("".into()),
        //             }),
        //         ),
        //         (
        //             "id",
        //             serde_json::json!("94be5420-8c4a-4e67-b4f4-e1b2b54832a2"),
        //         ),
        //     ])?;
        // (res2, res3)
        (res3, ())
    };
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            //         let gql = api1.graphql();
            //         let prepared_q = gql.prepare_query(|_args| {
            //             (
            //                 api1.get_user().select_aliased(UserSelections {
            //                     posts: alias([
            //                         (
            //                             "post1",
            //                             select(PostSelections {
            //                                 id: get(),
            //                                 slug: get(),
            //                                 title: get(),
            //                             }),
            //                         ),
            //                         ("post2", select(PostSelections { id: get(), ..all() })),
            //                     ]),
            //                     ..all()
            //                 }),
            //                 api1.get_posts().select(all()),
            //                 api1.scalar_no_args(),
            //             )
            //         })?;
            //
            //         let res1 = prepared_q.perform::<String, ()>([]).await?;
            //         let res1a = prepared_q.perform::<String, ()>([]).await?;
            //
            //         let res4 = gql
            //             .mutation((
            //                 api1.scalar_args(types::PostPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                     slug: Some("".into()),
            //                     title: Some("".into()),
            //                 }),
            //                 api1.composite_no_args().select(all()),
            //                 api1.composite_args(types::RootCompositeArgsFnInputPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 })
            //                 .select(all()),
            //             ))
            //             .await?;
            //
            //         let res5 = gql
            //             .query((
            //                 api1.scalar_union(types::RootCompositeArgsFnInputPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 }),
            //                 // allows ignoring some members
            //                 api1.composite_union(types::RootCompositeArgsFnInputPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 })
            //                 .select(RootCompositeUnionFnOutputSelections {
            //                     post: select(all()),
            //                     ..default()
            //                 }),
            //                 // returns empty if returned type wasn't selected
            //                 // in union member
            //                 api1.composite_union(types::RootCompositeArgsFnInputPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 })
            //                 .select(RootCompositeUnionFnOutputSelections {
            //                     user: select(all()),
            //                     ..default()
            //                 }),
            //                 api1.mixed_union(types::RootCompositeArgsFnInputPartial {
            //                     id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 })
            //                 .select(RootMixedUnionFnOutputSelections {
            //                     post: select(all()),
            //                     user: select(all()),
            //                 }),
            //             ))
            //             .await?;
            //
            //         let res6 = gql
            //             .query((
            //                 api1.nested_composite().select(all()),
            //                 api1.nested_composite()
            //                     .select(RootNestedCompositeFnOutputSelections {
            //                         composite: select(all()),
            //                         ..all()
            //                     }),
            //                 api1.nested_composite()
            //                     .select(RootNestedCompositeFnOutputSelections {
            //                     composite: select(RootNestedCompositeFnOutputCompositeStructSelections {
            //                         nested: select(
            //                             RootNestedCompositeFnOutputCompositeStructNestedStructSelections {
            //                                 ..all()
            //                             },
            //                         ),
            //                         ..all()
            //                     }),
            //                     ..all()
            //                 }),
            //                 api1.nested_composite()
            //                     .select(RootNestedCompositeFnOutputSelections {
            //                         list: select(all()),
            //                         ..all()
            //                     }),
            //             ))
            //             .await?;
            //
            //         let res7a = gql.query(api1.get_posts().select(all())).await?;
            //         let res7b = gql
            //             .mutation(api1.scalar_args(types::PostPartial {
            //                 id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            //                 slug: Some("".into()),
            //                 title: Some("".into()),
            //             }))
            //             .await?;
            //         let res7c = gql
            //             .prepare_query(|args| {
            //                 api1.identity(
            //                     args.get("num", |val: i64| types::RootIdentityFnInputPartial {
            //                         input: Some(val),
            //                     }),
            //                 )
            //                 .select(all())
            //             })?
            //             .perform::<_, i64>([("num", 0)])
            //             .await?;
            //         let res7d = gql
            //             .prepare_mutation(|args| {
            //                 api1.identity_update(args.get("num", |val: i64| {
            //                     types::RootIdentityFnInputPartial { input: Some(val) }
            //                 }))
            //                 .select(all())
            //             })?
            //             .perform::<_, i64>([("num", 0)])
            //             .await?;

            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!([
                    // {
                    //     "user": res1.0,
                    //     "posts": res1.1,
                    //     "scalarNoArgs": res1.2,
                    // },
                    // {
                    //     "user": res1a.0,
                    //     "posts": res1a.1,
                    //     "scalarNoArgs": res1a.2,
                    // },
                    // {
                    //     "scalarArgs": res2.0,
                    //     "compositeNoArgs": res2.1,
                    //     "compositeArgs": res2.2,
                    // },
                    // {
                    //     "user": res3.0,
                    //     "posts": res3.1,
                    //     "scalarNoArgs": res3.2,
                    // },
                    // {
                    //     "scalarArgs": res4.0,
                    //     "compositeNoArgs": res4.1,
                    //     "compositeArgs": res4.2,
                    // },
                    // {
                    //     "scalarUnion": res5.0,
                    //     "compositeUnion1": res5.1,
                    //     "compositeUnion2": res5.2,
                    //     "mixedUnion": res5.3
                    // },
                    // {
                    //     "scalarOnly": res6.0,
                    //     "withStruct": res6.1,
                    //     "withStructNested": res6.2,
                    //     "withList": res6.3
                    // },{
                    //     "singleQuery": res7a,
                    //     "singleMutation": res7b,
                    //     "singlePreparedQuery": res7c,
                    //     "singlePreparedMutation": res7d,
                    // }
                ]))?
            );
            Ok(())
        })
}
