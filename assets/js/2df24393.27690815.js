(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8598],{31184:(e,n,i)=>{"use strict";i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>a,default:()=>p,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var t=i(13274),s=i(74169),o=(i(87174),i(91696));const r={sidebar_position:3},a="Policies",l={id:"reference/policies/index",title:"Policies",description:"{/*",source:"@site/docs/reference/policies/index.mdx",sourceDirName:"reference/policies",slug:"/reference/policies/",permalink:"/docs/reference/policies/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/policies/index.mdx",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"docs",previous:{title:"WebAssembly",permalink:"/docs/reference/runtimes/wasmedge/"},next:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"}},c={},d=[{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}];function u(e){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,s.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"policies",children:"Policies"}),"\n","\n","\n","\n",(0,t.jsx)(n.h1,{id:"policies-and-materializers",children:"Policies and materializers"}),"\n",(0,t.jsx)(n.p,{children:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."}),"\n",(0,t.jsx)(n.h2,{id:"policy-based-access-control-pbac",children:"Policy based access control (PBAC)"}),"\n",(0,t.jsx)(n.p,{children:"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."}),"\n",(0,t.jsx)(n.p,{children:"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"policies.public()"})," is an alias for ",(0,t.jsx)(n.code,{children:'Policy(PureFunMat("() => true"))'})," providing everyone open access."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:'policies.ctx("role_value", "role_field")'})," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."}),"\n",(0,t.jsx)(o.A,{typegraph:"policies",python:i(34316),typescript:i(90186),query:i(98735)})]})}function p(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(u,{...e})}):u(e)}},80534:(e,n,i)=>{"use strict";i.d(n,{m:()=>s});i(79474);var t=i(13274);function s(e){let{name:n,choices:i,choice:s,onChange:o,className:r}=e;return(0,t.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(i).map((e=>{let[i,r]=e;return(0,t.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,t.jsx)("div",{children:(0,t.jsxs)("label",{className:"cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:n,value:i,checked:i===s,onChange:()=>o(i),className:"hidden peer"}),(0,t.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},i)}))})}},491:(e,n,i)=>{"use strict";i.d(n,{A:()=>g});var t=i(79474),s=i(18920),o=i(8377),r=i(40803),a=i(87174),l=i(5883),c=i(21806),d=i(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:n,variableEditor:i,headerEditor:s}=(0,c.mi)({nonNull:!0}),[o,r]=(0,t.useState)(e.defaultTab),a=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,t.useEffect)((()=>{i&&u(i)}),[o,i]),(0,t.useEffect)((()=>{s&&u(s)}),[o,s]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",u))}),[i]),(0,t.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",u))}),[s]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>a(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===o?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===o?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(o&&o.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===o?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==o,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==o,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=i(80534);function y(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:n,query:i,code:o,headers:u={},variables:x={},tab:g="",noTool:v=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:j}}}=(0,r.A)(),k=(0,t.useMemo)((()=>new h),[]),w=(0,t.useMemo)((()=>(0,s.a5)({url:`${j}/${n}`})),[]),[N,_]=(0,t.useState)(b);return(0,d.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,d.jsx)(m.m,{name:"mode",choices:f,choice:N,onChange:_,className:"mb-2"}):null,(0,d.jsx)(c.ql,{fetcher:w,defaultQuery:i.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(x),storage:k,children:(0,d.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==N?null:o?.map((e=>(0,d.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[e?.codeFileUrl?(0,d.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,d.jsx)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,children:e?.codeFileUrl})]}):null,e?(0,d.jsx)(a.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content}):null]}))),b&&"playground"!==N?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:g,noTool:v})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(y,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function g(e){return(0,d.jsx)(o.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(x,{...e})})}},91696:(e,n,i)=>{"use strict";i.d(n,{A:()=>o});var t=i(491),s=(i(79474),i(13274));function o(e){let{python:n,typescript:i,...o}=e;const r=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},i&&{content:i.content,codeLanguage:"typescript",codeFileUrl:i.path}].filter((e=>!!e));return(0,s.jsx)(t.A,{code:0==r.length?void 0:r,...o})}},98735:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};n.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&n.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,n)})),e.definitions&&e.definitions.forEach((function(e){i(e,n)}))}var t={};function s(e,n){for(var i=0;i<e.definitions.length;i++){var t=e.definitions[i];if(t.name&&t.name.value==n)return t}}function o(e,n){var i={kind:e.kind,definitions:[s(e,n)]};e.hasOwnProperty("loc")&&(i.loc=e.loc);var o=t[n]||new Set,r=new Set,a=new Set;for(o.forEach((function(e){a.add(e)}));a.size>0;){var l=a;a=new Set,l.forEach((function(e){r.has(e)||(r.add(e),(t[e]||new Set).forEach((function(e){a.add(e)})))}))}return r.forEach((function(n){var t=s(e,n);t&&i.definitions.push(t)})),i}n.definitions.forEach((function(e){if(e.name){var n=new Set;i(e,n),t[e.name.value]=n}})),e.exports=n,e.exports.A=o(n,"A"),e.exports.B=o(n,"B"),e.exports.C=o(n,"C"),e.exports.D=o(n,"D")},34316:e=>{e.exports={content:'@typegraph(\n  cors=Cors(\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef policies(g: Graph):\n  deno = DenoRuntime()\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  )\n  user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  )\n\n  g.auth(Auth.basic(["admin", "user"]))\n\n  g.expose(\n    public=random.gen(t.string()).with_policy(public),\n    admin_only=random.gen(t.string()).with_policy(admin_only),\n    user_only=random.gen(t.string()).with_policy(user_only),\n    both=random.gen(t.string()).with_policy(\n      user_only, admin_only\n    ),\n  )',path:"examples/typegraphs/policies.py"}},90186:e=>{e.exports={content:'typegraph({\n  name: "policies",\n  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },\n}, (g) => {\n  const deno = new DenoRuntime();\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  const admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  );\n  const user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  );\n\n  g.auth(Auth.basic(["admin", "user"]));\n\n  g.expose({\n    public: random.gen(t.string()).withPolicy(pub),\n    admin_only: random.gen(t.string()).withPolicy(admin_only),\n    user_only: random.gen(t.string()).withPolicy(user_only),\n    both: random.gen(t.string()).withPolicy([user_only, admin_only]),\n  });\n});',path:"examples/typegraphs/policies.ts"}},74169:(e,n,i)=>{"use strict";i.d(n,{R:()=>r,x:()=>a});var t=i(79474);const s={},o=t.createContext(s);function r(e){const n=t.useContext(o);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:r(e.components),t.createElement(o.Provider,{value:n},e.children)}}}]);