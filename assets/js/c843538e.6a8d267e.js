(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[272],{4446:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>h,frontMatter:()=>r,metadata:()=>o,toc:()=>d});var a=t(11527),s=t(63883),i=t(3643);const r={},l="Cloud function runner",o={id:"faas-runner/index",title:"Cloud function runner",description:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks.",source:"@site/use-cases/faas-runner/index.mdx",sourceDirName:"faas-runner",slug:"/faas-runner/",permalink:"/use-cases/faas-runner/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/faas-runner/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"},next:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function u(e){const n={h1:"h1",h2:"h2",img:"img",li:"li",ol:"ol",p:"p",...(0,s.a)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.h1,{id:"cloud-function-runner",children:"Cloud function runner"}),"\n",(0,a.jsx)(n.p,{children:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks."}),"\n",(0,a.jsx)(n.h2,{id:"case-study",children:"Case study"}),"\n",(0,a.jsx)("div",{className:"text-center md:float-right p-8",children:(0,a.jsx)(n.p,{children:(0,a.jsx)(n.img,{src:t(15674).Z+"",width:"337",height:"311"})})}),"\n",(0,a.jsx)(n.p,{children:"For example, imagine you have an e-commerce application that uses FaaS to process orders. When a customer places an order, multiple functions may need to be executed, such as validating the order, processing the payment, and updating the inventory."}),"\n",(0,a.jsx)(n.p,{children:"Each function may be executed independently by the FaaS platform and may take varying amounts of time to complete. Those functions may also be executed for historical reason on different platforms like AWS Lambda, Google Cloud Functions, or Azure Functions."}),"\n",(0,a.jsx)(n.p,{children:"To collect the results of all the functions in a timely manner, you need to ensure that each function is executed in the correct order and that you are not waiting for a slow function to complete before moving on to the next function."}),"\n",(0,a.jsx)(n.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,a.jsx)(n.p,{children:"To solve the use case of executing multiple functions and collecting their results, Metatype provides two key features."}),"\n",(0,a.jsxs)(n.ol,{children:["\n",(0,a.jsxs)(n.li,{children:["\n",(0,a.jsx)(n.p,{children:"Function composition/chaining: functions can be chained together to form a pipeline. The output of one function can be used as the input of the next function in the pipeline. This allows us to execute multiple functions in a specific order."}),"\n"]}),"\n",(0,a.jsxs)(n.li,{children:["\n",(0,a.jsx)(n.p,{children:"Embedded runner: you can easily write a function that glues together multiple functions and executes them in a specific order. This allows you to execute multiple functions in a specific order. Currently, both Python and Typescript are supported."}),"\n"]}),"\n"]}),"\n",(0,a.jsx)(i.Z,{typegraph:"faas-runner",python:t(75052),query:t(41355)})]})}function h(e={}){const{wrapper:n}={...(0,s.a)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(u,{...e})}):u(e)}},46153:(e,n,t)=>{"use strict";t.d(n,{r:()=>s});t(50959);var a=t(11527);function s(e){let{name:n,choices:t,choice:s,onChange:i,className:r}=e;return(0,a.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(t).map((e=>{let[t,r]=e;return(0,a.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,a.jsx)("div",{children:(0,a.jsxs)("label",{className:"cursor-pointer",children:[(0,a.jsx)("input",{type:"radio",name:n,value:t,checked:t===s,onChange:()=>i(t),className:"hidden peer"}),(0,a.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},t)}))})}},48893:(e,n,t)=>{"use strict";t.d(n,{Z:()=>g});var a=t(50959),s=t(52691),i=t(45197),r=t(14899),l=t(86117),o=t(33961),c=t(11527);const d=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:n,variableEditor:t,headerEditor:s}=(0,o._i)({nonNull:!0}),[i,r]=(0,a.useState)(e.defaultTab),l=(0,o.Xd)({onCopyQuery:e.onCopyQuery}),u=(0,o.fE)();return(0,a.useEffect)((()=>{t&&d(t)}),[i,t]),(0,a.useEffect)((()=>{s&&d(s)}),[i,s]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",d),d(n))}),[n]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",d))}),[t]),(0,a.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",d))}),[s]),(0,c.jsx)(o.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(o.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(o._8,{}),(0,c.jsx)(o.wC,{onClick:()=>u(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(o.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(o.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(o.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===i?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===i?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers",children:[(0,c.jsx)(o.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(o.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=t(46153);function m(){return(0,o.JB)({nonNull:!0}).isFetching?(0,c.jsx)(o.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function y(e){let{typegraph:n,query:t,code:i,codeLanguage:d,codeFileUrl:y,headers:g={},variables:x={},tab:v="",noTool:b=!1,defaultMode:j=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,r.Z)(),N=(0,a.useMemo)((()=>new h),[]),w=(0,a.useMemo)((()=>(0,s.nq)({url:`${k}/${n}`})),[]),[C,q]=(0,a.useState)(j);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[j?(0,c.jsx)(p.r,{name:"mode",choices:f,choice:C,onChange:q,className:"mb-2"}):null,(0,c.jsx)(o.j$,{fetcher:w,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(g),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:N,children:(0,c.jsxs)("div",{className:(j?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[j&&"typegraph"!==C?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[y?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)("a",{href:`https://github.com/metatypedev/metatype/blob/main/${y}`,children:y})]}):null,i?(0,c.jsx)(l.Z,{language:d,wrap:!0,className:"flex-1",children:i}):null]}),j&&"playground"!==C?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(u,{defaultTab:v,noTool:b})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(m,{}),(0,c.jsx)(o.iB,{})]})]})]})})]})}function g(e){return(0,c.jsx)(i.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(y,{...e})})}},3643:(e,n,t)=>{"use strict";t.d(n,{Z:()=>i});var a=t(48893),s=(t(50959),t(11527));function i(e){let{python:n,...t}=e;return(0,s.jsx)(a.Z,{code:n.content,codeLanguage:"python",codeFileUrl:n.path,...t})}},41355:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pycumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]},{kind:"Field",name:{kind:"Name",value:"tscumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]}]}}],loc:{start:0,end:45}};n.loc.source={body:"query {\n  pycumsum(n: 5)\n\n  tscumsum(n: 5)\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&n.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var a={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),a[e.name.value]=n}})),e.exports=n},15674:(e,n,t)=>{"use strict";t.d(n,{Z:()=>a});const a=t.p+"assets/images/image.drawio-1eac40d204b6d3f2e3f634e3bd1b86b1.svg"},75052:e=>{e.exports={content:'@typegraph(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef faas_runner(g: Graph):\n  public = Policy.public()\n\n  deno = DenoRuntime()\n  python = PythonRuntime()\n\n  inp = t.struct({"n": t.integer(min=0, max=100)})\n  out = t.integer()\n\n  g.expose(\n    pycumsum=python.from_lambda(\n      inp, out, lambda inp: sum(range(inp["n"]))\n    ),\n    tscumsum=deno.func(\n      inp,\n      out,\n      code="({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",\n    ),\n    default_policy=[public],\n  )',path:"website/use-cases/faas-runner/t.py"}}}]);