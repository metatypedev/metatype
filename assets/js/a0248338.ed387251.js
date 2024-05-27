(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[5028],{42191:(e,t,s)=>{"use strict";s.r(t),s.d(t,{assets:()=>p,contentTitle:()=>d,default:()=>l,frontMatter:()=>o,metadata:()=>a,toc:()=>h});var r=s(86070),n=s(25710),i=(s(52737),s(93214));const o={sidebar_position:50},d="Write REST endpoints",a={id:"guides/rest/index",title:"Write REST endpoints",description:"The root materializers, the ones we expose from our typegraphs, are served through a GraphQl API over HTTP.",source:"@site/docs/guides/rest/index.mdx",sourceDirName:"guides/rest",slug:"/guides/rest/",permalink:"/docs/guides/rest/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/rest/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Upload files to cloud storage",permalink:"/docs/guides/files-upload/"},next:{title:"Secure your requests",permalink:"/docs/guides/securing-requests/"}},p={},h=[];function c(e){const t={a:"a",code:"code",h1:"h1",p:"p",...(0,n.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"write-rest-endpoints",children:"Write REST endpoints"}),"\n",(0,r.jsxs)(t.p,{children:["The root materializers, the ones we expose from our typegraphs, are served through a GraphQl API over HTTP.\nIn addition, we can also expose ",(0,r.jsx)(t.a,{href:"https://en.wikipedia.org/wiki/REST",children:"REST"})," APIs using the ",(0,r.jsx)(t.code,{children:"rest"})," method.\nThe method takes GraphQl queries and provides RESTly endpoints for them."]}),"\n",(0,r.jsx)(i.A,{python:s(87611),typescript:s(75397),disablePlayground:!0}),"\n",(0,r.jsxs)(t.p,{children:["The effect of the root materializer accessed in the query determines the HTTP verb used, and the mapping can be found ",(0,r.jsx)(t.a,{href:"/docs/reference/types/functions#effects",children:"here"}),"."]}),"\n",(0,r.jsxs)(t.p,{children:["There's also an OpenAPI schema generated from the rest endpoints served under ",(0,r.jsx)(t.code,{children:"{typegate_url}/{typegraph}/rest/_schema"}),".\nA browser-based explorer for the OpenAPI schema is served under ",(0,r.jsx)(t.code,{children:"{typegate_url}/{typegraph}/rest"})," as well."]}),"\n",(0,r.jsxs)(t.p,{children:["You can refer to the ",(0,r.jsx)(t.a,{href:"/docs/reference/rest",children:"REST reference"})," section for more information."]}),"\n"]})}function l(e={}){const{wrapper:t}={...(0,n.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},87611:e=>{e.exports={content:'g.expose(\n  postFromUser=deno.func(\n    user,\n    post,\n    code="(_) => ({ id: 12, author: {id: 1}  })",\n  ).with_policy(pub),\n)\n\n# In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..\n# highlight-start\ng.rest(\n  """\n  query get_post($id: Integer) {\n    postFromUser(id: $id) {\n      id\n      author {\n        id\n      }\n    }\n  }\n  """\n)\n# highlight-end',path:"examples/typegraphs/example_rest.py"}},75397:e=>{e.exports={content:'g.expose({\n  postFromUser: deno.func(\n    user,\n    post,\n    { code: "(_) => ({ id: 12, author: {id: 1}  })" },\n  ).withPolicy(pub),\n});\n\n// In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..\n// highlight-start\ng.rest(\n  `\n      query get_post($id: Integer) {\n          postFromUser(id: $id) {\n              id\n              author {\n                  id\n              }\n          }\n      }\n  `,\n);\n// highlight-end',path:"examples/typegraphs/example_rest.ts"}}}]);