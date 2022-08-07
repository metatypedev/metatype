use clap::Parser;

#[derive(Parser, Debug)]
pub struct Serialize {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    typegraph: Option<String>,
}
