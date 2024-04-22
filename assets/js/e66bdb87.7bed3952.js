(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[4591],{7733:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>u,contentTitle:()=>l,default:()=>p,frontMatter:()=>d,metadata:()=>c,toc:()=>m});var i=t(13274),r=t(99128),a=t(81288),s=t(53279),o=t(56978);const d={},l="Random",c={id:"reference/runtimes/random/index",title:"Random",description:"Random runtime",source:"@site/docs/reference/runtimes/random/index.mdx",sourceDirName:"reference/runtimes/random",slug:"/reference/runtimes/random/",permalink:"/docs/reference/runtimes/random/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/random/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Python",permalink:"/docs/reference/runtimes/python/"},next:{title:"S3",permalink:"/docs/reference/runtimes/s3/"}},u={},m=[{value:"Random runtime",id:"random-runtime",level:2},{value:"Generators",id:"generators",level:2}];function h(e){const n={code:"code",em:"em",h1:"h1",h2:"h2",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,r.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"random",children:"Random"}),"\n",(0,i.jsx)(n.h2,{id:"random-runtime",children:"Random runtime"}),"\n",(0,i.jsxs)(n.p,{children:["The Random runtime allows you to produce ",(0,i.jsx)(n.em,{children:"structured"})," datas randomly."]}),"\n",(0,i.jsx)(n.p,{children:"One use case is to use this runtime as way of testing, for example you can rapidly draft a small backend that produces structured data for your frontend application."}),"\n",(0,i.jsxs)(n.p,{children:["The ",(0,i.jsx)(n.code,{children:"seed"})," parameter ensures repeatability if set."]}),"\n",(0,i.jsx)(a.A,{typegraph:"random",python:t(84590),tyepescript:t(60936),query:t(51221)}),"\n",(0,i.jsx)(n.p,{children:"Another use case is to inject random values to a materializer input"}),"\n",(0,i.jsx)(a.A,{typegraph:"random-field",python:t(98996),query:t(50230)}),"\n",(0,i.jsx)(n.h2,{id:"generators",children:"Generators"}),"\n",(0,i.jsxs)(n.p,{children:["Here is a list of some standard generators that you can attach to your type, if ",(0,i.jsx)(n.em,{children:"unspecifed"}),", it will default on generating any values that the associated type can hold."]}),"\n",(0,i.jsxs)(n.table,{children:[(0,i.jsx)(n.thead,{children:(0,i.jsxs)(n.tr,{children:[(0,i.jsx)(n.th,{children:"Type"}),(0,i.jsx)(n.th,{style:{textAlign:"center"},children:"Generator config"})]})}),(0,i.jsxs)(n.tbody,{children:[(0,i.jsxs)(n.tr,{children:[(0,i.jsx)(n.td,{children:(0,i.jsx)(n.code,{children:"t.string()"})}),(0,i.jsxs)(n.td,{style:{textAlign:"center"},children:[(0,i.jsx)(n.code,{children:"name"}),", ",(0,i.jsx)(n.code,{children:"address"}),", ",(0,i.jsx)(n.code,{children:"postcode"}),", ",(0,i.jsx)(n.code,{children:"country"}),", ",(0,i.jsx)(n.code,{children:"email"}),", ",(0,i.jsx)(n.code,{children:"uuid"}),", ",(0,i.jsx)(n.code,{children:"uri"}),", ",(0,i.jsx)(n.code,{children:"hostname"}),", ",(0,i.jsx)(n.code,{children:"date"}),", ",(0,i.jsx)(n.code,{children:"time"}),", ",(0,i.jsx)(n.code,{children:"phone"}),", ",(0,i.jsx)(n.code,{children:"ean"})]})]}),(0,i.jsxs)(n.tr,{children:[(0,i.jsxs)(n.td,{children:[(0,i.jsx)(n.code,{children:"t.integer()"}),", ",(0,i.jsx)(n.code,{children:"t.float()"})]}),(0,i.jsx)(n.td,{style:{textAlign:"center"},children:(0,i.jsx)(n.code,{children:"age"})})]})]})]}),"\n",(0,i.jsxs)(s.A,{children:[(0,i.jsx)(o.A,{value:"python",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'user = t.struct(\n    {\n        "id": t.uuid(),  # random uuid\n        "name": t.string(config={"gen": "name"}), # random name\n        "age": t.integer(config={"gen": "age", "type": "adult"}), # type: "child", "adult"\n        "email": t.email(),\n        "address": t.struct(\n            {\n                "street": t.string(config={"gen": "address"}),\n                "city": t.string(config={"gen": "city"}),\n                "postcode": t.string(config={"gen": "postcode"}),\n                "country": t.string(config={"gen": "country", "full": True}),\n            }\n        ),\n    }\n)\n'})})}),(0,i.jsx)(o.A,{value:"typescript",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-typescript",children:'const user = t.struct(\n    {\n        id: t.uuid(),  // random uuid\n        name: t.string({}, { config: { gen: "name" } }), // random name\n        age: t.integer({}, { config: { gen: "age", type: "adult" } }), // type: "child", "adult"\n        email: t.email(),\n        address: t.struct(\n            {\n                street: t.string({}, { config: { gen: "address" } }),\n                city: t.string({}, { config: { gen: "city" } }),\n                postcode: t.string({}, { config: { gen: "postcode"} }),\n                country: t.string({}, { config: { gen: "country", full: true } }),\n            }\n        ),\n    }\n)\n'})})})]})]})}function p(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(h,{...e})}):h(e)}},95649:(e,n,t)=>{"use strict";t.d(n,{A:()=>b});var i=t(79474),r=t(355),a=t(70792),s=t(96116),o=t(31604),d=t(12956),l=t(17537),c=t(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function m(e){const{queryEditor:n,variableEditor:t,headerEditor:r}=(0,l.mi)({nonNull:!0}),[a,s]=(0,i.useState)(e.defaultTab),o=(0,l.xb)({onCopyQuery:e.onCopyQuery}),d=(0,l.Ln)();return(0,i.useEffect)((()=>{t&&u(t)}),[a,t]),(0,i.useEffect)((()=>{r&&u(r)}),[a,r]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,i.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",u))}),[r]),(0,c.jsx)(l.m_.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(l.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(l.cl,{}),(0,c.jsx)(l.IB,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(l.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(l.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(l.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("variables"===a?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("headers"===a?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,c.jsx)(l.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(l.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=t(50910),g=t(88244),f=t(56978);function y(){return(0,l.Vm)({nonNull:!0}).isFetching?(0,c.jsx)(l.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function j(e){let{typegraph:n,query:t,code:a,headers:u={},variables:j={},panel:b="",noTool:v=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,s.A)(),q=(0,i.useMemo)((()=>new h),[]),E=(0,i.useMemo)((()=>(0,r.a5)({url:`${N}/${n}`})),[]),[S,T]=(0,i.useState)(k),[A,w]=(0,g.e)();return(0,c.jsxs)("div",{className:"@container miniql mb-4",children:[k?(0,c.jsx)(p.m,{choices:x,choice:S,onChange:T}):null,(0,c.jsx)(l.ql,{fetcher:E,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(j),storage:q,children:(0,c.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==S?null:(0,c.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,c.jsx)(p.m,{choices:{typescript:"Typescript",python:"Python"},choice:A,onChange:w,className:"ml-2",children:a?.map((e=>(0,c.jsxs)(f.A,{value:e.codeLanguage,children:[(0,c.jsxs)(d.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,c.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k&&"playground"!==S?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(m,{defaultTab:b,noTool:v})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(y,{}),(0,c.jsx)(l.ny,{})]})]})]})})]})}function b(e){return(0,c.jsx)(a.A,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(j,{...e})})}},53279:(e,n,t)=>{"use strict";t.d(n,{A:()=>s});t(79474);var i=t(88244),r=t(50910),a=t(13274);function s(e){let{children:n}=e;const[t,s]=(0,i.e)();return(0,a.jsx)(r.m,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:s,children:n})}},81288:(e,n,t)=>{"use strict";t.d(n,{A:()=>a});var i=t(95649),r=(t(79474),t(13274));function a(e){let{python:n,typescript:t,...a}=e;const s=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,r.jsx)(i.A,{code:0==s.length?void 0:s,...a})}},50230:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",alias:{kind:"Name",value:"bonus1"},name:{kind:"Name",value:"get_bonus"},arguments:[{kind:"Argument",name:{kind:"Name",value:"performance"},value:{kind:"IntValue",value:"200"}}],directives:[]},{kind:"Field",alias:{kind:"Name",value:"bonus2"},name:{kind:"Name",value:"get_bonus"},arguments:[{kind:"Argument",name:{kind:"Name",value:"performance"},value:{kind:"IntValue",value:"27"}}],directives:[]}]}}],loc:{start:0,end:88}};n.loc.source={body:"query {\n    bonus1: get_bonus(performance: 200)\n    bonus2: get_bonus(performance: 27)\n}",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},51221:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_idea"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"authorEmail"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:76}};n.loc.source={body:"query {\n    get_idea {\n        id\n        # name\n        authorEmail\n    }\n}",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},98996:e=>{e.exports={content:'from typegraph import typegraph, Policy, t, Graph\nfrom typegraph.runtimes.deno import DenoRuntime\n\nimport time\n\n\n@typegraph(\n)\ndef roadmap(g: Graph):\n  deno = DenoRuntime()\n  pub = Policy.public()\n\n  bonus = t.list(t.enum(["+1 gold", "+1 metal"]))\n  daily_bonus = t.struct(\n    {\n      "performance": t.integer(),\n      "bonus": bonus.from_random(),  # this field is now generated randomly\n    }\n  )\n\n  # set a custom seed\n  custom = int(round(time.time() * 1000)) % 1000\n  g.configure_random_injection(seed=custom)\n\n  g.expose(\n    pub,\n    get_bonus=deno.func(\n      daily_bonus,\n      t.string(),\n      code="""\n      ({ performance, bonus }) => `Daily bonus: ${\n        (performance > 100 ? bonus : [\'none\']).join(\', \')\n      }`;\n      """,\n    ),\n  )',path:"examples/typegraphs/random-field.py"}},84590:e=>{e.exports={content:'from typegraph import typegraph, Policy, t, Graph\nfrom typegraph.runtimes.random import RandomRuntime\n\n\n\n@typegraph(\n)\ndef roadmap(g: Graph):\n  idea = t.struct(\n    {\n      "id": t.uuid(\n        as_id=True\n      ),  # uuid is just a shorthand alias for `t.string({format: "uuid"})`\n      "name": t.string(),\n      "authorEmail": t.email(),  # another string shorthand\n    }\n  )\n  random = RandomRuntime(reset=None, seed=1)\n  pub = Policy.public()\n  g.expose(pub, get_idea=random.gen(idea))',path:"examples/typegraphs/roadmap-random.py"}},60936:e=>{e.exports={content:'import { Policy, t, typegraph } from "@typegraph/sdk/index.js";\nimport { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";\n\n\nawait typegraph({\n  name: "roadmap-random",\n}, (g) => {\n\n  const idea = t.struct(\n    {\n      "id": t.uuid({ asId: true }), // uuid is just a shorthand alias for `t.string({}, {{format: "uuid"}: undefined})`\n      "name": t.string(),\n      "authorEmail": t.email(), // another string shorthand\n    },\n  );\n\n  const random = new RandomRuntime({ seed: 1 });\n  const pub = Policy.public();\n  g.expose({ get_idea: random.gen(idea) }, pub);\n});',path:"examples/typegraphs/roadmap-random.ts"}}}]);