"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2091],{2738:(e,n,s)=>{s.r(n),s.d(n,{assets:()=>p,contentTitle:()=>l,default:()=>u,frontMatter:()=>i,metadata:()=>c,toc:()=>d});var r=s(86070),t=s(25710),a=s(65480),o=s(27676);const i={sidebar_position:5},l="REST",c={id:"reference/rest/index",title:"REST",description:"Metatype also allows you to consume your API in the same way you would consume regular REST APIs. It is as easy as calling a function: g.rest(..).",source:"@site/docs/reference/rest/index.mdx",sourceDirName:"reference/rest",slug:"/reference/rest/",permalink:"/docs/reference/rest/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/rest/index.mdx",tags:[],version:"current",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"docs",previous:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"},next:{title:"Typegraph",permalink:"/docs/reference/typegraph/"}},p={},d=[{value:"General rule",id:"general-rule",level:2},{value:"Dynamic queries",id:"dynamic-queries",level:2},{value:"Auto-generated docs",id:"auto-generated-docs",level:2},{value:"OpenAPI clients",id:"openapi-clients",level:2}];function h(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,t.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"rest",children:"REST"}),"\n",(0,r.jsxs)(n.p,{children:["Metatype also allows you to consume your API in the same way you would consume regular REST APIs. It is as easy as calling a function: ",(0,r.jsx)(n.code,{children:"g.rest(..)"}),"."]}),"\n",(0,r.jsx)(n.p,{children:"Here is a basic overview of how it looks like:"}),"\n",(0,r.jsxs)(a.Ay,{children:[(0,r.jsx)(o.A,{value:"python",children:(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'@typegraph()\ndef example(g: Graph):\n    # ..\n    g.expose(\n        pub,\n        getUsers= ..,\n    )\n\n    g.rest(\n        """\n        query users($name: String, $rows: Integer) {\n            getUsers(name: $name, option: { maxRows: $rows } ) {\n                name\n            }\n        }\n        """\n    )\n    # ..\n'})})}),(0,r.jsx)(o.A,{value:"typescript",children:(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-typescript",children:'typegraph("example", (g) => {\n    // ..\n    g.expose({\n        getUsers: ..,\n    }, pub);\n\n    g.rest(`\n        query users($name: String, $rows: Integer) {\n            getUsers(name: $name, option: { maxRows: $rows } ) {\n                name\n            }\n        }\n    `);\n    // ..\n});\n'})})})]}),"\n",(0,r.jsx)(n.h2,{id:"general-rule",children:"General rule"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-graphql",children:"query_type endpoint_name($param1: T1, $param2: T2, ..) {\n    exposed(..) {\n        f1\n        f2 ..\n    }\n}\n"})}),"\n",(0,r.jsxs)(n.p,{children:["There is no rule in what type of query you should do most of the time as everything is up to you, however the ",(0,r.jsx)("b",{children:"type of query"})," you set ",(0,r.jsx)("b",{children:"will define"})," how your endpoint should be used."]}),"\n",(0,r.jsxs)(n.p,{children:["In other words, depending on what ",(0,r.jsx)(n.code,{children:"query_type"})," (query or mutation), ",(0,r.jsx)(n.code,{children:"$param1, $param2, .."})," will be defined from the request parameters (GET) or the request body (POST)."]}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)("b",{children:"query"}),": Perform a ",(0,r.jsx)(n.code,{children:"GET"})," at ",(0,r.jsx)(n.code,{children:"{TYPEGATE_URL}/{TG_NAME} /rest/endpoint_name?param1=..&param2=.."})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)("b",{children:"mutation"}),": Perform a ",(0,r.jsx)(n.code,{children:"POST"})," at ",(0,r.jsx)(n.code,{children:"{TYPEGATE_URL}/{TG_NAME} /rest/endpoint_name"})," with ",(0,r.jsx)(n.code,{children:"Content-Type"})," set as ",(0,r.jsx)(n.code,{children:"application/json"})]}),"\n"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-js",children:'{\n    "param1": ..,\n    "param2": ..,\n    ..\n}\n'})}),"\n",(0,r.jsxs)(n.p,{children:["In the example above, for a local instance, the endpoint might look like: ",(0,r.jsx)(n.code,{children:"http://localhost:7890/example/rest/users?name=Bob&rows=10"})]}),"\n",(0,r.jsx)(n.h2,{id:"dynamic-queries",children:"Dynamic queries"}),"\n",(0,r.jsx)(n.p,{children:"This enables/disables all non-static queries, i.e. queries whose output or side effects depend on certain parameters."}),"\n",(0,r.jsxs)(n.p,{children:["By default, ",(0,r.jsx)(n.code,{children:"dynamic"})," is always on."]}),"\n",(0,r.jsxs)(a.Ay,{children:[(0,r.jsx)(o.A,{value:"python",children:(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:"@typegraph(dynamic=False)\ndef my_typegraph(g: Graph):\n    # ..\n\n"})})}),(0,r.jsx)(o.A,{value:"typescript",children:(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-typescript",children:'typegraph({ name: "my-typegraph", dynamic: false }, (g) => {\n  // ..\n});\n'})})})]}),"\n",(0,r.jsx)(n.h2,{id:"auto-generated-docs",children:"Auto-generated docs"}),"\n",(0,r.jsx)(n.p,{children:"In any case, you can always check the auto-generated documentation of the available endpoints, parameters, output shapes."}),"\n",(0,r.jsxs)(n.p,{children:["You can browse it at ",(0,r.jsx)(n.code,{children:"{TYPEGATE_URL}/{TG_NAME}/rest"}),"."]}),"\n",(0,r.jsx)(n.h2,{id:"openapi-clients",children:"OpenAPI clients"}),"\n",(0,r.jsx)(n.p,{children:"In some cases, as your typegraph gets more complicated, you may want to automate the step of writing clients and focus on the actual logic of your application instead."}),"\n",(0,r.jsxs)(n.p,{children:["The OpenAPI spec will be available at ",(0,r.jsx)(n.code,{children:"{TYPEGATE_URL}/{TG_NAME}/rest/__schema"}),", which is very useful considering that there are already a number of tools that enable you to create clients from an existing OpenAPI specification file."]}),"\n",(0,r.jsx)(n.p,{children:"Once you download the specification file for your API, it should look like something like this:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-js",children:'// {TYPEGATE_URL}/my_awesome_typegraph/rest/__schema\n{\n  "openapi": "3.0.3",\n  "info": {\n    "title": "my_awesome_typegraph",\n    "license": {\n      "name": "MIT"\n    },\n    "description": "Rest endpoints for typegraph \\"my_awesome_typegraph\\"",\n    "version": "1.0.0"\n  },\n  "servers": [{ "url": "http://localhost:7890" }],\n  "paths": {\n    // typing each path manually on a custom client can be very tedious as your API grows\n    "/my_awesome_typegraph/rest/get_post": {\n      "get": {\n        "summary": "Perform get_post",\n        "operationId": "get_my_awesome_typegraph_get_post",\n        "responses": { ... }, // you will have various types per response status\n        "parameters": [ ... ]\n      }\n    },\n    "/my_awesome_typegraph/rest/get_post_id": { ... },\n    "/my_awesome_typegraph/rest/read_post": { ... }\n  },\n  "components": { ... }\n}\n'})}),"\n",(0,r.jsx)(n.p,{children:"Here are some of the most used generators:"}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:["Multilang: ",(0,r.jsx)(n.a,{href:"https://github.com/OpenAPITools/openapi-generator",children:"OpenAPITools/openapi-generator"})]}),"\n",(0,r.jsxs)(n.li,{children:["Multilang: ",(0,r.jsx)(n.a,{href:"https://www.npmjs.com/package/@openapitools/openapi-generator-cli",children:"@openapitools/openapi-generator-cli"})]}),"\n",(0,r.jsxs)(n.li,{children:["Flutter: ",(0,r.jsx)(n.a,{href:"https://pub.dev/packages/openapi_generator",children:"openapi_generator"})]}),"\n"]}),"\n",(0,r.jsxs)(n.p,{children:["To keep our setup simple, let us look at ",(0,r.jsx)(n.a,{href:"https://www.npmjs.com/package/@openapitools/openapi-generator-cli",children:"@openapitools/openapi-generator-cli"}),",\nwhich is just a wrapper around ",(0,r.jsx)(n.a,{href:"https://github.com/OpenAPITools/openapi-generator",children:"openapi-generator"})," and will download the appropriate dependencies for you."]}),"\n",(0,r.jsx)(n.p,{children:"First, install the cli globally"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"npm i -g @openapitools/openapi-generator-cli\n"})}),"\n",(0,r.jsx)(n.p,{children:"In this example, let's generate a simple fetch client, you can refer to their official documentation for other generators."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-bash",children:"openapi-generator-cli generate \\\n    -i http://localhost:7890/my_awesome_typegraph/rest/__schema \\\n    -g typescript-fetch \\\n    -o my-client \\\n    --skip-validate-spec\n"})}),"\n",(0,r.jsxs)(n.p,{children:["This will generate a ",(0,r.jsx)(n.code,{children:"fetch"}),"-based typescript project."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{children:".\n+-- apis\n\xa6    +-- DefaultApi.ts\n\xa6    +-- index.ts\n+-- models\n\xa6    +-- Either10.ts\n\xa6    +-- ErrorExtensions.ts\n\xa6    ...\n\xa6    +-- GetMyAwesomeTypegraphGetIdentity200Response.ts\n\xa6    +-- Post.ts\n\xa6    +-- User.ts\n\xa6    +-- index.ts\n+-- runtime.ts\n+-- index.ts\n"})})]})}function u(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},65480:(e,n,s)=>{s.d(n,{Ay:()=>o,gc:()=>i});s(30758);var r=s(30351),t=s(56315),a=s(86070);function o(e){let{children:n}=e;const[s,o]=(0,r.e)();return(0,a.jsx)(t.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:s,onChange:o,children:n})}function i(e){let{children:n}=e;const[s]=(0,r.e)();return(0,a.jsx)(t.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:s,children:n})}}}]);