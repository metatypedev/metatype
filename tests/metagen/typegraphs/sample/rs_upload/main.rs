mod client;

use client::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);

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

    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!([
            {
                "upload": res3.0,
            },
            {
                "uploadMany": res4.0,
            }
        ]))?
    );

    Ok(())
}
