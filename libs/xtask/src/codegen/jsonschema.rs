// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{Context, Result};
use common::typegraph::runtimes::s3::{S3Materializer, S3RuntimeData};
use common::typegraph::runtimes::{FunctionMatData, ModuleMatData, PrismaRuntimeData};
use common::typegraph::Typegraph;
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
    add_schema!(&mut schema, S3RuntimeData);
    add_schema!(&mut schema, S3Materializer);

    serde_json::to_writer_pretty(&mut file, &schema)?;
    writeln!(file)?;
    println!("  > written at {path:?}", path = path.canonicalize()?);
    Ok(())
}
