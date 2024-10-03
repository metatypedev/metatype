pub mod client;
use client::*;

fn main() -> Result<(), BoxErr> {
    let port = std::env::var("TG_PORT")?;
    let api1 = QueryGraph::new(format!("http://localhost:{port}/sample").parse()?);

    let gql_sync = api1.graphql_sync();

    let res3 = gql_sync.mutation((api1.upload(types::RootUploadFnInputPartial {
        file: Some("hello".as_bytes().to_vec().into()),
        path: None,
    }),))?;
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!([
            {
                "upload": res3.0
            }
        ]))?
    );

    Ok(())
}
