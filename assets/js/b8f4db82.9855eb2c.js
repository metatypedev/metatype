(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4619],{81121:(e,r,n)=>{"use strict";n.r(r),n.d(r,{assets:()=>p,contentTitle:()=>i,default:()=>d,frontMatter:()=>a,metadata:()=>l,toc:()=>c});var t=n(86070),o=n(25710),s=n(50695);const a={},i="Temporal",l={id:"reference/runtimes/temporal/index",title:"Temporal",description:"Temporal runtime",source:"@site/docs/reference/runtimes/temporal/index.mdx",sourceDirName:"reference/runtimes/temporal",slug:"/reference/runtimes/temporal/",permalink:"/docs/reference/runtimes/temporal/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/temporal/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"S3",permalink:"/docs/reference/runtimes/s3/"},next:{title:"Wasm",permalink:"/docs/reference/runtimes/wasm/"}},p={},c=[{value:"Temporal runtime",id:"temporal-runtime",level:2}];function m(e){const r={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,o.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(r.h1,{id:"temporal",children:"Temporal"}),"\n",(0,t.jsx)(r.h2,{id:"temporal-runtime",children:"Temporal runtime"}),"\n",(0,t.jsxs)(r.p,{children:[(0,t.jsx)(r.a,{href:"https://temporal.io/",children:"Temporal"})," is an open-source durable execution engine that can be used to develop workflows that are long lived and failure resistant. Common use cases include:"]}),"\n",(0,t.jsxs)(r.ul,{children:["\n",(0,t.jsx)(r.li,{children:"Implementing multi-step, complicated transactionaly business logic."}),"\n",(0,t.jsx)(r.li,{children:"Guaranteed event processing."}),"\n",(0,t.jsx)(r.li,{children:"Control planes for driving processes."}),"\n"]}),"\n",(0,t.jsxs)(r.p,{children:["The ",(0,t.jsx)(r.code,{children:"TemporalRuntime"})," in Metatype can be used to directly ",(0,t.jsx)(r.code,{children:"start"}),", ",(0,t.jsx)(r.code,{children:"query"}),", ",(0,t.jsx)(r.code,{children:"signal"})," and ",(0,t.jsx)(r.code,{children:"describe"})," workflows on your temporal cluster. Refer to the ",(0,t.jsx)(r.a,{href:"https://docs.temporal.io",children:"temporal docs"})," for more on what you can accomplish with this tech."]}),"\n",(0,t.jsx)(r.p,{children:"An interesting use case is to dynamically describe the operations you want to expose, this enables reusing typegraphs accross different projects or even building a small framework around it."}),"\n",(0,t.jsx)(r.p,{children:"Here is a simple example of a typegraph that takes some value from an environment variable."}),"\n",(0,t.jsx)(s.A,{typegraph:"temporal",python:n(60160),typescript:n(7110),disablePlayground:!0,query:{content:""}})]})}function d(e={}){const{wrapper:r}={...(0,o.R)(),...e.components};return r?(0,t.jsx)(r,{...e,children:(0,t.jsx)(m,{...e})}):m(e)}},60160:e=>{e.exports={content:'from typegraph import t, typegraph, Policy, Graph\nfrom typegraph.graph.params import Cors\nfrom typegraph.providers.temporal import TemporalRuntime\nimport os\n\n\n@typegraph(\n)\ndef temporal(g: Graph):\n  public = Policy.public()\n  temporal = TemporalRuntime(\n    "<name>", "<host_secret>", namespace_secret="<ns_secret>"\n  )\n\n  workflow_id = os.getenv("ID_FROM_ENV")\n  arg = t.struct({"some_field": t.string()})\n\n  g.expose(\n    public,\n    start=temporal.start_workflow("<workflow_type>", arg),\n    query=temporal.query_workflow(\n      "<query_type>", arg, t.string()\n    ),\n    signal=temporal.signal_workflow("<signal_name>", arg),\n    describe=temporal.describe_workflow().reduce(\n      {"workflow_id": workflow_id}\n    )\n    if workflow_id\n    else temporal.describe_workflow(),\n  )',path:"examples/typegraphs/temporal.py"}},7110:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";\nimport { TemporalRuntime } from "@typegraph/sdk/providers/temporal.ts";\n\n\ntypegraph(\n  {\n    name: "temporal",\n  },\n  (g: any) => {\n    const pub = Policy.public();\n    const temporal = new TemporalRuntime({\n      name: "<name>",\n      hostSecret: "<host_secret>",\n      namespaceSecret: "<ns_secret>",\n    });\n\n    const workflow_id = getEnvVariable("ID_FROM_ENV");\n    const arg = t.struct({ some_field: t.string() });\n\n    g.expose(\n      {\n        start: temporal.startWorkflow("<workflow_type>", arg),\n        query: temporal.queryWorkflow("<query_type>", arg, t.string()),\n        signal: temporal.signalWorkflow("<signal_name>", arg),\n        describe: workflow_id\n          ? temporal.describeWorkflow().reduce({ workflow_id })\n          : temporal.describeWorkflow(),\n      },\n      pub\n    );\n  }\n);',path:"examples/typegraphs/temporal.ts"}}}]);