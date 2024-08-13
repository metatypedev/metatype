(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9568],{17981:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>d,default:()=>u,frontMatter:()=>c,metadata:()=>a,toc:()=>o});var s=t(86070),r=t(25710),i=t(65671);const c={},d="Kv",a={id:"reference/runtimes/kv/index",title:"Kv",description:"Kv Runtime",source:"@site/docs/reference/runtimes/kv/index.mdx",sourceDirName:"reference/runtimes/kv",slug:"/reference/runtimes/kv/",permalink:"/docs/reference/runtimes/kv/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/kv/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"HTTP/REST",permalink:"/docs/reference/runtimes/http/"},next:{title:"Prisma",permalink:"/docs/reference/runtimes/prisma/"}},l={},o=[{value:"Kv Runtime",id:"kv-runtime",level:2}];function v(e){const n={code:"code",h1:"h1",h2:"h2",p:"p",strong:"strong",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"kv",children:"Kv"}),"\n",(0,s.jsx)(n.h2,{id:"kv-runtime",children:"Kv Runtime"}),"\n",(0,s.jsx)(n.p,{children:"The KvRuntime enables interaction with a Redis database by setting, retrieving, deleting, and managing keys and values."}),"\n",(0,s.jsx)(i.A,{typegraph:"kv",python:t(13583),typescript:t(66641),disablePlayground:!0,query:{content:""}}),"\n",(0,s.jsxs)(n.p,{children:["+| ",(0,s.jsx)(n.strong,{children:"Operation"})," | ",(0,s.jsx)(n.strong,{children:"Description"})," | ",(0,s.jsx)(n.strong,{children:"Method"})," |\n+| ------------- | -------------------------------------------------- | ------------- |\n+| ",(0,s.jsx)(n.code,{children:"get"})," | Retrieve the value associated with a specific key. | ",(0,s.jsx)(n.code,{children:"kv.get()"})," |\n+| ",(0,s.jsx)(n.code,{children:"set"})," | Assign a value to a specific key. | ",(0,s.jsx)(n.code,{children:"kv.set()"})," |\n+| ",(0,s.jsx)(n.code,{children:"delete"})," | Remove a key and its associated value from Redis. | ",(0,s.jsx)(n.code,{children:"kv.delete()"})," |\n+| ",(0,s.jsx)(n.code,{children:"keys"})," | List all keys currently stored in Redis. | ",(0,s.jsx)(n.code,{children:"kv.keys()"})," |\n+| ",(0,s.jsx)(n.code,{children:"values"})," | List all values currently stored in Redis. | ",(0,s.jsx)(n.code,{children:"kv.values()"})," |"]})]})}function u(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(v,{...e})}):v(e)}},13583:e=>{e.exports={content:'@typegraph(\n)\ndef key_value(g: Graph):\n  kv = KvRuntime("REDIS")\n\n  g.expose(\n    Policy.public(),\n    get=kv.get(),\n    set=kv.set(),\n    delete=kv.delete(),\n    keys=kv.keys(),\n    values=kv.values(),\n  )',path:"examples/typegraphs/kv.py"}},66641:e=>{e.exports={content:'export const tg = await typegraph(\n  {\n    name: "key-value",\n  },\n  (g) => {\n    const kv = new KvRuntime("REDIS");\n    const pub = Policy.public();\n    g.expose({\n      get: kv.get(),\n      set: kv.set(),\n      delete: kv.delete(),\n      keys: kv.keys(),\n      values: kv.values(),\n    }, pub);\n  },\n);',path:"examples/typegraphs/kv.ts"}}}]);