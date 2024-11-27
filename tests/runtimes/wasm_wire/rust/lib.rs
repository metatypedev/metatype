// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod fdk;
use anyhow::Context;
use fdk::*;
use serde_json::json;

init_mat! {
    hook: || {
        // initialize global stuff here if you need it
        MatBuilder::new()
            // register function handlers here
            .register_handler(stubs::Identity::erased(MyMat))
            .register_handler(stubs::Add::erased(MyMat))
            .register_handler(stubs::Range::erased(MyMat))
            .register_handler(stubs::RecordCreation::erased(MyMat))
            .register_handler(stubs::HundredRandom::erased(MyMat))
    }
}

struct MyMat;

impl stubs::Identity for MyMat {
    fn handle(&self, input: types::Entity, _cx: Ctx) -> anyhow::Result<types::Entity> {
        Ok(input)
    }
}

impl stubs::Add for MyMat {
    fn handle(&self, input: types::AddArgs, _cx: Ctx) -> anyhow::Result<i64> {
        Ok((input.a + input.b) as _)
    }
}
impl stubs::Range for MyMat {
    fn handle(&self, input: types::RangeArgs, _cx: Ctx) -> anyhow::Result<Vec<i64>> {
        let a = input.a.unwrap_or(1);
        let b = input.b;
        if a > b {
            anyhow::bail!("invalid range: {a} > {b}");
        }
        Ok(Vec::from_iter(a..=b))
    }
}

impl stubs::RecordCreation for MyMat {
    fn handle(
        &self,
        _input: types::RecordCreationInput,
        _cx: Ctx,
    ) -> anyhow::Result<types::RecordCreationOutput> {
        Ok(vec![
            types::Entity {
                name: "Entity A".into(),
                age: None,
                profile: types::Profile {
                    category: types::ProfileCategoryStruct {
                        tag: "a".into(),
                        value: None,
                    },
                    level: "bronze".into(),
                    metadatas: vec![vec![
                        types::ProfileMetadatasEither::EntityNameString("strength".into()),
                        types::ProfileMetadatasEither::AddArgsAFloat(3.14),
                    ]],
                    attributes: vec!["defend".into()],
                },
            },
            types::Entity {
                name: "Entity B".into(),
                age: Some(11),
                profile: types::Profile {
                    category: types::ProfileCategoryStruct {
                        tag: "b".into(),
                        value: Some("bbb".into()),
                    },
                    level: "gold".into(),
                    metadatas: vec![],
                    attributes: vec![format!("attack"), format!("defend"), format!("cast")],
                },
            },
        ])
    }
}

impl stubs::HundredRandom for MyMat {
    fn handle(
        &self,
        _input: types::RecordCreationInput,
        cx: Ctx,
    ) -> anyhow::Result<types::RecordCreationOutput> {
        let mut out = vec![];
        for _ in 0..100 {
            let res: serde_json::Value = cx.gql(
                r#"
query randomEntity {
    random {
        name
        age
        profile {
            level
            attributes
            category {
                tag
                value
            }
            metadatas
        }
    }
}
        "#,
                json!({}),
            )?;
            let random = res["data"]["random"].clone();
            out.push(
                serde_json::from_value(random.clone())
                    .with_context(|| format!("error serializing Entity from json: {res:?}"))?,
            )
        }
        Ok(out)
    }
}
