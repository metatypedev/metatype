#![deny(clippy::all)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
pub mod client;
use client::*;

#[allow(unused)]
fn test() -> Result<(), Box<dyn std::error::Error>> {
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
                ("posts2", select(PostSelections { id: get(), ..all() })),
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
    ));
    Ok(())
}
