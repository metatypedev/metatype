// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::BTreeMap, path::Path, process::Command, sync::Arc};

use typegraph::{TypeNode as _, TypeNodeExt as _};

#[test]
fn test_expanded_graph() -> color_eyre::Result<()> {
    let project_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let path = project_dir
        .join("../../../tests/metagen/typegraphs/metagen.ts")
        .canonicalize()?;
    let output = Command::new("cargo")
        .args(
            "run -p meta-cli -- serialize -1 -f"
                .split(' ')
                .collect::<Vec<_>>(),
        )
        .arg(path)
        .output()?;
    assert!(output.status.success());

    let schema = String::from_utf8(output.stdout)?;
    let schema: tg_schema::Typegraph = serde_json::from_str(&schema)?;
    let schema: Arc<_> = schema.into();

    let tg = typegraph::Typegraph::try_from(schema.clone())?;

    insta::assert_debug_snapshot!(tg
        .namespace_objects
        .iter()
        .map(|(ns, obj)| { (ns.join("/"), obj.name()) })
        .collect::<BTreeMap<_, _>>());

    insta::assert_debug_snapshot!(tg
        .functions
        .iter()
        .map(|(idx, func)| { (idx, func.name()) })
        .collect::<BTreeMap<_, _>>());

    insta::assert_debug_snapshot!(tg
        .input_types
        .iter()
        .map(|(idx, ty)| { (idx, (ty.tag(), ty.name())) })
        .collect::<BTreeMap<_, _>>());

    insta::assert_debug_snapshot!(tg
        .output_types
        .iter()
        .map(|(idx, ty)| { (idx, (ty.tag(), ty.name())) })
        .collect::<BTreeMap<_, _>>());

    Ok(())
}
