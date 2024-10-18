(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4947],{98143:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>u,frontMatter:()=>o,metadata:()=>d,toc:()=>p});var r=t(86070),s=t(25710),i=t(65671),a=t(7871);const o={},l=void 0,d={id:"reference/metagen/index",title:"index",description:"/typegrap/typegraphh---",source:"@site/docs/reference/metagen/index.mdx",sourceDirName:"reference/metagen",slug:"/reference/metagen/",permalink:"/docs/reference/metagen/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/docs/metatype.dev/docs/reference/metagen/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Changelog",permalink:"/docs/reference/changelog"},next:{title:"Features overview",permalink:"/docs/concepts/features-overview/"}},c={},p=[{value:"/typegrap/typegraphh---\nsidebar_position: 50",id:"typegraptypegraphh---sidebar_position-50",level:2},{value:"Access through CLI",id:"access-through-cli",level:2},{value:"Access through SDK",id:"access-through-sdk",level:2},{value:"Generators",id:"generators",level:2},{value:"<code>client_ts</code>",id:"client_ts",level:3},{value:"<code>client_py</code>",id:"client_py",level:3},{value:"<code>client_rs</code>",id:"client_rs",level:3},{value:"<code>fdk_typescript</code>",id:"fdk_typescript",level:3},{value:"<code>fdk_python</code>",id:"fdk_python",level:3},{value:"<code>fdk_rust</code>",id:"fdk_rust",level:3}];function h(e){const n={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,s.R)(),...e.components},{Details:o}=n;return o||function(e,n){throw new Error("Expected "+(n?"component":"object")+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}("Details",!0),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h2,{id:"typegraptypegraphh---sidebar_position-50",children:"/typegrap/typegraphh---\nsidebar_position: 50"}),"\n","\n",(0,r.jsx)(n.h1,{id:"metagen",children:"Metagen"}),"\n",(0,r.jsx)(n.admonition,{title:"Beta",type:"warning",children:(0,r.jsx)(n.p,{children:"The following feature is not yet stable."})}),"\n",(0,r.jsx)(n.p,{children:"Metagen is a code-generator suite that contains implementations that help with development on the Metatype platform. Today, this means a set of generators to:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Generate code-first, typesafe clients for your typegraph"}),"\n",(0,r.jsxs)(n.li,{children:["Help with ",(0,r.jsx)(n.a,{href:"/docs/guides/external-functions",children:"custom functions"})," by generating types, serializers and bindings."]}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["It's availaible bundled within the ",(0,r.jsx)(n.a,{href:"/docs/reference/meta-cli",children:"meta CLI"})," and the ",(0,r.jsx)(n.a,{href:"/docs/reference/typegraph#sdks",children:"typegraph SDKs"}),"."]}),"\n",(0,r.jsx)(n.h2,{id:"access-through-cli",children:"Access through CLI"}),"\n",(0,r.jsxs)(n.p,{children:["The meta-cli has a dedicated ",(0,r.jsx)(n.code,{children:"gen"})," command for interacting with metagen. We configure the generators through the ",(0,r.jsx)(n.a,{href:"/docs/reference/meta-cli/configuration-file",children:"standard configuration file"})," under the metagen key."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-yaml",children:'typegates:\n  # bla bla\n\ntypegraphs:\n  # bla bla\n\nmetagen:\n  targets:\n    main:\n      # generator to use\n      - generator: fdk_rust\n        # path to generate to\n        path: ./bff/\n        # typegraph path to use\n        typegraph_path: ./typegraphs/svc-bff.ts\n        # we can have multiple generators per target\n      - generator: fdk_rust\n        path: ./telemetry/\n        typegraph_path: ./typegraphs/svc-telemetry.ts\n        # generators might have custom keys\n        stubbed_runtimes: ["wasm_wire", "deno"]\n    # more than one targets avail if you need them\n    iter:\n      - generator: client_ts\n        path: ./next_app/\n        # name of typegraph to read from typegate\n        typegraph: svc_bff\n'})}),"\n",(0,r.jsx)(n.p,{children:"This allows us to invoke the targets from the CLI."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"meta cli gen main\n"})}),"\n",(0,r.jsxs)(n.p,{children:["This will resolve the requisite typegraphs, serialize as needed and put the resulting files at the appropriate locations. If no target name is provied, the CLI will look for a target under the key ",(0,r.jsx)(n.code,{children:"main"})," and invoke it instead."]}),"\n",(0,r.jsx)(n.h2,{id:"access-through-sdk",children:"Access through SDK"}),"\n",(0,r.jsx)(n.p,{children:"Metagen is availaible through the SDK for programmatic access needs and can be helpful when writing tests or when relying on the CLI is not an option."}),"\n",(0,r.jsx)(i.A,{python:t(7797),typescript:t(19507),disablePlayground:!0}),"\n",(0,r.jsx)(n.h2,{id:"generators",children:"Generators"}),"\n",(0,r.jsxs)(n.admonition,{title:"Chicken or the egg?",type:"info",children:[(0,r.jsx)(n.p,{children:"As most of the generators are intended for types to be used by custom functions, they'll require that you declare the custom functions in your typegraph first. This begs the question, how does one declare custom functions that depend on artifacts that are yet to be generated? Typegraphs error out when referenced artifacts aren't found, how does it work in this scenario?"}),(0,r.jsxs)(n.p,{children:["To resolve this concern, the SDKs support a serialization mode that skips resolution of artifacts. This mode is activated when serialization is done for codegen purposes. What this means is that, ",(0,r.jsx)(n.strong,{children:"you can declare non-existent files in your typegraph and codegen should work"}),". Some generators are even smart enough to work around your expected files. Of course, if the files aren't present when you're trying to deply to the typegate, it'll raise an error."]})]}),"\n",(0,r.jsx)(n.h3,{id:"client_ts",children:(0,r.jsx)(n.code,{children:"client_ts"})}),"\n",(0,r.jsx)(n.p,{children:"This generator supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Types and query builders based on your typegraph"}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",children:(0,r.jsx)(n.code,{children:"fetch"})})," based ",(0,r.jsx)(n.code,{children:"GraphQlTransport"})," implementation","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Requires Node.js version ",(0,r.jsx)(n.code,{children:"v17.5.0"})," and ",(0,r.jsx)(n.a,{href:"https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch",children:"up"}),"."]}),"\n",(0,r.jsxs)(n.li,{children:["Requires using ",(0,r.jsx)(n.code,{children:"--experimental-fetch"})," flag if on Node.js version below v18.0.0"]}),"\n",(0,r.jsx)(n.li,{children:"Provides async queries"}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.li,{children:"Prepared requests and aliases"}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["Refer to the ",(0,r.jsx)(n.a,{href:"/docs/reference/typegraph/client/",children:"client reference"})," for usage guidelines and examples."]}),"\n",(0,r.jsx)(n.h3,{id:"client_py",children:(0,r.jsx)(n.code,{children:"client_py"})}),"\n",(0,r.jsx)(n.p,{children:"This generator supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Types and query builders based on your typegraph"}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"urlib"})," based ",(0,r.jsx)(n.code,{children:"GraphQlTransport"})," implementation.","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Provides sync and async queries"}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.li,{children:"Prepared requests and aliases"}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["Refer to the ",(0,r.jsx)(n.a,{href:"/docs/reference/typegraph/client/",children:"client reference"})," for usage guidelines and examples."]}),"\n",(0,r.jsx)(n.h3,{id:"client_rs",children:(0,r.jsx)(n.code,{children:"client_rs"})}),"\n",(0,r.jsx)(n.p,{children:"This generator supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Types and query builders based on your typegraph"}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"https://lib.rs/crates/reqwest",children:(0,r.jsx)(n.code,{children:"reqwest"})})," based ",(0,r.jsx)(n.code,{children:"GraphQlTransport"})," implementation","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Provides sync and async queries"}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.li,{children:"Prepared requests and aliases"}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["Refer to the ",(0,r.jsx)(n.a,{href:"/docs/reference/typegraph/client/",children:"client reference"})," for usage guidelines and examples."]}),"\n",(0,r.jsx)(n.h3,{id:"fdk_typescript",children:(0,r.jsx)(n.code,{children:"fdk_typescript"})}),"\n",(0,r.jsx)(n.p,{children:"This generator supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Typescript types that map to typegraph types"}),"\n",(0,r.jsxs)(n.li,{children:["Stub function types for custom functions implementors that adhere to typegraph functions.","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["By default, all function types from the ",(0,r.jsx)(n.code,{children:"DenoRuntime"})," get stub types."]}),"\n",(0,r.jsxs)(n.li,{children:["Use ",(0,r.jsx)(n.code,{children:"stubbed_runtimes"})," to select which runtimes get stubs."]}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.a,{href:"#client_ts",children:(0,r.jsx)(n.code,{children:"client_ts"})})," based typegraph client","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Special ",(0,r.jsx)(n.code,{children:"HostcallTransport"})," implementation"]}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"The following example showcases the generator."}),"\n",(0,r.jsx)(n.p,{children:"Typegraph:"}),"\n",(0,r.jsx)(i.A,{python:t(14037),typescript:t(14037),disablePlayground:!0}),"\n",(0,r.jsx)(n.p,{children:"Custom function:"}),"\n",(0,r.jsx)(i.A,{typescript:t(13246),disablePlayground:!0}),"\n",(0,r.jsxs)(o,{children:[(0,r.jsx)("summary",{children:(0,r.jsx)(n.p,{children:"Code generation sample."})}),(0,r.jsx)(i.A,{typescript:t(96280),disablePlayground:!0})]}),"\n",(0,r.jsx)(n.p,{children:"It supports the following extra configuration keys."}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Key"}),(0,r.jsx)(n.th,{children:"Type"}),(0,r.jsx)(n.th,{children:"Default"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsx)(n.tbody,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"stubbed_runtimes"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"string[]"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:'["deno"]'})}),(0,r.jsx)(n.td,{children:"Runtimes for which to generate stub types."})]})})]}),"\n",(0,r.jsx)(n.h3,{id:"fdk_python",children:(0,r.jsx)(n.code,{children:"fdk_python"})}),"\n",(0,r.jsx)(n.p,{children:"This generator supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsx)(n.li,{children:"Python classes that map to typegraph types"}),"\n",(0,r.jsxs)(n.li,{children:["Decorators for custom functions implementors that require adherance to typegraph function types.","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["By default, all functions from the ",(0,r.jsx)(n.code,{children:"PythonRuntime"})," get stub types."]}),"\n",(0,r.jsxs)(n.li,{children:["TODO: ",(0,r.jsx)(n.code,{children:"stubbed_runtimes"})," for ",(0,r.jsx)(n.code,{children:"fdk_python"})]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.li,{children:"TODO: types for interacting with the typegate from within custom functions."}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"If the referenced module for the custom function is not found, the generator will also output stub implementation (in addition to the types) at the given type. It will not replace our code on a second run."}),"\n",(0,r.jsx)(n.p,{children:"The following example showcases the generator."}),"\n",(0,r.jsx)(n.p,{children:"Typegraph:"}),"\n",(0,r.jsx)(i.A,{typescript:t(62292),disablePlayground:!0}),"\n",(0,r.jsx)(n.p,{children:"Custom function:"}),"\n",(0,r.jsx)(i.A,{python:t(28434),disablePlayground:!0}),"\n",(0,r.jsxs)(o,{children:[(0,r.jsx)("summary",{children:(0,r.jsx)(n.p,{children:"Code generation sample."})}),(0,r.jsx)(i.A,{python:t(95696),disablePlayground:!0})]}),"\n",(0,r.jsx)(n.h3,{id:"fdk_rust",children:(0,r.jsx)(n.code,{children:"fdk_rust"})}),"\n",(0,r.jsx)(n.p,{children:"This generator generates types, serializers and bindings needed to implement custom functions in Rust. Rust implementations will need to be compiled to wasm components to be executed on the metatype platform and the generator assumes such usage."}),"\n",(0,r.jsx)(n.p,{children:"To be more specific, it supports:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Rust types that map to typegraph defined types","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Serialization is handled out of sight through ",(0,r.jsx)(n.a,{href:"https://lib.rs/serde_json",children:(0,r.jsx)(n.code,{children:"serde_json"})})]}),"\n"]}),"\n"]}),"\n",(0,r.jsxs)(n.li,{children:["Stub traits for custom functions implementors that adhere to typegraph functions.","\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["By default, all functions from the ",(0,r.jsx)(n.code,{children:"WasmRuntime"})," get stub types."]}),"\n",(0,r.jsxs)(n.li,{children:["The generator assumes the ",(0,r.jsx)(n.code,{children:"wire"})," based wasm interface is being targetted."]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"stubbed_runtimes"})," key can be used to configure stub generation from additional runtimes."]}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(n.li,{children:"Types for interacting with the typegate from within custom functions."}),"\n",(0,r.jsxs)(n.li,{children:["Glue code for setting up the wasm component to be run within the ",(0,r.jsx)(n.code,{children:"WasmRuntime"}),"."]}),"\n"]}),"\n",(0,r.jsx)(n.p,{children:"By default the generator will also output a library crate entrypoint and a functional Cargo.toml with all the required dependencies. These additional files wlil not be overwritten on a second run. The generator can also be configured to avoid generating them even if not present."}),"\n",(0,r.jsx)(n.p,{children:"The following example showcases the generator."}),"\n",(0,r.jsx)(n.p,{children:"Typegraph:"}),"\n",(0,r.jsx)(i.A,{python:t(28054),typescript:t(86016),disablePlayground:!0}),"\n",(0,r.jsx)(n.p,{children:"Custom function:"}),"\n",(0,r.jsx)(a.A,{language:"rust",children:t(39028).content}),"\n",(0,r.jsxs)(o,{children:[(0,r.jsx)("summary",{children:"Code generation sample."}),(0,r.jsx)(a.A,{language:"rust",children:t(86496).content})]}),"\n",(0,r.jsx)(n.p,{children:"It supports the following extra configuration keys."}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Key"}),(0,r.jsx)(n.th,{children:"Type"}),(0,r.jsx)(n.th,{children:"Default"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"stubbed_runtimes"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"string[]"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:'["wasm_wire"]'})}),(0,r.jsx)(n.td,{children:"Runtimes for which to generate stub types."})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"crate_name"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"string"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"${typegraphName}_fdk"})}),(0,r.jsxs)(n.td,{children:["Name to assign to crate when generating ",(0,r.jsx)(n.code,{children:"Cargo.toml"}),"."]})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"skip_cargo_toml"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"boolean"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"false"})}),(0,r.jsxs)(n.td,{children:["Do not generate ",(0,r.jsx)(n.code,{children:"Cargo.toml"}),"."]})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"skip_lib_rs"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"boolean"})}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"false"})}),(0,r.jsxs)(n.td,{children:["Do not generate ",(0,r.jsx)(n.code,{children:"lib.rs"}),", the sample entrypoint."]})]})]})]})]})}function u(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},65671:(e,n,t)=>{"use strict";t.d(n,{A:()=>i});var r=t(98302),s=(t(30758),t(86070));function i(e){let{python:n,typescript:t,rust:i,...a}=e;const o=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path},i&&{content:i.content,codeLanguage:"rust",codeFileUrl:i.path}].filter((e=>!!e));return(0,s.jsx)(r.A,{code:0==o.length?void 0:o,...a})}},14037:e=>{e.exports={content:'@typegraph(\n)\ndef metagen_deno(g: Graph):\n  idv3 = t.struct(\n    {\n      "title": t.string(),\n      "artist": t.string(),\n      "releaseTime": t.datetime(),\n      "mp3Url": t.uri(),\n      # explicit type names help when generating code\n    }\n  ).rename("idv3")\n  deno = DenoRuntime()\n\n  g.expose(\n    Policy.public(),\n    remix=deno.import_(\n      idv3,\n      idv3,\n      module="./metagen/ts/remix.ts",\n      deps=["./metagen/ts/fdk.ts"],\n      name="remix_track",\n    ).rename("remix_track"),  # explicit names help\n  )',path:"../examples/typegraphs/metagen-deno.py"}},62292:e=>{e.exports={content:'await typegraph(\n  {\n    name: "metagen-py",\n  },\n  (g) => {\n    const idv3 = t\n      .struct({\n        title: t.string(),\n        artist: t.string(),\n        releaseTime: t.datetime(),\n        mp3Url: t.uri(),\n        // explicit type names help when generating code\n      })\n      .rename("idv3");\n\n    const python = new PythonRuntime();\n\n    g.expose(\n      {\n        remix: python\n          .import(idv3, idv3, {\n            module: "./metagen/py/remix.py",\n            deps: ["./metagen/py/remix_types.py"],\n            name: "remix_track",\n          })\n          .rename("remix_track"), // explicit names help\n      },\n      Policy.public()\n    );\n  }\n);',path:"../examples/typegraphs/metagen-py.ts"}},28054:e=>{e.exports={content:'@typegraph(\n)\ndef metagen_rs(g: Graph):\n  idv3 = t.struct(\n    {\n      "title": t.string(),\n      "artist": t.string(),\n      "releaseTime": t.datetime(),\n      "mp3Url": t.uri(),\n      # explicit type names help when generating code\n    }\n  ).rename("idv3")\n\n  # the wire flavour is availible through a static\n  # constructor\n  wasm = WasmRuntime.wire("metagen/rust.wasm")\n\n  g.expose(\n    Policy.public(),\n    remix=wasm.handler(\n      idv3,\n      idv3,\n      name="remix_track",\n    ).rename("remix_track"),  # explicit names help\n  )',path:"../examples/typegraphs/metagen-rs.py"}},86016:e=>{e.exports={content:'await typegraph(\n  {\n    name: "metagen-rs",\n  },\n  (g) => {\n    const idv3 = t\n      .struct({\n        title: t.string(),\n        artist: t.string(),\n        releaseTime: t.datetime(),\n        mp3Url: t.uri(),\n        // explicit type names help when generating code\n      })\n      .rename("idv3");\n\n    // the wire flavour is availible through a static\n    // constructor\n    const wasm = WasmRuntime.wire("metagen/rust.wasm");\n\n    g.expose(\n      {\n        remix: wasm\n          .handler(\n            idv3,\n            idv3,\n            {\n              name: "remix_track",\n            }\n            // the traits will map to the name of the materializer\n            // and also the the name of the handler mentioned above\n          )\n          .rename("remix_track"),\n      },\n      Policy.public()\n    );\n  }\n);',path:"../examples/typegraphs/metagen-rs.ts"}},7797:e=>{e.exports={content:'import os\nfrom typegraph.graph.metagen import Metagen\n\n\n@typegraph(\n)\ndef metagen_sdk(g: Graph):\n  idv3 = t.struct(\n    {\n      "title": t.string(),\n      "artist": t.string(),\n      "releaseTime": t.datetime(),\n      "mp3Url": t.uri(),\n    }\n  ).rename("idv3")\n  deno = DenoRuntime()\n\n  g.expose(\n    Policy.public(),\n    remix=deno.import_(\n      idv3,\n      idv3,\n      module="./metagen/ts/remix.ts",\n      deps=["./metagen/ts/fdk.ts"],\n      name="remix_track",\n    ).rename("remix_track"),\n  )\n\n\nif __name__ == "__main__" and False:\n  metagen = Metagen(\n    # the workspace root that our config is relative to\n    os.path.dirname(os.path.abspath(__file__)),\n    # the rest is pretty similar to the CLI config\n    {\n      "targets": {\n        "main": [\n          {\n            "generator": "fdk_typescript",\n            "typegraph_path": __file__,\n            "path": "funcs/",\n          },\n        ],\n      },\n    },\n  )\n  tg = metagen_sdk()\n  # dry_run doesn\'t write to disk\n  items = metagen.dry_run(tg, "main", None)',path:"../examples/typegraphs/metagen-sdk.py"}},19507:e=>{e.exports={content:'import { Metagen } from "@typegraph/sdk/metagen.ts";\n\n// get typegraph desc here\nconst tg = await typegraph(\n  {\n    name: "metagen-sdk",\n  },\n  (g) => {\n    const idv3 = t\n      .struct({\n        title: t.string(),\n        artist: t.string(),\n        releaseTime: t.datetime(),\n        mp3Url: t.uri(),\n      })\n      .rename("idv3");\n\n    const deno = new DenoRuntime();\n\n    g.expose(\n      {\n        remix: deno\n          .import(idv3, idv3, {\n            module: "./metagen/ts/remix.ts",\n            deps: ["./metagen/ts/fdk.ts"],\n            name: "remix_track",\n          })\n          .rename("remix_track"),\n      },\n      Policy.public(),\n    );\n  },\n);\n\nif (false) {\n  const myPath = import.meta.url.replace("file://", "");\n  const metagen = new Metagen(\n    // the workspace root that our config is relative to\n    myPath + "/..",\n    // this rest of the config is similmilar to the CLI config\n    {\n      targets: {\n        main: [\n          {\n            generator: "fdk_typescript",\n            typegraph_path: myPath,\n            path: "funcs/",\n          },\n        ],\n      },\n    },\n  );\n  // dry_run doesn\'t write to disk\n  metagen.dryRun(tg, "main");\n}',path:"../examples/typegraphs/metagen-sdk.ts"}},28434:e=>{e.exports={content:'from .remix_types import typed_remix_track, Idv3\n\n\n# the following decorator makes sure your function\n# adheres to the function types from the typegraph\n@typed_remix_track\ndef remix_track(inp: Idv3) -> Idv3:\n  return Idv3(\n    title=f"{inp.title} (Remix)",\n    artist=f"{inp.artist} + DJ Cloud",\n    releaseTime=inp.releaseTime,\n    mp3Url="https://mp3.url/remix1",\n  )',path:"../examples/typegraphs/metagen/py/remix.py"}},95696:e=>{e.exports={content:'from types import NoneType\nfrom typing import Callable, List, Union, get_origin, ForwardRef, Any\nfrom dataclasses import dataclass, asdict, fields\n\nFORWARD_REFS = {}\n\n\nclass Struct:\n  def repr(self):\n    return asdict(self)\n\n  @staticmethod\n  def try_new(dt_class, val: Any):\n    # Object\n    ftypes = {f.name: f.type for f in fields(dt_class)}\n    attrs = {}\n    for f in val:\n      fval = val[f]\n      ftype = ftypes[f]\n      serialized = False\n      # Union\n      if get_origin(ftype) is Union:\n        try:\n          attrs[f] = Struct.try_union(ftype.__args__, fval)\n          serialized = True\n        except Exception:\n          pass\n      # List\n      elif get_origin(ftype) is list:\n        try:\n          attrs[f] = Struct.try_typed_list(ftype.__args__, fval)\n          serialized = True\n        except Exception:\n          pass\n      # Any\n      if not serialized:\n        if isinstance(ftype, str) and ftype in FORWARD_REFS:\n          klass = FORWARD_REFS[ftype]\n          attrs[f] = Struct.new(klass, fval)\n        else:\n          attrs[f] = Struct.new(ftype, fval)\n    return dt_class(**attrs)\n\n  @staticmethod\n  def try_typed_list(tpe: Any, items: Any):\n    hint = tpe.__args__[0]\n    klass = (\n      FORWARD_REFS[hint.__forward_arg__] if isinstance(hint, ForwardRef) else hint\n    )\n    return [Struct.new(klass, v) for v in items]\n\n  @staticmethod\n  def try_union(variants: List[Any], val: Any):\n    errors = []\n    for variant in variants:\n      try:\n        if variant is NoneType:\n          if val is None:\n            return None\n          else:\n            continue\n        if get_origin(variant) is list:\n          if isinstance(val, list):\n            return Struct.try_typed_list(variant, val)\n          else:\n            continue\n        klass = FORWARD_REFS[variant.__forward_arg__]\n        return Struct.try_new(klass, val)\n      except Exception as e:\n        errors.append(str(e))\n    raise Exception("\\n".join(errors))\n\n  @staticmethod\n  def new(dt_class: Any, val: Any):\n    try:\n      return Struct.try_new(dt_class, val)\n    except Exception:\n      return val\n\n\n@dataclass\nclass Idv3(Struct):\n  title: str\n  artist: str\n  releaseTime: str\n  mp3Url: str\n\n\nFORWARD_REFS["Idv3"] = Idv3\n\n\ndef __repr(value: Any):\n  if isinstance(value, Struct):\n    return value.repr()\n  return value\n\n\ndef typed_remix_track(user_fn: Callable[[Idv3], Idv3]):\n  def exported_wrapper(raw_inp):\n    inp: Idv3 = Struct.new(Idv3, raw_inp)\n    out: Idv3 = user_fn(inp)\n    if isinstance(out, list):\n      return [__repr(v) for v in out]\n    return __repr(out)\n\n  return exported_wrapper',path:"../examples/typegraphs/metagen/py/remix_types.py"}},86496:e=>{e.exports={content:'// This file was @generated by metagen and is intended\n// to be generated again on subsequent metagen runs.\n#![cfg_attr(rustfmt, rustfmt_skip)]\n\n// gen-static-start\n#![allow(dead_code)]\n\npub mod wit {\n    wit_bindgen::generate!({\n        pub_export_macro: true,\n        \n        inline: "package metatype:wit-wire;\n\ninterface typegate-wire {\n  hostcall: func(op-name: string, json: string) -> result<string, string>;\n}\n\ninterface mat-wire {\n  type json-str = string;\n\n  record mat-info {\n    op-name: string,\n    mat-title: string,\n    mat-hash: string,\n    mat-data-json: string,\n  }\n\n  record init-args {\n    metatype-version: string,\n    expected-ops: list<mat-info>\n  }\n\n  record init-response {\n    ok: bool\n  }\n\n  variant init-error {\n    version-mismatch(string),\n    unexpected-mat(mat-info),\n    other(string)\n  }\n\n  init: func(args: init-args) -> result<init-response, init-error>;\n\n  record handle-req {\n    op-name: string,\n    in-json: json-str,\n  }\n\n  variant handle-err {\n    no-handler,\n    in-json-err(string),\n    handler-err(string),\n  }\n\n  handle: func(req: handle-req) -> result<json-str, handle-err>;\n}\n\nworld wit-wire {\n  import typegate-wire;\n\n  export mat-wire;\n}\n"\n    });\n}\n\nuse std::cell::RefCell;\nuse std::collections::HashMap;\n\nuse wit::exports::metatype::wit_wire::mat_wire::*;\nuse wit::metatype::wit_wire::typegate_wire::hostcall;\n\npub type HandlerFn = Box<dyn Fn(&str, Ctx) -> Result<String, HandleErr>>;\n\npub struct ErasedHandler {\n    mat_id: String,\n    mat_trait: String,\n    mat_title: String,\n    handler_fn: HandlerFn,\n}\n\npub struct MatBuilder {\n    handlers: HashMap<String, ErasedHandler>,\n}\n\nimpl MatBuilder {\n    pub fn new() -> Self {\n        Self {\n            handlers: Default::default(),\n        }\n    }\n\n    pub fn register_handler(mut self, handler: ErasedHandler) -> Self {\n        self.handlers.insert(handler.mat_trait.clone(), handler);\n        self\n    }\n}\n\npub struct Router {\n    handlers: HashMap<String, ErasedHandler>,\n}\n\nimpl Router {\n    pub fn from_builder(builder: MatBuilder) -> Self {\n        Self {\n            handlers: builder.handlers,\n        }\n    }\n\n    pub fn init(&self, args: InitArgs) -> Result<InitResponse, InitError> {\n        static MT_VERSION: &str = "0.4.11-rc.0";\n        if args.metatype_version != MT_VERSION {\n            return Err(InitError::VersionMismatch(MT_VERSION.into()));\n        }\n        for info in args.expected_ops {\n            let mat_trait = stubs::op_to_trait_name(&info.op_name);\n            if !self.handlers.contains_key(mat_trait) {\n                return Err(InitError::UnexpectedMat(info));\n            }\n        }\n        Ok(InitResponse { ok: true })\n    }\n\n    pub fn handle(&self, req: HandleReq) -> Result<String, HandleErr> {\n        let mat_trait = stubs::op_to_trait_name(&req.op_name);\n        let Some(handler) = self.handlers.get(mat_trait) else {\n            return Err(HandleErr::NoHandler);\n        };\n        let cx = Ctx {};\n        (handler.handler_fn)(&req.in_json, cx)\n    }\n}\n\npub type InitCallback = fn() -> anyhow::Result<MatBuilder>;\n\nthread_local! {\n    pub static MAT_STATE: RefCell<Router> = panic!("MAT_STATE has not been initialized");\n}\n\npub struct Ctx {}\n\nimpl Ctx {\n    pub fn gql<O>(\n        &self,\n        query: &str,\n        variables: impl Into<serde_json::Value>,\n    ) -> Result<O, GraphqlRunError>\n    where\n        O: serde::de::DeserializeOwned,\n    {\n        match hostcall(\n            "gql",\n            &serde_json::to_string(&serde_json::json!({\n                "query": query,\n                "variables": variables.into(),\n            }))?,\n        ) {\n            Ok(json) => Ok(serde_json::from_str(&json[..])?),\n            Err(json) => Err(GraphqlRunError::HostError(serde_json::from_str(&json)?)),\n        }\n    }\n}\n\n#[derive(Debug)]\npub enum GraphqlRunError {\n    JsonError(serde_json::Error),\n    HostError(serde_json::Value),\n}\n\nimpl std::error::Error for GraphqlRunError {}\n\nimpl From<serde_json::Error> for GraphqlRunError {\n    fn from(value: serde_json::Error) -> Self {\n        Self::JsonError(value)\n    }\n}\n\nimpl std::fmt::Display for GraphqlRunError {\n    fn fmt(&self, f: &mut std::fmt::Formatter<\'_>) -> std::fmt::Result {\n        match self {\n            GraphqlRunError::JsonError(msg) => write!(f, "json error: {msg}"),\n            GraphqlRunError::HostError(serde_json::Value::Object(map))\n                if map.contains_key("message") =>\n            {\n                write!(f, "host error: {}", map["message"])\n            }\n            GraphqlRunError::HostError(val) => write!(f, "host error: {val:?}"),\n        }\n    }\n}\n\n#[macro_export]\nmacro_rules! init_mat {\n    (hook: $init_hook:expr) => {\n        struct MatWireGuest;\n        use wit::exports::metatype::wit_wire::mat_wire::*;\n        wit::export!(MatWireGuest with_types_in wit);\n\n        #[allow(unused)]\n        impl Guest for MatWireGuest {\n            fn handle(req: HandleReq) -> Result<String, HandleErr> {\n                MAT_STATE.with(|router| {\n                    let router = router.borrow();\n                    router.handle(req)\n                })\n            }\n\n            fn init(args: InitArgs) -> Result<InitResponse, InitError> {\n                let hook = $init_hook;\n                let router = Router::from_builder(hook());\n                let resp = router.init(args)?;\n                MAT_STATE.set(router);\n                Ok(resp)\n            }\n        }\n    };\n}\n// gen-static-end\nuse types::*;\npub mod types {\n    pub type Idv3TitleString = String;\n    pub type Idv3ReleaseTimeStringDatetime = String;\n    pub type Idv3Mp3UrlStringUri = String;\n    #[derive(Debug, serde::Serialize, serde::Deserialize)]\n    pub struct Idv3 {\n        pub title: Idv3TitleString,\n        pub artist: Idv3TitleString,\n        #[serde(rename = "releaseTime")]\n        pub release_time: Idv3ReleaseTimeStringDatetime,\n        #[serde(rename = "mp3Url")]\n        pub mp3_url: Idv3Mp3UrlStringUri,\n    }\n}\npub mod stubs {\n    use super::*;\n    pub trait RemixTrack: Sized + \'static {\n        fn erased(self) -> ErasedHandler {\n            ErasedHandler {\n                mat_id: "remix_track".into(),\n                mat_title: "remix_track".into(),\n                mat_trait: "RemixTrack".into(),\n                handler_fn: Box::new(move |req, cx| {\n                    let req = serde_json::from_str(req)\n                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;\n                    let res = self\n                        .handle(req, cx)\n                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;\n                    serde_json::to_string(&res)\n                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))\n                }),\n            }\n        }\n\n        fn handle(&self, input: Idv3, cx: Ctx) -> anyhow::Result<Idv3>;\n    }\n    pub fn op_to_trait_name(op_name: &str) -> &\'static str {\n        match op_name {\n            "remix_track" => "RemixTrack",\n            _ => panic!("unrecognized op_name: {op_name}"),\n        }\n    }\n}',path:"../examples/typegraphs/metagen/rs/fdk.rs"}},39028:e=>{e.exports={content:'mod fdk;\npub use fdk::*;\n\n// the macro sets up all the glue\ninit_mat! {\n    // the hook is expected to return a MatBuilder instance\n    hook: || {\n        // initialize global stuff here if you need it\n        MatBuilder::new()\n            // register function handlers here\n            // each trait will map to the name of the\n            // handler found in the typegraph\n            .register_handler(stubs::RemixTrack::erased(MyMat))\n    }\n}\n\nstruct MyMat;\n\nimpl stubs::RemixTrack for MyMat {\n    fn handle(&self, input: types::Idv3, _cx: Ctx) -> anyhow::Result<types::Idv3> {\n        Ok(types::Idv3 {\n            title: format!("{} (Remix)", input.title),\n            artist: format!("{} + DJ Cloud", input.artist),\n            release_time: input.release_time,\n            mp3_url: "https://mp3.url/shumba2".to_string(),\n        })\n    }\n}',path:"../examples/typegraphs/metagen/rs/lib.rs"}},96280:e=>{e.exports={content:'// This file was @generated by metagen and is intended\n// to be generated again on subsequent metagen runs.\n\nexport type Ctx = {\n  parent?: Record<string, unknown>;\n  /**\n   * Request context extracted by auth extractors.\n   */\n  context?: Record<string, unknown>;\n  secrets: Record<string, string>;\n  effect: "create" | "update" | "delete" | "read" | undefined | null;\n  meta: {\n    url: string;\n    token: string;\n  };\n  headers: Record<string, string>;\n};\n\n/**\n * Access features on your typegraph deployment.\n */\nexport type Deployment = {\n  gql: (query: readonly string[], ...args: unknown[]) => {\n    run: (\n      variables: Record<string, unknown>,\n    ) => Promise<Record<string, unknown>>;\n  };\n};\n\nexport type Handler<In, Out> = (\n  input: In,\n  ctx: Ctx,\n  tg: Deployment,\n) => Out | Promise<Out>;\n\nexport type StringDateTime = string;\nexport type StringUri = string;\nexport type Idv3 = {\n  title: string;\n  artist: string;\n  releaseTime: StringDateTime;\n  mp3Url: StringUri;\n};\n\n\nexport type RemixTrackHandler = Handler<Idv3, Idv3>;',path:"../examples/typegraphs/metagen/ts/fdk.ts"}},13246:e=>{e.exports={content:'import type { RemixTrackHandler, Ctx, Idv3 } from "./fdk.ts";\n\n// the name of the export must match the one referred int he typegraph\nexport const remix_track: RemixTrackHandler = (inp, cx: Ctx) => {\n  const out: Idv3 = {\n    title: `${inp.title} (Remix)`,\n    artist: `${inp.artist} + DJ Cloud`,\n    releaseTime: new Date().toISOString(),\n    // S3Runtime could be used to really provide this service\n    mp3Url: `${cx.meta.url}/get_mp3`,\n  };\n  return out;\n};',path:"../examples/typegraphs/metagen/ts/remix.ts"}}}]);