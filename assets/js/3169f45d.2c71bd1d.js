(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3597],{16678:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>u,default:()=>m,frontMatter:()=>o,metadata:()=>d,toc:()=>p});var i=t(86070),s=t(25710),r=t(65671),a=t(65480),c=t(27676);const o={},u="HTTP/REST",d={id:"reference/runtimes/http/index",title:"HTTP/REST",description:"HTTP Runtime",source:"@site/docs/reference/runtimes/http/index.mdx",sourceDirName:"reference/runtimes/http",slug:"/reference/runtimes/http/",permalink:"/docs/reference/runtimes/http/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/docs/metatype.dev/docs/reference/runtimes/http/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"GraphQL",permalink:"/docs/reference/runtimes/graphql/"},next:{title:"Kv",permalink:"/docs/reference/runtimes/kv/"}},l={},p=[{value:"HTTP Runtime",id:"http-runtime",level:2},{value:"Verbs",id:"verbs",level:2}];function h(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"httprest",children:"HTTP/REST"}),"\n",(0,i.jsx)(n.h2,{id:"http-runtime",children:"HTTP Runtime"}),"\n",(0,i.jsx)(n.p,{children:"The HTTPRuntime allows your typegraphs to access external REST APIs."}),"\n",(0,i.jsx)(n.p,{children:"Common use cases (but not limited to):"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsx)(n.li,{children:"Enable consuming one or more REST APIs through the same interface"}),"\n",(0,i.jsxs)(n.li,{children:["Programmatically generate typegraphs from an existing ",(0,i.jsx)(n.a,{href:"https://swagger.io/specification/",children:"openapi specs"})," or similar"]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"Example:"}),"\n",(0,i.jsx)(r.A,{typegraph:"http-runtime",typescript:t(65794),python:t(88820),query:t(60431)}),"\n",(0,i.jsx)(n.h2,{id:"verbs",children:"Verbs"}),"\n",(0,i.jsxs)(n.p,{children:["This runtime supports ",(0,i.jsx)(n.code,{children:"GET"}),", ",(0,i.jsx)(n.code,{children:"POST"}),", ",(0,i.jsx)(n.code,{children:"PUT"}),", ",(0,i.jsx)(n.code,{children:"DELETE"})," http verbs."]}),"\n",(0,i.jsxs)(n.p,{children:["In most cases, queries are not limited to a simple query parameter or use the default ",(0,i.jsx)(n.code,{children:"application/json"})," content type. You can assign what parts of your request description each field in the input struct belongs to."]}),"\n",(0,i.jsxs)(n.p,{children:["In the example bellow, this endpoint corresponds to ",(0,i.jsx)(n.code,{children:"POST <API_URL>/submit_user?form_type=.."})," with a body requiring the fields: ",(0,i.jsx)(n.code,{children:"pseudo"}),", ",(0,i.jsx)(n.code,{children:"age"})," and with header ",(0,i.jsx)(n.code,{children:"accept"})," set as ",(0,i.jsx)(n.code,{children:"application/json"}),"."]}),"\n",(0,i.jsxs)(a.Ay,{children:[(0,i.jsx)(c.A,{value:"python",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'# ..\n    remote = HTTPRuntime("<API_URL>")\n    g.expose(\n        pub,\n        add_user=remote.post(\n            "/submit_user",\n            # define your input/output\n            t.struct(\n                {\n                    "id": t.uuid(),\n                    "username": t.float(),\n                    "years_lived": t.integer(),\n                    "form_type": t.integer(),\n                    "config_accept": t.string().set("application/json")\n                },\n            ),\n            t.struct({ "message": t.string() }),\n            # specify where each field in your input should be associated with\n            body_fields=("username", "years_lived"),\n            query_fields=("form_type"),\n            # you may want to rename a few fields\n            # if you are using your own naming conventions or reusing types\n            rename_fields={\n                "username": "pseudo",\n                "years_lived": "age",\n            },\n            content_type="multipart/form-data",\n            # set a custom header prefix\n            header_prefix="config_"\n        )\n    )\n# ..\n'})})}),(0,i.jsx)(c.A,{value:"typescript",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-typescript",children:'// ..\n  const remote = new HttpRuntime("<API_URL>");\n  g.expose({\n    add_user: remote.post(\n      // define your input/output\n      t.struct(\n        {\n          id: t.uuid(),\n          username: t.float(),\n          years_lived: t.integer(),\n          form_type: t.integer()\n        },\n      ),\n      t.struct({ message: t.string() }),\n      {\n        path: "/submit_user",\n        // specify where each field in your input should be associated with\n        bodyFields: ["username", "years_lived"],\n        queryFields: ["form_type"],\n        // you may want to rename a few fields\n        // if you are using your own naming conventions or reusing types\n        renameFields: [\n          ["username", "pseudo"],\n          ["years_lived", "age"],\n        ],\n        contentType: "multipart/form-data",\n      }\n  )}, pub);\n// ..\n'})})})]})]})}function m(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}},65480:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>a,gc:()=>c});t(30758);var i=t(3733),s=t(56315),r=t(86070);function a(e){let{children:n}=e;const[t,a]=(0,i.e)();return(0,r.jsx)(s.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}function c(e){let{children:n}=e;const[t]=(0,i.e)();return(0,r.jsx)(s.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},60431:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"facts"},arguments:[{kind:"Argument",name:{kind:"Name",value:"language"},value:{kind:"StringValue",value:"en",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"text"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"facts_as_text"},arguments:[{kind:"Argument",name:{kind:"Name",value:"language"},value:{kind:"StringValue",value:"en",block:!1}}],directives:[]}]}}],loc:{start:0,end:121}};n.loc.source={body:'query {\n  facts(language: "en") {\n    id\n    text\n    # source_url\n    # permalink\n  }\n  facts_as_text(language: "en")\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},88820:e=>{e.exports={content:'# highlight-next-line\nfrom typegraph.runtimes import HttpRuntime\n\n\n@typegraph(\n)\ndef http_runtime(g: Graph):\n  pub = Policy.public()\n\n  # highlight-next-line\n  facts = HttpRuntime("https://uselessfacts.jsph.pl/api/v2/facts")\n\n  g.expose(\n    pub,\n    facts=facts.get(\n      "/random",\n      t.struct({"language": t.enum(["en", "de"])}),\n      t.struct(\n        {\n          "id": t.string(),\n          "text": t.string(),\n          "source": t.string(),\n          "source_url": t.string(),\n          "language": t.string(),\n          "permalink": t.string(),\n        }\n      ),\n    ),\n    facts_as_text=facts.get(\n      "/random",\n      t.struct(\n        {\n          "header_accept": t.string().set("text/plain"),\n          "language": t.enum(["en", "de"]),\n        }\n      ),\n      t.string(),\n      header_prefix="header_",\n    ),\n  )',path:"../examples/typegraphs/http-runtime.py"}},65794:e=>{e.exports={content:'// highlight-next-line\nimport { HttpRuntime } from "@typegraph/sdk/runtimes/http.ts";\n\nawait typegraph(\n  {\n    name: "http-runtime",\n  },\n  (g) => {\n    // highlight-next-line\n    const facts = new HttpRuntime("https://uselessfacts.jsph.pl/api/v2/facts");\n    const pub = Policy.public();\n\n    g.expose(\n      {\n        facts: facts.get(\n          t.struct({\n            language: t.enum_(["en", "de"]),\n          }),\n          t.struct({\n            id: t.string(),\n            text: t.string(),\n            source: t.string(),\n            source_url: t.string(),\n            language: t.string(),\n            permalink: t.string(),\n          }),\n          {\n            path: "/random",\n          }\n        ),\n        facts_as_text: facts.get(\n          t.struct({\n            header_accept: t.string().set("text/plain"),\n            language: t.enum_(["en", "de"]),\n          }),\n          t.string(),\n          { path: "/random", headerPrefix: "header_" }\n        ),\n      },\n      pub\n    );\n  }\n);',path:"../examples/typegraphs/http-runtime.ts"}}}]);