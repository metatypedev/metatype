(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[272],{36183:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var s=t(11527),a=t(67541),i=t(83060);const r={},o="Cloud function runner",l={id:"faas-runner/index",title:"Cloud function runner",description:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks.",source:"@site/use-cases/faas-runner/index.mdx",sourceDirName:"faas-runner",slug:"/faas-runner/",permalink:"/use-cases/faas-runner/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/faas-runner/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"},next:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"}},c={},d=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function u(e){const n={h1:"h1",h2:"h2",img:"img",li:"li",ol:"ol",p:"p",...(0,a.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"cloud-function-runner",children:"Cloud function runner"}),"\n",(0,s.jsx)(n.p,{children:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks."}),"\n",(0,s.jsx)(n.h2,{id:"case-study",children:"Case study"}),"\n",(0,s.jsx)("div",{className:"text-center md:float-right p-8",children:(0,s.jsx)(n.p,{children:(0,s.jsx)(n.img,{src:t(15674).Z+""})})}),"\n",(0,s.jsx)(n.p,{children:"For example, imagine you have an e-commerce application that uses FaaS to process orders. When a customer places an order, multiple functions may need to be executed, such as validating the order, processing the payment, and updating the inventory."}),"\n",(0,s.jsx)(n.p,{children:"Each function may be executed independently by the FaaS platform and may take varying amounts of time to complete. Those functions may also be executed for historical reason on different platforms like AWS Lambda, Google Cloud Functions, or Azure Functions."}),"\n",(0,s.jsx)(n.p,{children:"To collect the results of all the functions in a timely manner, you need to ensure that each function is executed in the correct order and that you are not waiting for a slow function to complete before moving on to the next function."}),"\n",(0,s.jsx)(n.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,s.jsx)(n.p,{children:"To solve the use case of executing multiple functions and collecting their results, Metatype provides two key features."}),"\n",(0,s.jsxs)(n.ol,{children:["\n",(0,s.jsxs)(n.li,{children:["\n",(0,s.jsx)(n.p,{children:"Function composition/chaining: functions can be chained together to form a pipeline. The output of one function can be used as the input of the next function in the pipeline. This allows us to execute multiple functions in a specific order."}),"\n"]}),"\n",(0,s.jsxs)(n.li,{children:["\n",(0,s.jsx)(n.p,{children:"Embedded runner: you can easily write a function that glues together multiple functions and executes them in a specific order. This allows you to execute multiple functions in a specific order. Currently, both Python and Typescript are supported."}),"\n"]}),"\n"]}),"\n",(0,s.jsx)(i.Z,{typegraph:"faas-runner",python:t(82809),typescript:t(42594),query:t(41355)})]})}function h(e={}){const{wrapper:n}={...(0,a.a)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(u,{...e})}):u(e)}},39805:(e,n,t)=>{"use strict";t.d(n,{r:()=>a});t(50959);var s=t(11527);function a(e){let{name:n,choices:t,choice:a,onChange:i,className:r}=e;return(0,s.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(t).map((e=>{let[t,r]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",name:n,value:t,checked:t===a,onChange:()=>i(t),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},t)}))})}},814:(e,n,t)=>{"use strict";t.d(n,{Z:()=>x});var s=t(50959),a=t(73327),i=t(49790),r=t(56096),o=t(40067),l=t(25920),c=t(54314),d=t(11527);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:n,variableEditor:t,headerEditor:a}=(0,c._i)({nonNull:!0}),[i,r]=(0,s.useState)(e.defaultTab),o=(0,c.Xd)({onCopyQuery:e.onCopyQuery}),l=(0,c.fE)();return(0,s.useEffect)((()=>{t&&u(t)}),[i,t]),(0,s.useEffect)((()=>{a&&u(a)}),[i,a]),(0,s.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,s.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,s.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",u))}),[a]),(0,d.jsx)(c.u.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c._8,{}),(0,d.jsx)(c.wC,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===i?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===i?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===i?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(i&&i.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===i?"Variables":"Headers",children:[(0,d.jsx)(c.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(39805);function f(){return(0,c.JB)({nonNull:!0}).isFetching?(0,d.jsx)(c.$j,{}):null}const y={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:n,query:t,code:i,headers:u={},variables:g={},tab:x="",noTool:v=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:j}}}=(0,r.Z)(),k=(0,s.useMemo)((()=>new p),[]),N=(0,s.useMemo)((()=>(0,a.nq)({url:`${j}/${n}`})),[]),[w,C]=(0,s.useState)(b);return(0,d.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,d.jsx)(m.r,{name:"mode",choices:y,choice:w,onChange:C,className:"mb-2"}):null,(0,d.jsx)(c.j$,{fetcher:N,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(g),storage:k,children:(0,d.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==w?null:i?.map((e=>(0,d.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,d.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,d.jsx)(l.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,d.jsx)(o.Z,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),b&&"playground"!==w?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:x,noTool:v})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(f,{}),(0,d.jsx)(c.iB,{})]})]})]})})]})}function x(e){return(0,d.jsx)(i.Z,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(g,{...e})})}},83060:(e,n,t)=>{"use strict";t.d(n,{Z:()=>i});var s=t(814),a=(t(50959),t(11527));function i(e){let{python:n,typescript:t,...i}=e;const r=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,a.jsx)(s.Z,{code:0==r.length?void 0:r,...i})}},41355:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pycumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]},{kind:"Field",name:{kind:"Name",value:"tscumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]}]}}],loc:{start:0,end:45}};n.loc.source={body:"query {\n  pycumsum(n: 5)\n\n  tscumsum(n: 5)\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var s=e.type;"NamedType"===s.kind&&n.add(s.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var s={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),s[e.name.value]=n}})),e.exports=n},15674:(e,n,t)=>{"use strict";t.d(n,{Z:()=>s});const s=t.p+"assets/images/image.drawio-1eac40d204b6d3f2e3f634e3bd1b86b1.svg"},82809:e=>{e.exports={content:"",path:"examples/typegraphs/faas-runner.py"}},42594:e=>{e.exports={content:'typegraph({\n  name: "faas-runner",\n}, (g) => {\n  const pub = Policy.public();\n\n  const deno = new DenoRuntime();\n  const python = new PythonRuntime();\n\n  const inp = t.struct({ "n": t.integer({ min: 0, max: 100 }) });\n  const out = t.integer();\n\n  g.expose({\n    pycumsum: python.fromLambda(inp, out, {\n      code: `lambda inp: sum(range(inp["n"])`,\n    }),\n    tscumsum: deno.func(\n      inp,\n      out,\n      {\n        code:\n          "({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",\n      },\n    ),\n  }, pub);\n});',path:"examples/typegraphs/faas-runner.ts"}}}]);