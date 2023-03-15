// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use common::typegraph::{FunctionMatData, ModuleMatData, PrismaRuntimeData, Typegraph};
use schemars::schema_for;
use std::io::Write;
use std::path::Path;
use std::{env, fs};

macro_rules! add_schema {
    ( $root:expr, $type:ty ) => {{
        let schema = schema_for!($type);
        $root.definitions.insert(
            std::stringify!($type).to_owned(),
            schemars::schema::Schema::Object(schema.schema),
        );
        for (name, sch) in schema.definitions.into_iter() {
            $root.definitions.insert(name, sch);
        }
    }};
}

pub fn run() -> Result<()> {
    println!("Generating jsonschema for the typegraph type definitions...");

    let path = &env::var("TG_JSONSCHEMA_OUT")
        .context("Reading codegen out file from env variable")
        .context("TG_JSONSCHEMA_OUT env variable required")?;
    let path = Path::new(&path);

    println!("Writing at {path:?}");
    let mut file = fs::File::options()
        .write(true)
        .create(true)
        .open(path)
        .context("Opening the output file")?;
    file.set_len(0)?;
    let mut schema = schema_for!(Typegraph);
    add_schema!(&mut schema, FunctionMatData);
    add_schema!(&mut schema, ModuleMatData);
    add_schema!(&mut schema, PrismaRuntimeData);

    serde_json::to_writer_pretty(&mut file, &schema)?;
    writeln!(file)?;
    println!("  > written at {path:?}", path = path.canonicalize()?);
    Ok(())
}
