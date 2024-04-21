(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8598],{83123:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>a,default:()=>p,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var i=t(13274),s=t(25618),o=(t(81628),t(89009));const r={sidebar_position:3},a="Policies",l={id:"reference/policies/index",title:"Policies",description:"{/*",source:"@site/docs/reference/policies/index.mdx",sourceDirName:"reference/policies",slug:"/reference/policies/",permalink:"/docs/reference/policies/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/policies/index.mdx",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"docs",previous:{title:"WebAssembly",permalink:"/docs/reference/runtimes/wasmedge/"},next:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"}},c={},d=[{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}];function u(e){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"policies",children:"Policies"}),"\n","\n","\n",(0,i.jsx)(n.h1,{id:"policies-and-materializers",children:"Policies and materializers"}),"\n",(0,i.jsx)(n.p,{children:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."}),"\n",(0,i.jsx)(n.h2,{id:"policy-based-access-control-pbac",children:"Policy based access control (PBAC)"}),"\n",(0,i.jsx)(n.p,{children:"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."}),"\n",(0,i.jsx)(n.p,{children:"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"policies.public()"})," is an alias for ",(0,i.jsx)(n.code,{children:'Policy(PureFunMat("() => true"))'})," providing everyone open access."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:'policies.ctx("role_value", "role_field")'})," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user."]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."}),"\n",(0,i.jsx)(o.A,{typegraph:"policies",python:t(34316),typescript:t(90186),query:t(98735)})]})}function p(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(u,{...e})}):u(e)}},6381:(e,n,t)=>{"use strict";t.d(n,{m:()=>o});var i=t(79474),s=t(13274);function o(e){let{choices:n,choice:t,onChange:o,className:r,children:a}=e;const l=i.Children.toArray(a).map((e=>{if(!i.isValidElement(e)||!n[e.props?.value])throw new Error("ChoicePicker only accepts children with a value prop");return e})).find((e=>e.props?.value===t));return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("ul",{className:`pl-0 m-0 list-none text-sm ${r??""}`,children:Object.entries(n).map((e=>{let[n,i]=e;return(0,s.jsx)("li",{className:"inline-block rounded-md overflow-clip my-2 mr-2",children:(0,s.jsx)("div",{children:(0,s.jsxs)("label",{className:"cursor-pointer",children:[(0,s.jsx)("input",{type:"radio",value:n,checked:n===t,onChange:()=>o(n),className:"hidden peer"}),(0,s.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:i})]})})},n)}))}),l]})}},40150:(e,n,t)=>{"use strict";t.d(n,{A:()=>b});var i=t(79474),s=t(355),o=t(28331),r=t(54629),a=t(81628),l=t(56617),c=t(61607),d=t(13274);const u=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:n,variableEditor:t,headerEditor:s}=(0,c.mi)({nonNull:!0}),[o,r]=(0,i.useState)(e.defaultTab),a=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,i.useEffect)((()=>{t&&u(t)}),[o,t]),(0,i.useEffect)((()=>{s&&u(s)}),[o,s]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",u),u(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",u))}),[t]),(0,i.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",u))}),[s]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>a(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===o?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===o?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===o?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(o&&o.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===o?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==o,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==o,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class h{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(6381),y=t(62607),f=t(88341);function g(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:n,query:t,code:o,headers:u={},variables:v={},panel:b="",noTool:j=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,r.A)(),N=(0,i.useMemo)((()=>new h),[]),P=(0,i.useMemo)((()=>(0,s.a5)({url:`${w}/${n}`})),[]),[_,q]=(0,i.useState)(k),[C,E]=(0,y.e)();return console.log(o),(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[k?(0,d.jsx)(m.m,{choices:x,choice:_,onChange:q}):null,(0,d.jsx)(c.ql,{fetcher:P,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:N,children:(0,d.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==_?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:E,className:"ml-2",children:o?.map((e=>(0,d.jsxs)(f.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(a.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k&&"playground"!==_?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(p,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(g,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(o.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},89009:(e,n,t)=>{"use strict";t.d(n,{A:()=>o});var i=t(40150),s=(t(79474),t(13274));function o(e){let{python:n,typescript:t,...o}=e;const r=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,s.jsx)(i.A,{code:0==r.length?void 0:r,...o})}},62607:(e,n,t)=>{"use strict";t.d(n,{e:()=>p});var i=t(52264),s=t(52116),o=t(38710),r=t(17604),a=t(79474);const l="sdk",c=(0,r.N)(),d=(0,i.eU)((e=>e(c).searchParams?.get(l)),((e,n,t)=>{const i=e(c).searchParams??new URLSearchParams;i.set(l,t),n(c,(e=>({...e,searchParams:i})))})),u=(0,o.tG)(l,"typescript",(0,o.KU)((()=>sessionStorage)));function p(){const[e,n]=(0,s.fp)(d),[t,i]=(0,s.fp)(u);(0,a.useEffect)((()=>{e&&e!==t&&i(e)}),[e,i]);const o=(0,a.useCallback)((e=>{n(e),i(e)}),[n,i]);return[e??t,o]}},98735:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};n.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};function s(e,n){for(var t=0;t<e.definitions.length;t++){var i=e.definitions[t];if(i.name&&i.name.value==n)return i}}function o(e,n){var t={kind:e.kind,definitions:[s(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var o=i[n]||new Set,r=new Set,a=new Set;for(o.forEach((function(e){a.add(e)}));a.size>0;){var l=a;a=new Set,l.forEach((function(e){r.has(e)||(r.add(e),(i[e]||new Set).forEach((function(e){a.add(e)})))}))}return r.forEach((function(n){var i=s(e,n);i&&t.definitions.push(i)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n,e.exports.A=o(n,"A"),e.exports.B=o(n,"B"),e.exports.C=o(n,"C"),e.exports.D=o(n,"D")},34316:e=>{e.exports={content:'@typegraph(\n  cors=Cors(\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef policies(g: Graph):\n  deno = DenoRuntime()\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  )\n  user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  )\n\n  g.auth(Auth.basic(["admin", "user"]))\n\n  g.expose(\n    public=random.gen(t.string()).with_policy(public),\n    admin_only=random.gen(t.string()).with_policy(admin_only),\n    user_only=random.gen(t.string()).with_policy(user_only),\n    both=random.gen(t.string()).with_policy(\n      user_only, admin_only\n    ),\n  )',path:"examples/typegraphs/policies.py"}},90186:e=>{e.exports={content:'await typegraph({\n  name: "policies",\n  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },\n}, (g) => {\n  const deno = new DenoRuntime();\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  const admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  );\n  const user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  );\n\n  g.auth(Auth.basic(["admin", "user"]));\n\n  g.expose({\n    public: random.gen(t.string()).withPolicy(pub),\n    admin_only: random.gen(t.string()).withPolicy(admin_only),\n    user_only: random.gen(t.string()).withPolicy(user_only),\n    both: random.gen(t.string()).withPolicy([user_only, admin_only]),\n  });\n});',path:"examples/typegraphs/policies.ts"}},25618:(e,n,t)=>{"use strict";t.d(n,{R:()=>r,x:()=>a});var i=t(79474);const s={},o=i.createContext(s);function r(e){const n=i.useContext(o);return i.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function a(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:r(e.components),i.createElement(o.Provider,{value:n},e.children)}}}]);