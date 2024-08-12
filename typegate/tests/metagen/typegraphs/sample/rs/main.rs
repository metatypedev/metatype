// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod client;
use client::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);
    let gql = api1.graphql_sync();

    let res3 = gql.query((
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
        })?,
        api1.get_posts().select(all())?,
        api1.scalar_no_args(),
    ))?;
    let res4 = gql.mutation((
        api1.scalar_args(PostPartial {
            id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
            slug: Some("".into()),
            title: Some("".into()),
        }),
        api1.composite_no_args().select(all())?,
        api1.composite_args(Object21Partial {
            id: Some("94be5420-8c4a-4e67-b4f4-e1b2b54832a2".into()),
        })
        .select(all())?,
    ))?;
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!([
            {
                "user": res3.0,
                "posts": res3.1,
                "scalarNoArgs": res3.2,
            },
            {
                "scalarArgs": res4.0,
                "compositeNoArgs": res4.1,
                "compositeArgs": res4.2,
            }
        ]))?
    );
    Ok(())
}
