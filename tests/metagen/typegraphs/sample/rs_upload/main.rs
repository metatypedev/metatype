mod client;

use client::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);

    // blocking
    let (res2, res3) = {
        let gql_sync = api1.graphql_sync();

        let res3 = gql_sync.mutation((api1.upload(types::RootUploadFnInputPartial {
            file: Some(
                File::from_bytes("hello".as_bytes())
                    .mime_type("text/plain")
                    .try_into()?,
            ),
            path: Some("files/hello.txt".to_string()),
        }),))?;

        let prepared_m = gql_sync.prepare_mutation(|args| {
            (api1.upload_many(args.get("files", |files: Vec<FileId>| {
                types::RootUploadManyFnInputPartial {
                    files: Some(files),
                    prefix: Some("assets/".to_string()),
                }
            })),)
        })?;

        let prepared_clone = prepared_m.clone();
        let res2 = prepared_clone.perform([(
            "files",
            serde_json::json!([
                FileId::try_from(File::from_bytes("hello".as_bytes()).mime_type("text/plain"))?,
                FileId::try_from(File::from_bytes("world".as_bytes()).mime_type("text/plain"))?,
            ]),
        )])?;

        (res2, res3)
    };

    // non-blocking
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            let gql = api1.graphql();

            let prepared_m = gql.prepare_mutation(|args| {
                (api1.upload(
                    args.get("file", |file: FileId| types::RootUploadFnInputPartial {
                        file: Some(file),
                        path: Some("files/hello.txt".to_string()),
                    }),
                ),)
            })?;
            let prepared_clone = prepared_m.clone();
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
            let res4 = gql
                .mutation((api1.upload_many(types::RootUploadManyFnInputPartial {
                    files: Some(vec![
                        File::from_bytes("hello".as_bytes())
                            .mime_type("text/plain")
                            .try_into()?,
                        File::from_bytes("world".as_bytes())
                            .mime_type("text/plain")
                            .try_into()?,
                    ]),
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
