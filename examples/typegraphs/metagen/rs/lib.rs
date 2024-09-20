mod fdk;
pub use fdk::*;

// the macro sets up all the glue
init_mat! {
    // the hook is expected to return a MatBuilder instance
    hook: || {
        // initialize global stuff here if you need it
        MatBuilder::new()
            // register function handlers here
            // each trait will map to the name of the
            // handler found in the typegraph
            .register_handler(stubs::RemixTrack::erased(MyMat))
    }
}

struct MyMat;

impl stubs::RemixTrack for MyMat {
    fn handle(&self, input: types::Idv3, _cx: Ctx) -> anyhow::Result<types::Idv3> {
        Ok(types::Idv3 {
            title: format!("{} (Remix)", input.title),
            artist: format!("{} + DJ Cloud", input.artist),
            release_time: input.release_time,
            mp3_url: "https://mp3.url/shumba2".to_string(),
        })
    }
}
