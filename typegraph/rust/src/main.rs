use typegraph_core::core::Core;
use typegraph_core::Lib as t;

fn main() {
    println!("Hello, world!");

    let a = t::integerb();
    let b = t::integerb();

    println!(
        "a: {:?}",
        t::structb(vec![("a".to_string(), a), ("b".to_string(), b)])
    );
}
