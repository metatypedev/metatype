// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use common::typegraph::Typegraph;
use schemars::gen::SchemaSettings;
use schemars::schema::SchemaObject;
use schemars::visit::{visit_schema, visit_schema_object, Visitor};
use std::io::Write;
use std::path::Path;
use std::{env, fs};

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

    let schema = SchemaSettings::default()
        .with_visitor(MyVisitor)
        .into_generator()
        .into_root_schema_for::<Typegraph>();

    serde_json::to_writer_pretty(&mut file, &schema)?;
    writeln!(file)?;
    println!("  > written at {path:?}", path = path.canonicalize()?);
    Ok(())
}

#[derive(Clone, Debug)]
struct MyVisitor;

impl Visitor for MyVisitor {
    // remove default for schemas that has no `type` field
    fn visit_schema_object(&mut self, schema: &mut SchemaObject) {
        if let Some(subschemas) = schema.subschemas.as_mut() {
            subschemas
                .one_of
                .iter_mut()
                .flat_map(|schemas| schemas.iter_mut())
                .for_each(|s| visit_schema(self, s));
        }
        if schema.instance_type.is_none() {
            if let Some(mut metadata) = schema.metadata.as_mut() {
                metadata.default = None;
            }
        } else {
            visit_schema_object(self, schema);
        }
    }
}
