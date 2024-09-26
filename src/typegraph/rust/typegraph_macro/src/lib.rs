mod types;

use proc_macro::TokenStream;
use quote::{quote, ToTokens};
use syn::{
    parse_macro_input as parse, punctuated::Punctuated, token::Comma, Expr, ExprArray, ExprLit,
    ItemFn, Lit, LitBool, LitInt, LitStr, Meta, PatLit,
};
use types::{Cors, Rate, TypegraphInitParams};

#[proc_macro_attribute]
pub fn typegraph(attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse!(item as ItemFn);
    let args = parse!(attr with Punctuated::<Meta, syn::Token![,]>::parse_terminated);

    let mut tg_params = TypegraphInitParams::default();

    for arg in args {
        match arg {
            Meta::NameValue(meta) => {
                let ident = meta.path.require_ident().unwrap();
                let expr = meta.value.to_token_stream().into();

                match ident.to_string().as_str() {
                    "name" => tg_params.name = parse!(expr as LitStr).value(),
                    "path" => tg_params.path = parse!(expr as LitStr).value(),
                    "prefix" => tg_params.prefix = parse!(expr as LitStr).value().into(),
                    "dynamic" => tg_params.dynamic = parse!(expr as LitBool).value(),
                    attr => panic!("Unknown typegraph attribute: '{attr}'"),
                }
            }
            Meta::List(list) => {
                let ident = list.path.require_ident().unwrap();
                let tokens = list.tokens.into();
                let args = parse!(tokens with Punctuated::<Meta, syn::Token![,]>::parse_terminated);

                match ident.to_string().as_str() {
                    "cors" => tg_params.cors = parse_cors(args),
                    "rate" => tg_params.rate = parse_rate(args),
                    attr => panic!("Unknown typegraph attribute: '{attr}'"),
                }
            }
            _ => panic!("Unexpected attribute type"),
        }
    }

    let expanded = quote! {
        #input_fn // TODO
    };

    TokenStream::from(expanded)
}

fn parse_str_array(expr: TokenStream) -> Vec<String> {
    let value = parse!(expr as ExprArray); // FIXME: why lol?
    todo!()
}

fn parse_cors(args: Punctuated<Meta, Comma>) -> Cors {
    let mut cors = Cors::default();

    for arg in args {
        let Meta::NameValue(meta) = arg else {
            panic!("Unexpected attribute type");
        };

        let ident = meta.path.require_ident().unwrap();
        let expr: TokenStream = meta.value.to_token_stream().into();

        match ident.to_string().as_str() {
            "allow_origin" => cors.allow_origin = parse_str_array(expr),
            "allow_methods" => cors.allow_methods = parse_str_array(expr),
            "allow_headers" => cors.allow_headers = parse_str_array(expr),
            "allow_credentials" => cors.allow_credentials = parse!(expr as LitBool).value(),
            "expose_headers" => cors.expose_headers = parse_str_array(expr),
            attr => panic!("Unknown cors attribute: '{attr}'"),
        }
    }

    cors
}

fn parse_rate(args: Punctuated<Meta, Comma>) -> Rate {
    let mut rate = Rate::default();

    for arg in args {
        let Meta::NameValue(meta) = arg else {
            panic!("Unexpected attribute type");
        };

        let ident = meta.path.require_ident().unwrap();
        let expr = meta.value.to_token_stream().into();

        match ident.to_string().as_str() {
            "window_sec" => rate.window_sec = parse!(expr as LitInt).base10_parse().unwrap(),
            "window_limit" => rate.window_limit = parse!(expr as LitInt).base10_parse().unwrap(),
            "query_limit" => rate.query_limit = parse!(expr as LitInt).base10_parse().unwrap(),
            "local_excess" => rate.local_excess = parse!(expr as LitInt).base10_parse().unwrap(),
            "context_identifier" => rate.context_identifier = parse!(expr as LitStr).value().into(),
            attr => panic!("Unknown cors attribute: '{attr}'"),
        }
    }

    rate
}
