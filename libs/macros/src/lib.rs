// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse, DeriveInput, ItemFn};

#[proc_macro_attribute]
pub fn deno(_attr: TokenStream, input: TokenStream) -> TokenStream {
    if let Ok(input) = parse::<ItemFn>(input.clone()) {
        let output = quote! {
            #[cfg_attr(feature = "deno", deno_bindgen::deno_bindgen(non_blocking))]
            #[cfg_attr(not(feature = "deno"), allow(dead_code))]
            #input
        };
        return TokenStream::from(output);
    }
    let input = parse::<DeriveInput>(input).unwrap();
    let output = quote! {
        #[derive(Debug)]
        #[deno_bindgen::deno_bindgen]
        #input
    };
    TokenStream::from(output)
}
