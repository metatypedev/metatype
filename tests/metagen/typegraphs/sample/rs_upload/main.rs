#![deny(clippy::all)]

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod client;
use client::*;
use metagen_client::prelude::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let addr: Url = format!("http://localhost:{port}/sample").parse()?;
    let api1 = query_graph();

    // blocking
    let (res2, res3) = {
        let gql_sync = transports::graphql_sync(&api1, addr.clone());

        let res3 = gql_sync.mutation((api1.upload(types::RootUploadFnInput {
            file: File::from_bytes("hello".as_bytes())
                .mime_type("text/plain")
                .try_into()?,
            path: Some("files/hello.txt".to_string()),
        }),))?;

        let prepared_m = gql_sync.prepare_mutation(|args| {
            (api1.upload_many(args.get("files", |files: Vec<FileId>| {
                types::RootUploadManyFnInput {
                    files,
                    prefix: Some("assets/".to_string()),
                }
            })),)
        })?;

        let hello_path: FileId = File::from_path("hello.txt").try_into()?;
        let hello_stream: FileId = File::from_reader(std::fs::File::open("hello.txt")?)
            .mime_type("text/plain")
            .try_into()?;

        let prepared_clone = prepared_m.clone();
        let res2 =
            prepared_clone.perform([("files", serde_json::json!([hello_path, hello_stream,]))])?;

        (res2, res3)
    };

    // non-blocking
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            let gql = client::transports::graphql(&api1, addr);

            let prepared_m = gql.prepare_mutation(|args| {
                (
                    api1.upload(args.get("file", |file: FileId| types::RootUploadFnInput {
                        file,
                        path: Some("files/hello.txt".to_string()),
                    })),
                )
            })?;

            let file = File::from_bytes("hello".as_bytes()).mime_type("text/plain");
            let file: FileId = file.try_into()?;
            let res1 = prepared_m
                .perform([("file", serde_json::json!(file))])
                .await?;

            // let res1a  = prepared_m.perform([
            //     (
            //         "file",
            //         serde_json::json!(file)
            //     ),
            // ]).await?;
            //

            use tokio_util::compat::TokioAsyncReadCompatExt as _;
            let hello_path: FileId = File::from_path("hello.txt").try_into()?;
            let hello_stream: FileId =
                File::from_async_reader(tokio::fs::File::open("hello.txt").await?.compat())
                    .mime_type("text/plain")
                    .try_into()?;

            let res4 = gql
                .mutation((api1.upload_many(types::RootUploadManyFnInput {
                    files: vec![hello_path, hello_stream],
                    prefix: Some("assets/".to_string()),
                }),))
                .await?;

            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!([
                    {
                        "upload": res1.0,
                    },
                    // {
                    //     "upload": res1a.0,
                    // },
                    {
                        "uploadMany": res2.0,
                    },
                    {
                        "upload": res3.0,
                    },
                    {
                        "uploadMany": res4.0,
                    },
                ]))?
            );

            Ok(())
        })
}
