(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8598],{22940:(e,n,i)=>{"use strict";i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>o,default:()=>h,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var t=i(13274),s=i(99128),a=(i(31604),i(81288));const r={sidebar_position:3},o="Policies",l={id:"reference/policies/index",title:"Policies",description:"{/*",source:"@site/docs/reference/policies/index.mdx",sourceDirName:"reference/policies",slug:"/reference/policies/",permalink:"/docs/reference/policies/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/policies/index.mdx",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"docs",previous:{title:"Wasm",permalink:"/docs/reference/runtimes/wasm/"},next:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"}},c={},d=[{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}];function p(e){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...(0,s.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"policies",children:"Policies"}),"\n","\n","\n",(0,t.jsx)(n.h1,{id:"policies-and-materializers",children:"Policies and materializers"}),"\n",(0,t.jsx)(n.p,{children:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."}),"\n",(0,t.jsx)(n.h2,{id:"policy-based-access-control-pbac",children:"Policy based access control (PBAC)"}),"\n",(0,t.jsx)(n.p,{children:"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."}),"\n",(0,t.jsx)(n.p,{children:"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"policies.public()"})," is an alias for ",(0,t.jsx)(n.code,{children:'Policy(PureFunMat("() => true"))'})," providing everyone open access."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:'policies.ctx("role_value", "role_field")'})," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."}),"\n",(0,t.jsx)(a.A,{typegraph:"policies",python:i(34316),typescript:i(90186),query:i(98735)})]})}function h(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(p,{...e})}):p(e)}},95649:(e,n,i)=>{"use strict";i.d(n,{A:()=>b});var t=i(79474),s=i(355),a=i(70792),r=i(96116),o=i(31604),l=i(12956),c=i(17537),d=i(13274);const p=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:n,variableEditor:i,headerEditor:s}=(0,c.mi)({nonNull:!0}),[a,r]=(0,t.useState)(e.defaultTab),o=(0,c.xb)({onCopyQuery:e.onCopyQuery}),l=(0,c.Ln)();return(0,t.useEffect)((()=>{i&&p(i)}),[a,i]),(0,t.useEffect)((()=>{s&&p(s)}),[a,s]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",p),p(n))}),[n]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",p))}),[i]),(0,t.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",p))}),[s]),(0,d.jsx)(c.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(c.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(c.cl,{}),(0,d.jsx)(c.IB,{onClick:()=>l(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(c.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(c.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(c.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,d.jsx)(c.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(c.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=i(50910),y=i(88244),f=i(56978);function g(){return(0,c.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(c.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function v(e){let{typegraph:n,query:i,code:a,headers:p={},variables:v={},panel:b="",noTool:j=!1,defaultMode:k=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,r.A)(),N=(0,t.useMemo)((()=>new u),[]),q=(0,t.useMemo)((()=>(0,s.a5)({url:`${w}/${n}`})),[]),[S,E]=(0,t.useState)(k),[P,C]=(0,y.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[k?(0,d.jsx)(m.m,{choices:x,choice:S,onChange:E}):null,(0,d.jsx)(c.ql,{fetcher:q,defaultQuery:i.loc?.source.body.trim(),defaultHeaders:JSON.stringify(p),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:N,children:(0,d.jsxs)("div",{className:(k?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[k&&"typegraph"!==S?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:P,onChange:C,className:"ml-2",children:a?.map((e=>(0,d.jsxs)(f.A,{value:e.codeLanguage,children:[(0,d.jsxs)(l.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k&&"playground"!==S?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(h,{defaultTab:b,noTool:j})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(g,{}),(0,d.jsx)(c.ny,{})]})]})]})})]})}function b(e){return(0,d.jsx)(a.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(v,{...e})})}},81288:(e,n,i)=>{"use strict";i.d(n,{A:()=>a});var t=i(95649),s=(i(79474),i(13274));function a(e){let{python:n,typescript:i,...a}=e;const r=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},i&&{content:i.content,codeLanguage:"typescript",codeFileUrl:i.path}].filter((e=>!!e));return(0,s.jsx)(t.A,{code:0==r.length?void 0:r,...a})}},98735:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};n.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&n.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,n)})),e.definitions&&e.definitions.forEach((function(e){i(e,n)}))}var t={};function s(e,n){for(var i=0;i<e.definitions.length;i++){var t=e.definitions[i];if(t.name&&t.name.value==n)return t}}function a(e,n){var i={kind:e.kind,definitions:[s(e,n)]};e.hasOwnProperty("loc")&&(i.loc=e.loc);var a=t[n]||new Set,r=new Set,o=new Set;for(a.forEach((function(e){o.add(e)}));o.size>0;){var l=o;o=new Set,l.forEach((function(e){r.has(e)||(r.add(e),(t[e]||new Set).forEach((function(e){o.add(e)})))}))}return r.forEach((function(n){var t=s(e,n);t&&i.definitions.push(t)})),i}n.definitions.forEach((function(e){if(e.name){var n=new Set;i(e,n),t[e.name.value]=n}})),e.exports=n,e.exports.A=a(n,"A"),e.exports.B=a(n,"B"),e.exports.C=a(n,"C"),e.exports.D=a(n,"D")},34316:e=>{e.exports={content:"",path:"examples/typegraphs/policies.py"}},90186:e=>{e.exports={content:'await typegraph({\n  name: "policies",\n  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },\n}, (g) => {\n  const deno = new DenoRuntime();\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  const admin_only = deno.policy(\n    "admin_only",\n    "(args, { context }) => context.username ? context.username === \'admin\' : null",\n  );\n  const user_only = deno.policy(\n    "user_only",\n    "(args, { context }) => context.username ? context.username === \'user\' : null",\n  );\n\n  g.auth(Auth.basic(["admin", "user"]));\n\n  g.expose({\n    public: random.gen(t.string()).withPolicy(pub),\n    admin_only: random.gen(t.string()).withPolicy(admin_only),\n    user_only: random.gen(t.string()).withPolicy(user_only),\n    both: random.gen(t.string()).withPolicy([user_only, admin_only]),\n  });\n});',path:"examples/typegraphs/policies.ts"}}}]);