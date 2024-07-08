"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7417],{36037:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>r,default:()=>p,frontMatter:()=>s,metadata:()=>o,toc:()=>l});var a=n(86070),i=n(25710);const s={},r="The Node/Deno SDK is now available",o={permalink:"/blog/2023/11/27/node-compatibility",editUrl:"https://github.com/metatypedev/metatype/tree/main/website/blog/2023-11-27-node-compatibility/index.mdx",source:"@site/blog/2023-11-27-node-compatibility/index.mdx",title:"The Node/Deno SDK is now available",description:"We are happy to announce that we have redesigned our SDKs to support Node/Deno and facilitate the integration of future languages. Most of the typegraph SDK is now written in Rust and shaped around a core interface running in WebAssembly.",date:"2023-11-27T00:00:00.000Z",tags:[],readingTime:1.7,hasTruncateMarker:!1,authors:[],frontMatter:{},unlisted:!1,prevItem:{title:"Programmatic deployment (v0.4.x)",permalink:"/blog/2024/05/09/programmatic-deployment"},nextItem:{title:"Programmable glue for developers",permalink:"/blog/2023/06/18/programmable-glue"}},d={authorsImageUrls:[]},l=[{value:"Meet <code>wit</code>",id:"meet-wit",level:2},{value:"Install the v0.2.x series",id:"install-the-v02x-series",level:2},{value:"Upgrade with Node",id:"upgrade-with-node",level:3},{value:"Upgrade with Deno",id:"upgrade-with-deno",level:3},{value:"Upgrade with Python",id:"upgrade-with-python",level:3},{value:"Give us feedback!",id:"give-us-feedback",level:2}];function h(e){const t={a:"a",code:"code",h2:"h2",h3:"h3",p:"p",pre:"pre",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(t.p,{children:["We are happy to announce that we have redesigned our SDKs to support Node/Deno and facilitate the integration of future languages. Most of the ",(0,a.jsx)(t.a,{href:"/docs/reference/typegraph",children:"typegraph SDK"})," is now written in Rust and shaped around a core interface running in WebAssembly."]}),"\n",(0,a.jsxs)(t.h2,{id:"meet-wit",children:["Meet ",(0,a.jsx)(t.code,{children:"wit"})]}),"\n",(0,a.jsxs)(t.p,{children:["In the realm of WebAssembly, the ",(0,a.jsx)(t.a,{href:"https://github.com/bytecodealliance/wit-bindgen",children:"wit-bindgen"})," project emerges as the most mature tool to create and maintain the language bindings for WebAssembly modules. This tool introduces WIT (WebAssembly Interface Types) as an Interface Definition Language (IDL) to describe the imports, exports, and capabilities of WebAssembly components seamlessly."]}),"\n",(0,a.jsxs)(t.p,{children:["For example, Metatype implements the reactor pattern to handle requests as they come and delegate part of their execution in correct WASM runtime. The wit-bindgen helps there to define the interfaces between the guest (the Metatype runtime) and the host (the typegate) to ensure the correct serialization of the payloads. The ",(0,a.jsx)(t.code,{children:"wit"})," definition could look like this:"]}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{children:"package metatype:wit-wire;\n\ninterface typegate-wire {\n  hostcall: func(op-name: string, json: string) -> result<string, string>;\n}\n\ninterface mat-wire {\n  record handle-req {\n    op-name: string,\n    in-json: string,\n  }\n\n  handle: func(req: handle-req) -> result<string, string>;\n}\n\nworld wit-wire {\n  import typegate-wire;\n\n  export mat-wire;\n}\n"})}),"\n",(0,a.jsxs)(t.p,{children:["The ",(0,a.jsx)(t.code,{children:"wit"})," file is then used to generate the bindings for the host and the guest in Rust, TypeScript, Python, and other languages. The host bindings are used in the typegate to call the WASM runtime, and the guest bindings are used in the WASM runtime to call the typegate."]}),"\n",(0,a.jsx)(t.h2,{id:"install-the-v02x-series",children:"Install the v0.2.x series"}),"\n",(0,a.jsx)(t.p,{children:"The documentation contains now examples for Node and Deno."}),"\n",(0,a.jsx)(t.h3,{id:"upgrade-with-node",children:"Upgrade with Node"}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"npm install @typegraph/sdk\nmeta new --template node .\n"})}),"\n",(0,a.jsx)(t.h3,{id:"upgrade-with-deno",children:"Upgrade with Deno"}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"meta new --template deno .\n"})}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-typescript",children:'import { typegraph } from "npm:@typegraph/sdk/index.js";\n'})}),"\n",(0,a.jsx)(t.h3,{id:"upgrade-with-python",children:"Upgrade with Python"}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-python",children:"pip3 install --upgrade typegraph\npoetry add typegraph@latest\n"})}),"\n",(0,a.jsx)(t.h2,{id:"give-us-feedback",children:"Give us feedback!"}),"\n",(0,a.jsx)(t.p,{children:"This new release enables us to provide a consistent experience across all languages and reduce the work to maintain the existing Python SDK."}),"\n",(0,a.jsxs)(t.p,{children:["As always, report issues and let us know what you think on ",(0,a.jsx)(t.a,{href:"https://github.com/metatypedev/metatype/discussions",children:"GitHub"}),"."]})]})}function p(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(h,{...e})}):h(e)}}}]);