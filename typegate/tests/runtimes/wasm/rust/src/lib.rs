// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

wit_bindgen::generate!({ world: "host" });

struct MyHost;
impl Guest for MyHost {
    fn add(a: f64, b: f64) -> f64 {
        a + b
    }

    fn range(a: u32, b: u32) -> Result<Vec<u32>, String> {
        if a > b {
            return Err(format!("invalid range: {a} > {b}"));
        }
        Ok(Vec::from_iter(a..=b))
    }

    fn identity(input: SomeEntity) -> SomeEntity {
        input
    }

    fn record_creation() -> Vec<SomeEntity> {
        let a = SomeEntity {
            name: format!("Entity A"),
            age: None,
            profile: Profile {
                category: Category::A,
                level: Level::Bronze,
                attributes: Capabilities::from_bits_truncate(0b010),
                metadatas: vec![("strength".to_string(), 3.14)],
            },
        };
        let b = SomeEntity {
            name: format!("Entity B"),
            age: Some(11),
            profile: Profile {
                category: Category::B("bbb".to_string()),
                level: Level::Gold,
                attributes: Capabilities::all(),
                metadatas: vec![],
            },
        };
        vec![a, b]
    }
}
export!(MyHost);
