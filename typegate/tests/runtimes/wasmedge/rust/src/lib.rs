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
        Ok(Vec::from_iter(a..b))
    }

    fn complex_output() -> (
        SomeEntity,
        String,
        Option<u32>,
        Option<Vec<Result<bool, String>>>,
    ) {
        let entity = SomeEntity {
            age: Some(12),
            category: Category::B("bbb".to_string()),
            name: "Name".to_string(),
        };
        (
            entity,
            "hello".to_string(),
            Some(1234),
            Some(vec![Ok(false), Err("err".to_string())]),
        )
    }
}
export!(MyHost);
