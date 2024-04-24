(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2829],{19739:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>d,RM:()=>c});var i=t(13274),s=t(99128),r=t(81288),a=t(53279),o=t(56978);const c=[];function l(e){const n={a:"a",code:"code",p:"p",pre:"pre",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)(n.p,{children:["Cross-Origin Resource Sharing (CORS) is a mechanism that allows or denies cross-origin requests in the browser.\nIt prevents websites that you've not explicitly allowed from using your API.\nNote that it doesn't protect non-browser clients like server side code or a mobile app from using your typegraphs, only browsers implements the CORS mechanism.\nMore details can be found ",(0,i.jsx)(n.a,{href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS",children:"here"}),"."]}),"\n",(0,i.jsxs)(a.A,{children:[(0,i.jsx)(o.A,{value:"typescript",children:(0,i.jsx)(r.A,{typegraph:"cors",typescript:t(30801),query:t(573)})}),(0,i.jsx)(o.A,{value:"python",children:(0,i.jsx)(r.A,{typegraph:"cors",python:t(77743),query:t(573)})})]}),"\n",(0,i.jsx)(n.p,{children:"If your browser support well CORS, you should the following error if you try to run the interactive demo."}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-json",children:'{\n  "errors": [\n    {\n      "message": "NetworkError when attempting to fetch resource.",\n      "stack": ""\n    }\n  ]\n}\n'})}),"\n",(0,i.jsx)(n.p,{children:"Look in the network tab of your browser inspect tools to see the error proper."}),"\n",(0,i.jsx)(n.p,{children:"By the way, there is a hidden cors header in all interactive demos you have met so far:"}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'# ..\nCors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n# .. \n'})})]})}function d(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}},20931:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>h,contentTitle:()=>l,default:()=>m,frontMatter:()=>c,metadata:()=>d,toc:()=>u});var i=t(13274),s=t(99128),r=t(81288),a=(t(19739),t(53279)),o=t(56978);const c={sidebar_position:50},l="Secure your requests",d={id:"guides/securing-requests/index",title:"Secure your requests",description:"Authentication",source:"@site/docs/guides/securing-requests/index.mdx",sourceDirName:"guides/securing-requests",slug:"/guides/securing-requests/",permalink:"/docs/guides/securing-requests/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/guides/securing-requests/index.mdx",tags:[],version:"current",sidebarPosition:50,frontMatter:{sidebar_position:50},sidebar:"docs",previous:{title:"Write REST endpoints",permalink:"/docs/guides/rest/"},next:{title:"Self-host the Typegate",permalink:"/docs/guides/self-hosting"}},h={},u=[{value:"Authentication",id:"authentication",level:2},{value:"Policies",id:"policies",level:2}];function p(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,s.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"secure-your-requests",children:"Secure your requests"}),"\n",(0,i.jsx)(n.h2,{id:"authentication",children:"Authentication"}),"\n",(0,i.jsx)(n.p,{children:"Typegraphs supports multiple auth schemes for incoming requests including:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsx)(n.li,{children:(0,i.jsx)(n.a,{href:"/docs/reference/typegate/authentication#basic-authentication",children:"Basic access"})}),"\n",(0,i.jsx)(n.li,{children:(0,i.jsx)(n.a,{href:"/docs/reference/typegate/authentication#jwt-authentication",children:"JSON Web Tokens (JWT)"})}),"\n",(0,i.jsx)(n.li,{children:(0,i.jsx)(n.a,{href:"/docs/reference/typegate/authentication#oauth2-authorization",children:"OAuth2"})}),"\n"]}),"\n",(0,i.jsxs)(n.p,{children:["Each scheme relies on tokens that will be expected on the ",(0,i.jsx)(n.code,{children:"Authorization"})," header of any incoming request.\nInformation extracted from any found tokens will then be added to the context of every request.\nEach scheme allows for different secrets to be encoded in the tokens, secrets like user identification and access tokens.\nYou can then use ",(0,i.jsx)(n.a,{href:"/docs/reference/policies",children:"policies"})," to examine the context and determine if a request is allowed access to parts of your typegraph.\nYou can also ",(0,i.jsx)(n.a,{href:"/docs/reference/types/injections",children:"inject"})," data from the context, to set materalizer inputs for example, using ",(0,i.jsx)(n.code,{children:"from_context"}),"."]}),"\n",(0,i.jsxs)(n.p,{children:["The following example uses basic authentication in order to only allow access for admin users.\nBasic authentication relies on a username and password pair.\nWe specify the password through typegraph secrets with the format ",(0,i.jsx)(n.code,{children:"BASIC_{username}"}),".\nIn this case, the secret ",(0,i.jsx)(n.code,{children:"BASIC_andim=password"})," is set."]}),"\n",(0,i.jsxs)(a.A,{children:[(0,i.jsx)(o.A,{value:"typescript",children:(0,i.jsx)(r.A,{typegraph:"authentication",typescript:t(22748),query:t(68228),headers:{Authorization:"Basic YW5kaW06cGFzc3dvcmQ="},tab:"headers"})}),(0,i.jsx)(o.A,{value:"python",children:(0,i.jsx)(r.A,{typegraph:"authentication",python:t(83530),query:t(68228),headers:{Authorization:"Basic YW5kaW06cGFzc3dvcmQ="},tab:"headers"})})]}),"\n",(0,i.jsxs)(n.p,{children:["Note, the token is encoded in base64.\nDecoded, it'd read ",(0,i.jsx)(n.code,{children:"andim:password"}),"."]}),"\n",(0,i.jsxs)(n.p,{children:["If you were to try to send a request without the header, you'd notice that ",(0,i.jsx)(n.code,{children:"get_full_context"})," still returns a result.\nAn empty object.\nAuthentication is only responsible for populating the context object and without a policy to shoot down the request, it'll access the materalizers."]}),"\n",(0,i.jsxs)(n.p,{children:["On the other hand, ",(0,i.jsx)(n.code,{children:"get_context"})," returns an empty object when no header is found. ",(0,i.jsx)(n.code,{children:"from_context"})," acts as guard preventing the materalizer from being accessed unless the named data is found in the context."]}),"\n",(0,i.jsxs)(n.p,{children:["More details about authentication can be found ",(0,i.jsx)(n.a,{href:"/docs/reference/typegate/authentication",children:"here"}),"."]}),"\n","\n",(0,i.jsx)(n.h2,{id:"policies",children:"Policies"}),"\n",(0,i.jsxs)(n.p,{children:["The primary authorization paradigm used in typegraphs is ",(0,i.jsx)(n.a,{href:"/docs/reference/policies#policy-based-access-control-pbac",children:"policy based access control"}),".\nPolicies are small pieces of logic that evaluate a request and determine weather access is allowed or not.\nThey're attached to materalizers and are evaluated whenever a request tries to access the materalizer."]}),"\n",(0,i.jsxs)(n.p,{children:["Concretely, policies are implemented using ",(0,i.jsx)(n.a,{href:"/docs/guides/external-functions",children:"custom function"}),".\nThese functions take the request's context object as input and return an optional bool.\nTypescript functions running on ",(0,i.jsx)(n.code,{children:"DenoRuntime"})," is the recommended way for writing policies today and the following example demonstrates how."]}),"\n",(0,i.jsx)(n.p,{children:"Before anything, the following secrets are required to enable the basic authentication scheme."}),"\n",(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-yaml",children:'typegates:\n  dev:\n    # ..\n    secrets:\n      policies:\n        BASIC_admin: "admin_pass"\n        BASIC_user: "user_pass"\n'})}),"\n",(0,i.jsxs)(a.A,{children:[(0,i.jsx)(o.A,{value:"typescript",children:(0,i.jsx)(r.A,{typegraph:"policies",python:t(90186),query:t(63022),headers:{Authorization:"Basic YWRtaW46YWRtaW5fcGFzcw=="},tab:"headers"})}),(0,i.jsx)(o.A,{value:"python",children:(0,i.jsx)(r.A,{typegraph:"policies",python:t(34316),query:t(63022),headers:{Authorization:"Basic YWRtaW46YWRtaW5fcGFzcw=="},tab:"headers"})})]}),"\n",(0,i.jsx)(n.p,{children:"More than one policies can be attached to a single materalizer and combining policies allow for compositionaly defining our access control rules.\nIf a materalizer has more one policies, they are evaluated in turn and:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:["If any one of attached policy returns ",(0,i.jsx)(n.code,{children:"true"}),", the request immediately gains access."]}),"\n",(0,i.jsxs)(n.li,{children:["If a policy returns ",(0,i.jsx)(n.code,{children:"false"}),", the request is immediately denied access."]}),"\n",(0,i.jsx)(n.li,{children:"If the policy means to defer decision to other attached policies, it can return null instead."}),"\n",(0,i.jsxs)(n.li,{children:["If all attached policies return ",(0,i.jsx)(n.code,{children:"null"}),", the request is denied access."]}),"\n"]}),"\n",(0,i.jsxs)(n.p,{children:["There are helper functions on the ",(0,i.jsx)(n.code,{children:"Policy"})," object that allow easy construction of common policy patterns."]}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"Policy.public"}),": allow any request."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"Policy.internal"}),": allow requests originating from within typegraph like custom functions."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"Policy.on"}),": use different policies depending on request effect. Useful for policy shared across many materalizers."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"Policy.context"}),": generate a policy using a simple pattern matching on context object fields."]}),"\n"]})]})}function m(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(p,{...e})}):p(e)}},95649:(e,n,t)=>{"use strict";t.d(n,{A:()=>v});var i=t(79474),s=t(355),r=t(70792),a=t(96116),o=t(31604),c=t(12956),l=t(17537),d=t(13274);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:n,variableEditor:t,headerEditor:s}=(0,l.mi)({nonNull:!0}),[r,a]=(0,i.useState)(e.defaultTab),o=(0,l.xb)({onCopyQuery:e.onCopyQuery}),c=(0,l.Ln)();return(0,i.useEffect)((()=>{t&&h(t)}),[r,t]),(0,i.useEffect)((()=>{s&&h(s)}),[r,s]),(0,i.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",h),h(n))}),[n]),(0,i.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("gutters",[]),t.on("change",h))}),[t]),(0,i.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",h))}),[s]),(0,d.jsx)(l.m_.Provider,{children:(0,d.jsxs)("div",{className:"graphiql-editors",children:[(0,d.jsx)("section",{className:"graphiql-query-editor ","aria-label":"Query Editor",children:(0,d.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,d.jsx)(l.wY,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,d.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,d.jsx)(l.cl,{}),(0,d.jsx)(l.IB,{onClick:()=>c(),label:"Prettify query (Shift-Ctrl-P)",children:(0,d.jsx)(l.RG,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,d.jsx)(l.IB,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,d.jsx)(l.Td,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,d.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,d.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("variables"===r?"":"variables")},children:"Variables"}),(0,d.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{a("headers"===r?"":"headers")},children:"Headers"})]})}),(0,d.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,d.jsx)(l.G0,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,d.jsx)(l.B4,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class p{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=t(50910),f=t(88244),y=t(56978);function g(){return(0,l.Vm)({nonNull:!0}).isFetching?(0,d.jsx)(l.y$,{}):null}const x={typegraph:"Typegraph",playground:"Playground"};function j(e){let{typegraph:n,query:t,code:r,headers:h={},variables:j={},panel:v="",noTool:b=!1,defaultMode:w=null,disablePlayground:k=!1}=e;const{siteConfig:{customFields:{tgUrl:q}}}=(0,a.A)(),S=(0,i.useMemo)((()=>new p),[]),_=(0,i.useMemo)((()=>(0,s.a5)({url:`${q}/${n}`})),[]),[N,A]=(0,i.useState)(w),[C,E]=(0,f.e)();return(0,d.jsxs)("div",{className:"@container miniql mb-4",children:[w?(0,d.jsx)(m.m,{choices:x,choice:N,onChange:A}):null,(0,d.jsx)(l.ql,{fetcher:_,defaultQuery:t.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(j),storage:S,children:(0,d.jsxs)("div",{className:(w?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[w&&"typegraph"!==N?null:(0,d.jsx)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0 relative",children:(0,d.jsx)(m.m,{choices:{typescript:"Typescript",python:"Python"},choice:C,onChange:E,className:"ml-2",children:r?.map((e=>(0,d.jsxs)(y.A,{value:e.codeLanguage,children:[(0,d.jsxs)(c.A,{href:`https://github.com/metatypedev/metatype/blob/main/${e?.codeFileUrl}`,className:"absolute top-0 right-0 m-2 p-1",children:[e?.codeFileUrl?.split("/").pop()," \u2197"]}),(0,d.jsx)(o.A,{language:e?.codeLanguage,wrap:!0,className:"flex-1",children:e.content})]},e.codeLanguage)))})}),k||w&&"playground"!==N?null:(0,d.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,d.jsx)("div",{className:"flex-1 graphiql-session",children:(0,d.jsx)(u,{defaultTab:v,noTool:b})}),(0,d.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,d.jsx)(g,{}),(0,d.jsx)(l.ny,{})]})]})]})})]})}function v(e){return(0,d.jsx)(r.A,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:()=>(0,d.jsx)(j,{...e})})}},53279:(e,n,t)=>{"use strict";t.d(n,{A:()=>a});t(79474);var i=t(88244),s=t(50910),r=t(13274);function a(e){let{children:n}=e;const[t,a]=(0,i.e)();return(0,r.jsx)(s.m,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}},81288:(e,n,t)=>{"use strict";t.d(n,{A:()=>r});var i=t(95649),s=(t(79474),t(13274));function r(e){let{python:n,typescript:t,...r}=e;const a=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},t&&{content:t.content,codeLanguage:"typescript",codeFileUrl:t.path}].filter((e=>!!e));return(0,s.jsx)(i.A,{code:0==a.length?void 0:a,...r})}},68228:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"get_full_context"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"get_context"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"username"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"prize"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:72}};n.loc.source={body:"query {\n  get_full_context\n  get_context {\n    username\n    prize\n  }\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},63022:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};n.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};function s(e,n){for(var t=0;t<e.definitions.length;t++){var i=e.definitions[t];if(i.name&&i.name.value==n)return i}}function r(e,n){var t={kind:e.kind,definitions:[s(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var r=i[n]||new Set,a=new Set,o=new Set;for(r.forEach((function(e){o.add(e)}));o.size>0;){var c=o;o=new Set,c.forEach((function(e){a.has(e)||(a.add(e),(i[e]||new Set).forEach((function(e){o.add(e)})))}))}return a.forEach((function(n){var i=s(e,n);i&&t.definitions.push(i)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n,e.exports.A=r(n,"A"),e.exports.B=r(n,"B"),e.exports.C=r(n,"C"),e.exports.D=r(n,"D")},573:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};n.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n},83530:e=>{e.exports={content:"",path:"examples/typegraphs/authentication.py"}},22748:e=>{e.exports={content:'const deno = new DenoRuntime();\n\nconst ctx = t.struct({\n  "username": t.string().optional(),\n});\n\n// highlight-start\n// expects a secret in metatype.yml\n// `BASIC_[username]`\n// highlight-next-line\ng.auth(Auth.basic(["andim"]));\n// highlight-end\n\ng.expose({\n  get_context: deno.identity(ctx).apply({\n    username: g.fromContext("username"),\n  }),\n  get_full_context: deno.func(\n    t.struct({}),\n    t.string(),\n    {\n      code: "(_: any, ctx: any) => Deno.inspect(ctx.context)",\n    },\n  ),\n}, Policy.public());',path:"examples/typegraphs/authentication.ts"}},77743:e=>{e.exports={content:'@typegraph(\n  # highlight-start\n  cors=Cors(\n    allow_origin=["https://not-this.domain"],\n    allow_headers=["x-custom-header"],\n    expose_headers=["header-1"],\n    allow_credentials=True,\n    max_age_sec=60,\n  ),\n  # highlight-end\n)\ndef cors(g: Graph):\n  random = RandomRuntime(seed=0, reset=None)\n\n  g.expose(\n    Policy.public(),\n    catch_me_if_you_can=random.gen(t.string()),\n  )',path:"examples/typegraphs/cors.py"}},30801:e=>{e.exports={content:'await typegraph({\n  name: "cors",\n  // highlight-start\n  cors: {\n    allowOrigin: ["https://not-this.domain"],\n    allowHeaders: ["x-custom-header"],\n    exposeHeaders: ["header-1"],\n    allowCredentials: true,\n    maxAgeSec: 60,\n  },\n  // highlight-end\n}, (g) => {\n  const random = new RandomRuntime({ seed: 0 });\n\n  g.expose({\n    catch_me_if_you_can: random.gen(t.string()),\n  }, Policy.public());\n});',path:"examples/typegraphs/cors.ts"}},34316:e=>{e.exports={content:"",path:"examples/typegraphs/policies.py"}},90186:e=>{e.exports={content:'const deno = new DenoRuntime();\nconst random = new RandomRuntime({ seed: 0 });\n// `public` is sugar for `(_args, _ctx) => true`\nconst pub = Policy.public();\n\nconst admin_only = deno.policy(\n  "admin_only",\n  // note: policies either return true | false | null\n  "(args, { context }) => context.username ? context.username === \'admin\' : null",\n);\nconst user_only = deno.policy(\n  "user_only",\n  "(args, { context }) => context.username ? context.username === \'user\' : null",\n);\n\ng.auth(Auth.basic(["admin", "user"]));\n\ng.expose({\n  public: random.gen(t.string()).withPolicy(pub),\n  admin_only: random.gen(t.string()).withPolicy(admin_only),\n  user_only: random.gen(t.string()).withPolicy(user_only),\n  // if both attached policies return null, access is denied\n  both: random.gen(t.string()).withPolicy([user_only, admin_only]),\n  // set default policy for materializers\n}, pub);',path:"examples/typegraphs/policies.ts"}}}]);