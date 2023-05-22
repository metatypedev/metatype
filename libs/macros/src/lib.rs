// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse, DeriveInput, ItemFn};

fn deno_attr(input: TokenStream, non_blocking: bool) -> TokenStream {
    if let Ok(input) = parse::<ItemFn>(input.clone()) {
        // fn
        let deno = if non_blocking {
            quote! { deno_bindgen::deno_bindgen(non_blocking) }
        } else {
            quote! { deno_bindgen::deno_bindgen }
        };
        let output = quote! {
            #[cfg_attr(feature = "deno", #deno)]
            #[cfg_attr(not(feature = "deno"), allow(dead_code))]
            #input
        };
        TokenStream::from(output)
    } else {
        // struct
        let input = parse::<DeriveInput>(input).unwrap();
        let output = quote! {
            #[derive(Debug)]
            #[deno_bindgen::deno_bindgen]
            #input
        };
        TokenStream::from(output)
    }
}

#[proc_macro_attribute]
pub fn deno(_attr: TokenStream, input: TokenStream) -> TokenStream {
    deno_attr(input, true)
}

#[proc_macro_attribute]
pub fn deno_sync(_attr: TokenStream, input: TokenStream) -> TokenStream {
    deno_attr(input, false)
}
