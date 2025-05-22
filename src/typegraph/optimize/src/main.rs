// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

use tg_schema::Typegraph;

fn main() -> color_eyre::eyre::Result<()> {
    let mut buffer = String::new();
    std::io::stdin().read_line(&mut buffer)?;
    let tg: Typegraph = serde_json::from_str(&buffer)?;
    let opt_tg = tg_optimize::optimize(Arc::new(tg));
    println!("{}", serde_json::to_string(opt_tg.as_ref())?);

    Ok(())
}
