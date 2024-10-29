mod client;

use client::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);

    // blocking
    let (res3, res4) = {
        let gql_sync = api1.graphql_sync();
        let res3 = gql_sync.mutation((api1.upload(types::RootUploadFnInputPartial {
            file: Some(
                File::from_bytes("hello".as_bytes())
                    .mime_type("text/plain")
                    .try_into()?,
            ),
            path: Some("files/hello.txt".to_string()),
        }),))?;

        let res4 = gql_sync.mutation((api1.upload_many(types::RootUploadManyFnInputPartial {
            files: Some(vec![
                File::from_bytes("hello".as_bytes())
                    .mime_type("text/plain")
                    .try_into()?,
                File::from_bytes("world".as_bytes())
                    .mime_type("text/plain")
                    .try_into()?,
            ]),
            prefix: Some("assets/".to_string()),
        }),))?;

        (res3, res4)
    };

    // non-blocking
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?
        .block_on(async move {
            let gql = api1.graphql();
            let res5 = gql
                .mutation((api1.upload(types::RootUploadFnInputPartial {
                    file: Some(
                        File::from_bytes("hello".as_bytes())
                            .mime_type("text/plain")
                            .try_into()?,
                    ),
                    path: Some("files/hello.txt".to_string()),
                }),))
                .await?;

            let res6 = gql
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
                        "upload": res3.0,
                    },
                    {
                        "uploadMany": res4.0,
                    },
                    {
                        "upload": res5.0,
                    },
                    {
                        "uploadMany": res6.0,
                    },
                ]))?
            );

            Ok(())
        })
}
