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

    fn record_creation() -> Vec<SomeEntity> {
        let a = SomeEntity {
            name: format!("Entity A"),
            category: Category::A,
            age: None,
            level: Level::Bronze,
            attributes: Capabilities::from_bits_truncate(0b010),
        };
        let b = SomeEntity {
            name: format!("Entity B"),
            category: Category::B("bbb".to_string()),
            age: Some(11),
            level: Level::Gold,
            attributes: Capabilities::all(),
        };
        vec![a, b]
    }

    fn output_coercion() -> (f32, u64, String, char) {
        (0.3333, 1234, "hello from wit".to_string(), 'A')
    }
}
export!(MyHost);
