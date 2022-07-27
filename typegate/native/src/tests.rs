use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::AsRef;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

#[derive(Deserialize, Debug)]
struct TypeNode {
    name: String,
    typedef: String,
    edges: Vec<usize>,
    policies: Vec<usize>,
    runtime: usize,
    data: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize, Debug)]
struct TypeMaterializer {
    name: String,
    runtime: usize,
    data: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize, Debug)]
struct TypeRuntime {
    name: String,
    data: serde_json::Value,
}

#[derive(Deserialize, Debug)]
struct TypeGraph {
    types: Vec<TypeNode>,
    materializers: Vec<TypeMaterializer>,
    runtimes: Vec<TypeRuntime>,
}

#[derive(Deserialize, Debug)]
struct PrismaRuntime {
    connection_string: String,
    datasource: String,
    datamodel: String,
    managed_types: Vec<usize>,
}

// TODO: cache
fn load_typegraph<P: AsRef<Path>>(path: P) -> TypeGraph {
    let tg = std::fs::read_to_string(path).unwrap();

    let mut p = Command::new("../../typegraph/.venv/bin/python3")
        .arg("-")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    p.stdin
        .as_mut()
        .unwrap()
        .write_fmt(format_args!(
            "{tg}\nfrom typegraph.cli import dev\nprint(dev.serialize_typegraph(g))"
        ))
        .unwrap();
    let output = p.wait_with_output().unwrap();
    let json = String::from_utf8(output.stdout).unwrap();
    serde_json::from_str(&json).unwrap()
}

#[derive(Serialize)]
struct GraphQlQuery {
    query: String,
    variables: HashMap<String, serde_json::Value>,
}

fn gql(query: &str) -> serde_json::Value {
    serde_json::to_value(GraphQlQuery {
        query: query.to_string(),
        variables: HashMap::default(),
    })
    .unwrap()
}

struct TestContext {
    datamodel: String,
    engine_id: String,
}

impl TestContext {
    fn new<P: AsRef<Path>>(path: P) -> Self {
        let tg = load_typegraph(path);
        let runtime = tg
            .runtimes
            .into_iter()
            .filter(|r| &r.name == "prisma")
            .map(|r| serde_json::from_value::<PrismaRuntime>(r.data).unwrap())
            .find(|_| true)
            .unwrap();

        let datamodel = format!("{}{}", runtime.datasource, runtime.datamodel);
        println!("MODEL: {datamodel}");

        let reg = crate::prisma_register_engine(crate::PrismaRegisterEngineInp {
            datamodel: datamodel.clone(),
            typegraph: tg.types[0].name.clone(),
        });

        Self {
            datamodel: datamodel,
            engine_id: reg.engine_id,
        }
    }

    fn query(&self, query: &str) -> crate::PrismaQueryOut {
        crate::prisma_query(crate::PrismaQueryInp {
            key: self.engine_id.clone(),
            query: gql(query),
            datamodel: self.datamodel.clone(),
        })
    }
}

fn recreate_db_schema(t: &TestContext) {
    t.query(
        r#"
        mutation a {
            executeRaw(
            query: "DROP SCHEMA IF EXISTS test CASCADE"
            parameters: "[]"
            )
        }
    "#,
    );

    Command::new("../../typegraph/.venv/bin/meta")
        .arg("prisma")
        .arg("apply")
        .arg("-f")
        .arg("../tests/typegraphs/prisma.py")
        .output()
        .unwrap();
}

#[test]
fn simple_record() {
    let t = TestContext::new("../tests/typegraphs/prisma.py");
    recreate_db_schema(&t);

    let ret = t.query(
        r#"
            mutation {
                createOneusers(
                    data: {
                        id: 12
                        name: "User"
                        email: "user@example.com"
                    }
                ) {
                    id
                }
            }
        "#,
    );

    let res = serde_json::from_str::<serde_json::Value>(&ret.res).unwrap();

    use serde_json::Value::*;
    match res {
        Object(ref res) => match res.get("errors") {
            Some(errors) => {
                match errors {
                    Array(errors) => {
                        for error in errors {
                            println!("Error: {}", serde_json::to_string_pretty(error).unwrap());
                        }
                    }
                    _ => println!("Error: {errors}"),
                }
                assert!(false);
            }
            _ => (),
        },
        _ => panic!("Invalid result"),
    }
}
