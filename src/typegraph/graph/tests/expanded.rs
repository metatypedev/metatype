// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{path::Path, process::Command, sync::Arc};

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

    let tg = typegraph::Typegraph::try_from(schema.clone())?;

    println!("namespaces");
    for (ns, obj) in tg.namespace_objects.iter() {
        println!("    /{}: {}", ns.join("/"), obj.name());
    }

    println!("functions");
    for (idx, func) in tg.functions.iter() {
        println!("    {:2}: {}", idx, func.name());
    }

    println!("input_types");
    for (key, ty) in tg.input_types.iter() {
        println!("    {:?}({}): {}", key, ty.tag(), ty.name());
    }

    println!("output_types");
    for (key, ty) in tg.output_types.iter() {
        println!(
            "    {:?}({}): {} parent_idx={}",
            key,
            ty.tag(),
            ty.name(),
            ty.parent().unwrap().idx()
        );
    }

    Ok(())
}
