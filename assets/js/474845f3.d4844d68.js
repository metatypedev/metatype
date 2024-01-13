(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1937],{16529:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>d,contentTitle:()=>l,default:()=>p,frontMatter:()=>a,metadata:()=>o,toc:()=>c});var i=t(11527),r=t(67541),s=(t(40067),t(83060));const a={},l="Deno/typescript",o={id:"reference/runtimes/deno/index",title:"Deno/typescript",description:"Deno runtime",source:"@site/docs/reference/runtimes/deno/index.mdx",sourceDirName:"reference/runtimes/deno",slug:"/reference/runtimes/deno/",permalink:"/docs/reference/runtimes/deno/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/deno/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Runtimes",permalink:"/docs/reference/runtimes/"},next:{title:"GraphQL",permalink:"/docs/reference/runtimes/graphql/"}},d={},c=[{value:"Deno runtime",id:"deno-runtime",level:2}];function u(e){const n={code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",...(0,r.a)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"denotypescript",children:"Deno/typescript"}),"\n","\n","\n",(0,i.jsx)(n.h2,{id:"deno-runtime",children:"Deno runtime"}),"\n",(0,i.jsx)(n.p,{children:"While the tutorial covered already interesting runtimes, allowing you to connect to already a lot of systems and different protocols, there is still one powerful that wasn't covered yet: the typescript or Deno runtime."}),"\n",(0,i.jsx)(n.p,{children:"This enables to run lightweight and short-lived typescript function in a sandboxed environment. Permissions can be customized per typegraph and by default only include some HTTPs domains. It's a great way to implement custom logic and materializers. All typegraphs can lazily spawn a web worker and get an incredible cold-start and continuous performance thanks to the V8 engine powering Deno."}),"\n",(0,i.jsx)(s.Z,{typegraph:"deno",python:t(98477),query:t(89769)}),"\n",(0,i.jsx)(n.p,{children:"Example:"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'# my_typegraph.py\n\nfrom typegraph import TypeGraph, policies, t\nfrom typegraph.runtimes.deno import ModuleMat, PureFunMat\n\nwith TypeGraph("deno") as g:\n    public = policies.public()\n\n    g.expose(\n        add=t.func(\n            t.struct({"a": t.number(), "b": t.number()}),\n            t.number(),\n            ModuleMat("main.ts").imp("doAddition"),\n        ),\n        simple=t.func(\n            t.struct({"a": t.number(), "b": t.number()}),\n            t.number(),\n            PureFunMat("({ a, b }) => a + b"),\n        ),\n        default_policy=[public],\n    )\n'})}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-typescript",children:"// main.ts\n\ninterface AddInput {\n  a: number;\n  b: number;\n}\nexport function doAddition({ a, b }: AddInput) {\n  return a + b;\n}\n\n"})})]})}function p(e={}){const{wrapper:n}={...(0,r.a)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(u,{...e})}):u(e)}},39805:(e,n,t)=>{"use strict";t.d(n,{r:()=>r});t(50959);var i=t(11527);function r(e){let{name:n,choices:t,choice:r,onChange:s,className:a}=e;return(0,i.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${a??""}`,children:Object.entries(t).map((e=>{let[t,a]=e;return(0,i.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,i.jsx)("div",{children:(0,i.jsxs)("label",{className:"cursor-pointer",children:[(0,i.jsx)("input",{type:"radio",name:n,value:t,checked:t===r,onChange:()=>s(t),className:"hidden peer"}),(0,i.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:a})]})})},t)}))})}},814:(e,n,t)=>{"use strict";t.d(n,{Z:()=>x});var i=t(50959),r=t(73327),s=t(49790),a=t(56096),l=t(40067),o=t(25920),d=t(54314),c=t(11527);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:n,variableEditor:t,headerEditor:r}=(0,d._i)({nonNull:!0}),[s,a]=(0,i.useState)(e.defaultTab),l=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),o=(0,d.fE)();return(0,i.useEffect)((()=>{t&&u(t)}),[s,t]),(0,i.useEffect)((()=>{r&&u(r)}),[s,r]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,i.useEffect)((()=>{r&&(r.setOption("lineNumbers",!1),r.setOption("gutters",[]),r.on("change",u))}),[r]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===s?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===s?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===s?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(s&&s.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===s?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==s,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==s,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(39805);function f(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const g={typegraph:"Typegraph",playground:"Playground"};function b(e){let{typegraph:n,query:t,code:s,codeLanguage:u,codeFileUrl:b,headers:x={},variables:y={},tab:v="",noTool:j=!1,defaultMode:N=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,a.Z)(),w=(0,i.useMemo)((()=>new h),[]),q=(0,i.useMemo)((()=>(0,r.nq)({url:`${k}/${n}`})),[]),[E,C]=(0,i.useState)(N);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[N?(0,c.jsx)(m.r,{name:"mode",choices:g,choice:E,onChange:C,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:q,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(x),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w,children:(0,c.jsxs)("div",{className:(N?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[N&&"typegraph"!==E?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[b?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(o.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${b}`,children:b})]}):null,s?(0,c.jsx)(l.Z,{language:u,wrap:!0,className:"flex-1",children:s}):null]}),N&&"playground"!==E?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(p,{defaultTab:v,noTool:j})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(f,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function x(e){return(0,c.jsx)(s.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(b,{...e})})}},83060:(e,n,t)=>{"use strict";t.d(n,{Z:()=>s});var i=t(814),r=(t(50959),t(11527));function s(e){let{python:n,...t}=e;return(0,r.jsx)(i.Z,{code:n.content,codeLanguage:"python",codeFileUrl:n.path,...t})}},89769:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"compute_fib"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"3"}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"res"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"ms"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:51}};n.loc.source={body:"query {\n  compute_fib(n: 3) {\n    res\n    ms\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},98477:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef deno(g: Graph):\n  deno = DenoRuntime()\n  public = Policy.public()\n\n  fib = deno.func(\n    t.struct({"n": t.float()}),\n    t.struct({"res": t.integer(), "ms": t.float()}),\n    code="""\n    ({ n }) => {\n        let a = 0, b = 1, c;\n        const start = performance.now();\n        for (\n          let i = 0;\n          i < Math.min(n, 10);\n          c = a + b, a = b, b = c, i += 1\n        );\n        return {\n          res: b,\n          ms: performance.now() - start,\n        };\n      }\n      """,\n  )\n\n  g.expose(\n    public,\n    compute_fib=fib,\n  )',path:"website/docs/reference/runtimes/deno/deno.py"}}}]);