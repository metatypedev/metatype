// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod client;

/* fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api1 = QueryGraph::new("http://localhost:7890/sample".parse()?);
    let gql = api1.graphql_sync();

    // NOTE: user is json type because aliases
    let (_user, _posts) = gql.query((
        api1.get_user(GetUserArgs { id: "1234".into() })
            .select_aliased(GetUserSelect {
                email: alias([("alias1", get()), ("alias2", get()), ("alias3", get())]),
                posts: alias([
                    (
                        "alias1",
                        arg_select(
                            PostArgs {
                                filter: "top".into(),
                            },
                            PostSelectParams { ..all() },
                        ),
                    ),
                    (
                        "alias2",
                        arg_select(
                            PostArgs {
                                filter: "hot".into(),
                            },
                            PostSelectParams {
                                slug: get(),
                                title: get(),
                            },
                        ),
                    ),
                    (
                        "alias3".into(),
                        arg_select(
                            PostArgs {
                                filter: "low".into(),
                            },
                            PostSelectParams {
                                slug: get(),
                                title: get(),
                            },
                        ),
                    ),
                ]),
            })?,
        api1.get_post(PostArgs {
            filter: "today".into(),
        })
        .select(PostSelectParams {
            // NOTE: not using `get_post_aliased` so can't use alias
            slug: get(),
            title: get(),
        })?,
    ))?;
    Ok(())
} */

/* #[test]
fn test() {
    main().unwrap()
} */
