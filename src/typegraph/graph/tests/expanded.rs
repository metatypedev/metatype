use std::{path::Path, process::Command, sync::Arc};

use color_eyre::Result;
use typegraph::{TypeNode as _, TypeNodeExt as _};

#[test]
fn test_expanded_graph() -> color_eyre::Result<()> {
    let project_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    eprintln!("project_dir={:?}", project_dir);
    let path = project_dir
        .join("../../../tests/metagen/typegraphs/metagen.ts")
        .canonicalize()?;
    eprintln!("path={:?}", path);
    let output = Command::new("cargo")
        .args(
            "run -p meta-cli -- serialize -1 -f"
                .split(' ')
                .collect::<Vec<_>>(),
        )
        .arg(path)
        .output()?;
    eprintln!("status={}", output.status);
    if !output.status.success() {
        eprintln!("stderr={}", String::from_utf8_lossy(&output.stderr));
        color_eyre::eyre::bail!("error running meta-cli");
    }
    let schema = String::from_utf8(output.stdout)?;
    let schema: tg_schema::Typegraph = serde_json::from_str(&schema)?;
    let schema: Arc<_> = schema.into();

    let tg = typegraph::Typegraph::from(schema.clone());

    println!(
        "named types: {:#?}",
        tg.named
            .values()
            .map(|v| Ok(format!(
                "{}/{} key={:?} parent={:?} children={:?}",
                v.tag(),
                v.name(),
                v.key(),
                v.parent().map(|p| p.name()),
                v.children()?
                    .into_iter()
                    .map(|c| c.name())
                    .collect::<Vec<_>>()
            )))
            .collect::<Result<Vec<_>>>()?
    );
    // println!("namespace_objects: {:?}", tg.namespace_objects);
    // println!("functions: {:?}", tg.functions);
    // println!("input_types: {:?}", tg.input_types);
    // println!("output_types: {:?}", tg.output_types);

    Ok(())
}
