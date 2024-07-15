(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4191],{48372:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>u,contentTitle:()=>l,default:()=>h,frontMatter:()=>o,metadata:()=>d,toc:()=>m});var r=t(86070),s=t(25710),a=t(65671),i=t(7871);const o={sidebar_position:50},l="Wasm functions",d={id:"guides/wasm-functions/index",title:"Wasm functions",description:"The following feature is not yet stable.",source:"@site/docs/guides/wasm-functions/index.mdx",sourceDirName:"guides/wasm-functions",slug:"/guides/wasm-functions/",permalink:"/docs/guides/wasm-functions/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/wasm-functions/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Secure your requests",permalink:"/docs/guides/securing-requests/"},next:{title:"Self-host the Typegate",permalink:"/docs/guides/self-hosting"}},u={},m=[{value:"Tooling",id:"tooling",level:2},{value:"Typegraph",id:"typegraph",level:2},{value:"Metagen",id:"metagen",level:2},{value:"Building",id:"building",level:2}];function c(e){const n={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",li:"li",ol:"ol",p:"p",pre:"pre",...(0,s.R)(),...e.components},{Details:o}=n;return o||function(e,n){throw new Error("Expected "+(n?"component":"object")+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}("Details",!0),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"wasm-functions",children:"Wasm functions"}),"\n",(0,r.jsx)(n.admonition,{title:"Beta",type:"warning",children:(0,r.jsx)(n.p,{children:"The following feature is not yet stable."})}),"\n",(0,r.jsxs)(n.p,{children:["The ",(0,r.jsx)(n.a,{href:"/docs/reference/runtimes/wasm",children:(0,r.jsx)(n.code,{children:"WasmRuntime"})})," enables one to use any langauge/ecosystem with a toolchain capable of producing wasm artifacts to author ",(0,r.jsx)(n.a,{href:"/docs/guides/external-functions",children:"custom functions"}),". ",(0,r.jsx)(n.a,{href:"https://rust-lang.org",children:"Rust"})," is one such a language and has shaped up to be the hotspot of development in the wasm ecosystem (The Metatype itself platform has many rusty parts). In this guide, we'll see how to set up a workflow for using Rust for our custom functions."]}),"\n",(0,r.jsx)(n.h2,{id:"tooling",children:"Tooling"}),"\n",(0,r.jsx)(n.p,{children:"We need to install several programs to be able to produce the components. The following checklist contains links to get you started:"}),"\n",(0,r.jsxs)(n.ol,{children:["\n",(0,r.jsxs)(n.li,{children:["Rust compiler toolchain: this guide assumes moderate familiartiy of development with rust and won't spend many words on how to get it functional. In any case, you can get started with rust ",(0,r.jsx)(n.a,{href:"https://www.rust-lang.org/learn/get-started",children:"here"}),"."]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"wasm32-unknown-unknown"})," target for rustc: This is the backend that rustc uses to produce wasi compatible wasm components. If you're using ",(0,r.jsx)(n.code,{children:"rustup"})," to manage your toolchain, Cargo will automatically install the target when you're building."]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"wasm-tools"}),": this is the swiss army knife for working with wasm artifacts, courtesy of the ",(0,r.jsx)(n.a,{href:"https://bytecodealliance.org/",children:"Bytecode Alliance"}),". Installation instructions can be found ",(0,r.jsx)(n.a,{href:"https://github.com/bytecodealliance/wasm-tools/",children:"here"}),"."]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"typegraph",children:"Typegraph"}),"\n",(0,r.jsxs)(n.p,{children:["The ",(0,r.jsx)(n.code,{children:"WasmRuntime"})," currently comes in two flavours that are both based on the wasm component spec. This guide focues on the ",(0,r.jsx)(n.code,{children:"wire"})," flavour, where your component is expected to implement a standard WIT interface that's designed around a simple Json based RPC wire format. Thankfully, all of that boilerplate is easy to automate away and that's exactly what we'll do using ",(0,r.jsx)(n.a,{href:"/docs/reference/metagen",children:"metagen"})," to generate the binding code."]}),"\n",(0,r.jsx)(n.p,{children:"Before anything though, we need to author the typegraph:"}),"\n",(0,r.jsx)(a.A,{python:t(45209),typescript:t(68863),disablePlayground:!0}),"\n",(0,r.jsxs)(n.p,{children:["Note that the ",(0,r.jsx)(n.code,{children:"WasmRuntime"})," constructor mentions a non-existent wasm file on disk. This won't be a problem for the metagen generators but we'll need to produce the artifact before we deploy the typegraph. We'll see what buliding the artifact entails in just a minute."]}),"\n",(0,r.jsx)(n.h2,{id:"metagen",children:"Metagen"}),"\n",(0,r.jsxs)(n.p,{children:["We can now tackle the boilerplate. Metagen bundles the ",(0,r.jsx)(n.a,{href:"/docs/reference/metagen#mdk_rust",children:(0,r.jsx)(n.code,{children:"mdk_rust"})})," generator which can generate all the glue code along with Rust types that correspond to our typegraph types. Let's configure a metagen target in our configuration file to get just that done."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-yaml",children:"metagen:\n  targets:\n    metagen_rs:\n      # this is the generator we're interested in\n      - generator: mdk_rust\n        # the location where to put the generated files\n        path: ./metagen/rs/\n        # the path to our typegraph\n        typegraph_path: ./metagen-rs.ts\n"})}),"\n",(0,r.jsxs)(n.p,{children:["The configuration file is read by the ",(0,r.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta CLI"})," which also bundles the metagen suite. This means we can invoke the target from the command line like so:"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"meta gen metagen_rs\n"})}),"\n",(0,r.jsx)(n.p,{children:"This should give us the following files:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-shell",children:"\u276f lsd --tree metagen/rs/\n\uf115 rs\n\u251c\u2500\u2500 \ue7a8 Cargo.toml\n\u251c\u2500\u2500 \ue7a8 lib.rs\n\u2514\u2500\u2500 \ue7a8 mdk.rs\n"})}),"\n",(0,r.jsxs)(n.p,{children:["By default, the ",(0,r.jsx)(n.code,{children:"mdk_rust"})," generator outputs all the necessary files required to build our wasm file. This includes the ",(0,r.jsx)(n.code,{children:"Cargo.toml"})," manifest for our Rust crate."]}),"\n",(0,r.jsx)(i.A,{language:"toml",children:t(94317).content}),"\n",(0,r.jsxs)(n.p,{children:[(0,r.jsx)(n.code,{children:"mdk_rust"})," will not overwrite a ",(0,r.jsx)(n.code,{children:"Cargo.toml"})," file discovored at generation path so you can add other dependencies if need be."]}),"\n",(0,r.jsxs)(n.p,{children:["The ",(0,r.jsx)(n.code,{children:"mdk.rs"})," file contains all the glue code including the typegraph types."]}),"\n",(0,r.jsxs)(o,{children:[(0,r.jsx)("summary",{children:(0,r.jsx)(n.p,{children:"Code generation sample. It's collapsed here as it's for the most part an\nuninteresting implementation detail."})}),(0,r.jsx)(i.A,{language:"rust",children:t(79098).content})]}),"\n",(0,r.jsx)(n.p,{children:"When working on the typegraph, we can run metagen again to regenerate this file and get the latest types."}),"\n",(0,r.jsxs)(n.p,{children:["The generator also includes a sample ",(0,r.jsx)(n.code,{children:"lib.rs"})," entrypoint file for our crate. We'll modify it now to implement our custom function."]}),"\n",(0,r.jsx)(i.A,{language:"rust",children:t(79567).content}),"\n",(0,r.jsx)(n.h2,{id:"building",children:"Building"}),"\n",(0,r.jsx)(n.p,{children:"We'll now use the rust toolchain and wasm-tools to build the wasm component. This requires multiple commands. It's presented below as a shell script that you can modify from."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"# flags to make script execution visible\nset -eux\n\n# regenerate code before building\nmeta gen metagen_rs\n\n# variablize common names\nTARGET=wasm32-wasi\nCRATE_NAME=metagen_rs_mdk\n\n# build in release mode for smallest sizes\ncargo build -p $CRATE_NAME --target $TARGET --release\n# use wasm-tools to change wasm file into wasm component\nwasm-tools component new \\\n  # rust builds the wasm file under the name of the crate\n  ./target/$TARGET/debug/$CRATE_NAME.wasm \\\n  -o ./target/rust-component.wasm \\\n\n# copy the component to a location that we specified\n# in our typegraph\ncp ./target/rust-component.wasm ./rust.wasm\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Put the shell script into a file like ",(0,r.jsx)(n.code,{children:"build.sh"})," and execute it with a posix compatible shell like ",(0,r.jsx)(n.code,{children:"bash"}),". You should now have all the files to deploy your typegraph."]}),"\n",(0,r.jsx)(a.A,{typegraph:"metagen-rs",typescript:t(68863),python:t(45209),query:t(48734)})]})}function h(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},48734:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"remix"},arguments:[{kind:"Argument",name:{kind:"Name",value:"title"},value:{kind:"StringValue",value:"Lovefool",block:!1}},{kind:"Argument",name:{kind:"Name",value:"artist"},value:{kind:"StringValue",value:"The Cardigans",block:!1}},{kind:"Argument",name:{kind:"Name",value:"releaseTime"},value:{kind:"StringValue",value:"1996-06-29T10:30:40.340Z",block:!1}},{kind:"Argument",name:{kind:"Name",value:"mp3Url"},value:{kind:"StringValue",value:"https://mus.ic/lovefool.mp3",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"artist"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"releaseTime"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mp3Url"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:213}};n.loc.source={body:'query {\n  remix(\n    title: "Lovefool"\n    artist: "The Cardigans"\n    releaseTime: "1996-06-29T10:30:40.340Z"\n    mp3Url: "https://mus.ic/lovefool.mp3"\n  ) {\n    title\n    artist\n    releaseTime\n    mp3Url\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var r=e.type;"NamedType"===r.kind&&n.add(r.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var r={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),r[e.name.value]=n}})),e.exports=n},45209:e=>{e.exports={content:'@typegraph(\n)\ndef metagen_rs(g: Graph):\n  idv3 = t.struct(\n    {\n      "title": t.string(),\n      "artist": t.string(),\n      "releaseTime": t.datetime(),\n      "mp3Url": t.uri(),\n      # explicit type names help when generating code\n    }\n  ).rename("idv3")\n\n  # the wire flavour is availible through a static\n  # constructor\n  wasm = WasmRuntime.wire("metagen/rust.wasm")\n\n  g.expose(\n    Policy.public(),\n    remix=wasm.handler(\n      idv3,\n      idv3,\n      name="remix_track",\n    ).rename("remix_track"),  # explicit names help\n  )',path:"examples/typegraphs/metagen-rs.py"}},68863:e=>{e.exports={content:'await typegraph(\n  {\n    name: "metagen-rs",\n  },\n  (g) => {\n    const idv3 = t\n      .struct({\n        title: t.string(),\n        artist: t.string(),\n        releaseTime: t.datetime(),\n        mp3Url: t.uri(),\n        // explicit type names help when generating code\n      })\n      .rename("idv3");\n\n    // the wire flavour is availible through a static\n    // constructor\n    const wasm = WasmRuntime.wire("metagen/rust.wasm");\n\n    g.expose(\n      {\n        remix: wasm\n          .handler(\n            idv3,\n            idv3,\n            {\n              name: "remix_track",\n            }\n            // the traits will map to the name of the materializer\n            // and also the the name of the handler mentioned above\n          )\n          .rename("remix_track"),\n      },\n      Policy.public()\n    );\n  }\n);',path:"examples/typegraphs/metagen-rs.ts"}},94317:e=>{e.exports={content:'package.name = "metagen_rs_mdk"\npackage.edition = "2021"\npackage.version = "0.0.1"\n\n# we need to use a specific library crate type to build\n# wasm components in rust\n[lib]\npath = "lib.rs"\ncrate-type = ["cdylib", "rlib"]\n\n# the following dependencies are used by the generated code\n[dependencies]\nanyhow = "1" # error handling\nserde = { version = "1", features = ["derive"] } # serialization\nserde_json = "1" #json serialization\nwit-bindgen = "0.22.0" # wasm component biding\n\n# we set the following flags to minimize code size \n# when buliding in the release mode\n# this keeps our wasm files small\n[profile.release]\nstrip = "symbols"\nopt-level = "z"',path:"examples/typegraphs/metagen/rs/Cargo.toml"}},79567:e=>{e.exports={content:'mod mdk;\npub use mdk::*;\n\n// the macro sets up all the glue\ninit_mat! {\n    // the hook is expected to return a MatBuilder instance\n    hook: || {\n        // initialize global stuff here if you need it\n        MatBuilder::new()\n            // register function handlers here\n            // each trait will map to the name of the\n            // handler found in the typegraph\n            .register_handler(stubs::RemixTrack::erased(MyMat))\n    }\n}\n\nstruct MyMat;\n\nimpl stubs::RemixTrack for MyMat {\n    fn handle(&self, input: types::Idv3, _cx: Ctx) -> anyhow::Result<types::Idv3> {\n        Ok(types::Idv3 {\n            title: format!("{} (Remix)", input.title),\n            artist: format!("{} + DJ Cloud", input.artist),\n            release_time: input.release_time,\n            mp3_url: "https://mp3.url/shumba2".to_string(),\n        })\n    }\n}',path:"examples/typegraphs/metagen/rs/lib.rs"}},79098:e=>{e.exports={content:'// This file was @generated by metagen and is intended\n// to be generated again on subsequent metagen runs.\n#![cfg_attr(rustfmt, rustfmt_skip)]\n\n// gen-static-start\n#![allow(unused)]\n\npub mod wit {\n    wit_bindgen::generate!({\n        pub_export_macro: true,\n        \n        inline: "package metatype:wit-wire;\n\ninterface typegate-wire {\n  hostcall: func(op-name: string, json: string) -> result<string, string>;\n}\n\ninterface mat-wire {\n  type json-str = string;\n\n  record mat-info {\n    op-name: string,\n    mat-title: string,\n    mat-hash: string,\n    mat-data-json: string,\n  }\n\n  record init-args {\n    metatype-version: string,\n    expected-ops: list<mat-info>\n  }\n\n  record init-response {\n    ok: bool\n  }\n\n  variant init-error {\n    version-mismatch(string),\n    unexpected-mat(mat-info),\n    other(string)\n  }\n\n  init: func(args: init-args) -> result<init-response, init-error>;\n\n  record handle-req {\n    op-name: string,\n    in-json: json-str,\n  }\n\n  variant handle-err {\n    no-handler,\n    in-json-err(string),\n    handler-err(string),\n  }\n\n  handle: func(req: handle-req) -> result<json-str, handle-err>;\n}\n\nworld wit-wire {\n  import typegate-wire;\n\n  export mat-wire;\n}\n"\n    });\n}\n\nuse std::cell::RefCell;\nuse std::collections::HashMap;\n\nuse wit::exports::metatype::wit_wire::mat_wire::*;\nuse wit::metatype::wit_wire::typegate_wire::hostcall;\n\npub type HandlerFn = Box<dyn Fn(&str, Ctx) -> Result<String, HandleErr>>;\n\npub struct ErasedHandler {\n    mat_id: String,\n    mat_trait: String,\n    mat_title: String,\n    handler_fn: HandlerFn,\n}\n\npub struct MatBuilder {\n    handlers: HashMap<String, ErasedHandler>,\n}\n\nimpl MatBuilder {\n    pub fn new() -> Self {\n        Self {\n            handlers: Default::default(),\n        }\n    }\n\n    pub fn register_handler(mut self, handler: ErasedHandler) -> Self {\n        self.handlers.insert(handler.mat_trait.clone(), handler);\n        self\n    }\n}\n\npub struct Router {\n    handlers: HashMap<String, ErasedHandler>,\n}\n\nimpl Router {\n    pub fn from_builder(builder: MatBuilder) -> Self {\n        Self {\n            handlers: builder.handlers,\n        }\n    }\n\n    pub fn init(&self, args: InitArgs) -> Result<InitResponse, InitError> {\n        static MT_VERSION: &str = "0.4.4-0";\n        if args.metatype_version != MT_VERSION {\n            return Err(InitError::VersionMismatch(MT_VERSION.into()));\n        }\n        for info in args.expected_ops {\n            let mat_trait = stubs::op_to_trait_name(&info.op_name);\n            if !self.handlers.contains_key(mat_trait) {\n                return Err(InitError::UnexpectedMat(info));\n            }\n        }\n        Ok(InitResponse { ok: true })\n    }\n\n    pub fn handle(&self, req: HandleReq) -> Result<String, HandleErr> {\n        let mat_trait = stubs::op_to_trait_name(&req.op_name);\n        let Some(handler) = self.handlers.get(mat_trait) else {\n            return Err(HandleErr::NoHandler);\n        };\n        let cx = Ctx {};\n        (handler.handler_fn)(&req.in_json, cx)\n    }\n}\n\npub type InitCallback = fn() -> anyhow::Result<MatBuilder>;\n\nthread_local! {\n    pub static MAT_STATE: RefCell<Router> = panic!("MAT_STATE has not been initialized");\n}\n\npub struct Ctx {}\n\nimpl Ctx {\n    pub fn gql<O>(\n        &self,\n        query: &str,\n        variables: impl Into<serde_json::Value>,\n    ) -> Result<O, GraphqlRunError>\n    where\n        O: serde::de::DeserializeOwned,\n    {\n        match hostcall(\n            "gql",\n            &serde_json::to_string(&serde_json::json!({\n                "query": query,\n                "variables": variables.into(),\n            }))?,\n        ) {\n            Ok(json) => Ok(serde_json::from_str(&json[..])?),\n            Err(json) => Err(GraphqlRunError::HostError(serde_json::from_str(&json)?)),\n        }\n    }\n}\n\n#[derive(Debug)]\npub enum GraphqlRunError {\n    JsonError(serde_json::Error),\n    HostError(serde_json::Value),\n}\n\nimpl std::error::Error for GraphqlRunError {}\n\nimpl From<serde_json::Error> for GraphqlRunError {\n    fn from(value: serde_json::Error) -> Self {\n        Self::JsonError(value)\n    }\n}\n\nimpl std::fmt::Display for GraphqlRunError {\n    fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result {\n        match self {\n            GraphqlRunError::JsonError(msg) => write!(f, "json error: {msg}"),\n            GraphqlRunError::HostError(serde_json::Value::Object(map))\n                if map.contains_key("message") =>\n            {\n                write!(f, "host error: {}", map["message"])\n            }\n            GraphqlRunError::HostError(val) => write!(f, "host error: {val:?}"),\n        }\n    }\n}\n\n#[macro_export]\nmacro_rules! init_mat {\n    (hook: $init_hook:expr) => {\n        struct MatWireGuest;\n        use wit::exports::metatype::wit_wire::mat_wire::*;\n        wit::export!(MatWireGuest with_types_in wit);\n\n        #[allow(unused)]\n        impl Guest for MatWireGuest {\n            fn handle(req: HandleReq) -> Result<String, HandleErr> {\n                MAT_STATE.with(|router| {\n                    let router = router.borrow();\n                    router.handle(req)\n                })\n            }\n\n            fn init(args: InitArgs) -> Result<InitResponse, InitError> {\n                let hook = $init_hook;\n                let router = Router::from_builder(hook());\n                let resp = router.init(args)?;\n                MAT_STATE.set(router);\n                Ok(resp)\n            }\n        }\n    };\n}\n// gen-static-end\nuse types::*;\npub mod types {\n    use super::*;\n    pub type StringDateTime = String;\n    pub type StringUri = String;\n    #[derive(Debug, serde::Serialize, serde::Deserialize)]\n    pub struct Idv3 {\n        pub title: String,\n        pub artist: String,\n        #[serde(rename = "releaseTime")]\n        pub release_time: StringDateTime,\n        #[serde(rename = "mp3Url")]\n        pub mp3_url: StringUri,\n    }\n}\nuse stubs::*;\npub mod stubs {\n    use super::*;\n    pub trait RemixTrack: Sized + \'static {\n        fn erased(self) -> ErasedHandler {\n            ErasedHandler {\n                mat_id: "remix_track".into(),\n                mat_title: "remix_track".into(),\n                mat_trait: "RemixTrack".into(),\n                handler_fn: Box::new(move |req, cx| {\n                    let req = serde_json::from_str(req)\n                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;\n                    let res = self\n                        .handle(req, cx)\n                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;\n                    serde_json::to_string(&res)\n                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))\n                }),\n            }\n        }\n\n        fn handle(&self, input: Idv3, cx: Ctx) -> anyhow::Result<Idv3>;\n    }\n    pub fn op_to_trait_name(op_name: &str) -> &\'static str {\n        match op_name {\n            "remix_track" => "RemixTrack",\n            _ => panic!("unrecognized op_name: {op_name}"),\n        }\n    }\n}',path:"examples/typegraphs/metagen/rs/mdk.rs"}}}]);