(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6557],{99916:(e,n,i)=>{"use strict";i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>r,default:()=>h,frontMatter:()=>a,metadata:()=>l,toc:()=>d});var t=i(11527),s=i(88672),o=(i(31175),i(47550));const a={sidebar_position:3},r="Policies",l={id:"reference/policies/index",title:"Policies",description:"{/*",source:"@site/docs/reference/policies/index.mdx",sourceDirName:"reference/policies",slug:"/reference/policies/",permalink:"/docs/reference/policies/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/policies/index.mdx",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"docs",previous:{title:"WebAssembly",permalink:"/docs/reference/runtimes/wasmedge/"},next:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"}},c={},d=[{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}];function u(e){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,s.a)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"policies",children:"Policies"}),"\n","\n","\n","\n",(0,t.jsx)(n.h1,{id:"policies-and-materializers",children:"Policies and materializers"}),"\n",(0,t.jsx)(n.p,{children:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."}),"\n",(0,t.jsx)(n.h2,{id:"policy-based-access-control-pbac",children:"Policy based access control (PBAC)"}),"\n",(0,t.jsx)(n.p,{children:"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."}),"\n",(0,t.jsx)(n.p,{children:"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"policies.public()"})," is an alias for ",(0,t.jsx)(n.code,{children:'Policy(PureFunMat("() => true"))'})," providing everyone open access."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:'policies.ctx("role_value", "role_field")'})," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."}),"\n",(0,t.jsx)(o.Z,{typegraph:"policies",python:i(89033),typescript:i(32070),query:i(78416)})]})}function h(e={}){const{wrapper:n}={...(0,s.a)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(u,{...e})}):u(e)}},73269:(e,n,i)=>{"use strict";i.d(n,{r:()=>s});i(50959);var t=i(11527);function s(e){let{name:n,choices:i,choice:s,onChange:o,className:a}=e;return(0,t.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${a??""}`,children:Object.entries(i).map((e=>{let[i,a]=e;return(0,t.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,t.jsx)("div",{children:(0,t.jsxs)("label",{className:"cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:n,value:i,checked:i===s,onChange:()=>o(i),className:"hidden peer"}),(0,t.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:a})]})})},i)}))})}},31572:(e,n,i)=>{"use strict";i.d(n,{Z:()=>x});var t=i(50959),s=i(73327),o=i(54143),a=i(22),r=i(31175),l=i(82142),c=i(23843),d=i(11527);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:n,variableEditor:i,headerEditor:s}=(0,c._i)({nonNull:!0}),[o,a]=(0,t.useState)(e.defaultTab),r=(0,c.Xd)({onCopyQuery:e.onCopyQuery}),l=(0,c.fE)();return(0,t.useEffect)((()=>{i&&u(i)}),[o,i]),(0,t.useEffect)((()=>{s&&u(s)}),[o,s]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",u))}),[i]),(0,t.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",u))}),[s]),(0,d.jsx)(c.u.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c._8,{}),(0,d.jsx)(c.wC,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.wC,{onClick:()=>r(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===o?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===o?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(o&&o.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===o?"Variables":"Headers",children:[(0,d.jsx)(c.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==o,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==o,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=i(73269);function y(){return(0,c.JB)({nonNull:!0}).isFetching?(0,d.jsx)(c.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function g(e){let{typegraph:n,query:i,code:o,headers:u={},variables:g={},tab:x="",noTool:v=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:j}}}=(0,a.Z)(),k=(0,t.useMemo)((()=>new p),[]),w=(0,t.useMemo)((()=>(0,s.nq)({url:`${j}/${n}`})),[]),[N,_]=(0,t.useState)(b);return(0,d.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,d.jsx)(m.r,{name:"mode",choices:f,choice:N,onChange:_,className:"mb-2"}):null,(0,d.jsx)(c.j$,{fetcher:w,defaultQuery:i.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(g),storage:k,children:(0,d.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==N?null:o?.map((e=>(0,d.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,d.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,d.jsx)(l.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,d.jsx)(r.Z,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),b&&"playground"!==N?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:x,noTool:v})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(y,{}),(0,d.jsx)(c.iB,{})]})]})]})})]})}function x(e){return(0,d.jsx)(o.Z,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(g,{...e})})}},47550:(e,n,i)=>{"use strict";i.d(n,{Z:()=>o});var t=i(31572),s=(i(50959),i(11527));function o(e){let{python:n,typescript:i,...o}=e;const a=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},i&&{content:i.content,codeLanguage:"typescript",codeFileUrl:i.path}].filter((e=>!!e));return(0,s.jsx)(t.Z,{code:0==a.length?void 0:a,...o})}},78416:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};n.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&n.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,n)})),e.definitions&&e.definitions.forEach((function(e){i(e,n)}))}var t={};function s(e,n){for(var i=0;i<e.definitions.length;i++){var t=e.definitions[i];if(t.name&&t.name.value==n)return t}}function o(e,n){var i={kind:e.kind,definitions:[s(e,n)]};e.hasOwnProperty("loc")&&(i.loc=e.loc);var o=t[n]||new Set,a=new Set,r=new Set;for(o.forEach((function(e){r.add(e)}));r.size>0;){var l=r;r=new Set,l.forEach((function(e){a.has(e)||(a.add(e),(t[e]||new Set).forEach((function(e){r.add(e)})))}))}return a.forEach((function(n){var t=s(e,n);t&&i.definitions.push(t)})),i}n.definitions.forEach((function(e){if(e.name){var n=new Set;i(e,n),t[e.name.value]=n}})),e.exports=n,e.exports.A=o(n,"A"),e.exports.B=o(n,"B"),e.exports.C=o(n,"C"),e.exports.D=o(n,"D")},89033:e=>{e.exports={content:'@typegraph(\n  cors=Cors(\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef policies(g: Graph):\n  deno = DenoRuntime()\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  )\n  user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  )\n\n  g.auth(Auth.basic(["admin", "user"]))\n\n  g.expose(\n    public=random.gen(t.string()).with_policy(public),\n    admin_only=random.gen(t.string()).with_policy(admin_only),\n    user_only=random.gen(t.string()).with_policy(user_only),\n    both=random.gen(t.string()).with_policy(\n      user_only, admin_only\n    ),\n  )',path:"examples/typegraphs/policies.py"}},32070:e=>{e.exports={content:'typegraph({\n  name: "policies",\n  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },\n}, (g) => {\n  const deno = new DenoRuntime();\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  const admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  );\n  const user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  );\n\n  g.auth(Auth.basic(["admin", "user"]));\n\n  g.expose({\n    public: random.gen(t.string()).withPolicy(pub),\n    admin_only: random.gen(t.string()).withPolicy(admin_only),\n    user_only: random.gen(t.string()).withPolicy(user_only),\n    both: random.gen(t.string()).withPolicy([user_only, admin_only]),\n  });\n});',path:"examples/typegraphs/policies.ts"}}}]);