(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6557],{96811:(e,i,n)=>{"use strict";n.r(i),n.d(i,{assets:()=>c,contentTitle:()=>o,default:()=>u,frontMatter:()=>r,metadata:()=>l,toc:()=>d});var t=n(11527),s=n(63883),a=(n(86117),n(3643));const r={sidebar_position:3},o="Policies",l={id:"reference/policies/index",title:"Policies",description:"Context",source:"@site/docs/reference/policies/index.mdx",sourceDirName:"reference/policies",slug:"/reference/policies/",permalink:"/docs/reference/policies/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/policies/index.mdx",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"docs",previous:{title:"WebAssembly",permalink:"/docs/reference/runtimes/wasmedge/"},next:{title:"Ecosystem",permalink:"/docs/reference/ecosystem/"}},c={},d=[{value:"Context",id:"context",level:2},{value:"Generics policies",id:"generics-policies",level:2},{value:"Public",id:"public",level:3},{value:"Policy based access control (PBAC)",id:"policy-based-access-control-pbac",level:2}];function h(e){const i={code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",ul:"ul",...(0,s.a)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(i.h1,{id:"policies",children:"Policies"}),"\n",(0,t.jsx)(i.h2,{id:"context",children:"Context"}),"\n",(0,t.jsx)(i.h2,{id:"generics-policies",children:"Generics policies"}),"\n",(0,t.jsx)(i.h3,{id:"public",children:"Public"}),"\n","\n","\n",(0,t.jsx)(i.h1,{id:"policies-and-materializers",children:"Policies and materializers"}),"\n",(0,t.jsx)(i.p,{children:"This section also makes use of toy typegraph for the sake of clarity. You will continue the chat-based app on the next one."}),"\n",(0,t.jsx)(i.h2,{id:"policy-based-access-control-pbac",children:"Policy based access control (PBAC)"}),"\n",(0,t.jsx)(i.p,{children:"The Deno runtime enable to understand the last abstraction. Policies are a way to verify for each type whether the user is authorized or not to access it. It's a very powerful concept that can be for instance used to guarantee a given type is never accidentally exposed to the outside world."}),"\n",(0,t.jsx)(i.p,{children:"Metatype comes with some built-in policies, but you can use the Deno runtime to define your own:"}),"\n",(0,t.jsxs)(i.ul,{children:["\n",(0,t.jsxs)(i.li,{children:[(0,t.jsx)(i.code,{children:"policies.public()"})," is an alias for ",(0,t.jsx)(i.code,{children:'Policy(PureFunMat("() => true"))'})," providing everyone open access."]}),"\n",(0,t.jsxs)(i.li,{children:[(0,t.jsx)(i.code,{children:'policies.ctx("role_value", "role_field")'})," is a companion policy for the authentication strategy you learned in the previous section. It will verify the context and give adequate access to the user."]}),"\n"]}),"\n",(0,t.jsx)(i.p,{children:"Policies are hierarchical in the sense that the request starts with a denial, and the root materializers must explicitly provide an access or not. Once access granted, any further types can either inherit or override the access. Policies evaluate in order in case multiple ones are defined."}),"\n",(0,t.jsx)(a.Z,{typegraph:"policies",python:n(79835),query:n(78416)}),"\n",(0,t.jsx)(i.p,{children:"Enough studied, let's go back to your app and finalize it."})]})}function u(e={}){const{wrapper:i}={...(0,s.a)(),...e.components};return i?(0,t.jsx)(i,{...e,children:(0,t.jsx)(h,{...e})}):h(e)}},46153:(e,i,n)=>{"use strict";n.d(i,{r:()=>s});n(50959);var t=n(11527);function s(e){let{name:i,choices:n,choice:s,onChange:a,className:r}=e;return(0,t.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${r??""}`,children:Object.entries(n).map((e=>{let[n,r]=e;return(0,t.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,t.jsx)("div",{children:(0,t.jsxs)("label",{className:"cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:i,value:n,checked:n===s,onChange:()=>a(n),className:"hidden peer"}),(0,t.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:r})]})})},n)}))})}},48893:(e,i,n)=>{"use strict";n.d(i,{Z:()=>y});var t=n(50959),s=n(52691),a=n(45197),r=n(14899),o=n(86117),l=n(33961),c=n(11527);const d=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:i,variableEditor:n,headerEditor:s}=(0,l._i)({nonNull:!0}),[a,r]=(0,t.useState)(e.defaultTab),o=(0,l.Xd)({onCopyQuery:e.onCopyQuery}),h=(0,l.fE)();return(0,t.useEffect)((()=>{n&&d(n)}),[a,n]),(0,t.useEffect)((()=>{s&&d(s)}),[a,s]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("extraKeys",{"Alt-G":()=>{i.replaceSelection("@")}}),i.setOption("gutters",[]),i.on("change",d),d(i))}),[i]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",d))}),[n]),(0,t.useEffect)((()=>{s&&(s.setOption("lineNumbers",!1),s.setOption("gutters",[]),s.on("change",d))}),[s]),(0,c.jsx)(l.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(l.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(l._8,{}),(0,c.jsx)(l.wC,{onClick:()=>h(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(l.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(l.wC,{onClick:()=>o(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(l.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("variables"===a?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{r("headers"===a?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers",children:[(0,c.jsx)(l.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(l.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,i){this.map.has(e)||(this.length+=1),this.map.set(e,i)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=n(46153);function m(){return(0,l.JB)({nonNull:!0}).isFetching?(0,c.jsx)(l.$j,{}):null}const f={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:i,query:n,code:a,codeLanguage:d,codeFileUrl:x,headers:y={},variables:v={},tab:g="",noTool:b=!1,defaultMode:j=null}=e;const{siteConfig:{customFields:{tgUrl:k}}}=(0,r.Z)(),N=(0,t.useMemo)((()=>new u),[]),w=(0,t.useMemo)((()=>(0,s.nq)({url:`${k}/${i}`})),[]),[q,C]=(0,t.useState)(j);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[j?(0,c.jsx)(p.r,{name:"mode",choices:f,choice:q,onChange:C,className:"mb-2"}):null,(0,c.jsx)(l.j$,{fetcher:w,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(y),shouldPersistHeaders:!0,variables:JSON.stringify(v),storage:N,children:(0,c.jsxs)("div",{className:(j?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[j&&"typegraph"!==q?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[x?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)("a",{href:`https://github.com/metatypedev/metatype/blob/main/${x}`,children:x})]}):null,a?(0,c.jsx)(o.Z,{language:d,wrap:!0,className:"flex-1",children:a}):null]}),j&&"playground"!==q?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(h,{defaultTab:g,noTool:b})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(m,{}),(0,c.jsx)(l.iB,{})]})]})]})})]})}function y(e){return(0,c.jsx)(a.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(x,{...e})})}},3643:(e,i,n)=>{"use strict";n.d(i,{Z:()=>a});var t=n(48893),s=(n(50959),n(11527));function a(e){let{python:i,...n}=e;return(0,s.jsx)(t.Z,{code:i.content,codeLanguage:"python",codeFileUrl:i.path,...n})}},78416:e=>{var i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"public"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"admin_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user_only"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"both"},arguments:[],directives:[]}]}}],loc:{start:0,end:92}};i.loc.source={body:"query A {\n  public\n}\n\nquery B {\n  admin_only\n}\n\nquery C {\n  user_only\n}\n\nquery D {\n  both\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,i){if("FragmentSpread"===e.kind)i.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&i.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,i)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,i)})),e.definitions&&e.definitions.forEach((function(e){n(e,i)}))}var t={};function s(e,i){for(var n=0;n<e.definitions.length;n++){var t=e.definitions[n];if(t.name&&t.name.value==i)return t}}function a(e,i){var n={kind:e.kind,definitions:[s(e,i)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var a=t[i]||new Set,r=new Set,o=new Set;for(a.forEach((function(e){o.add(e)}));o.size>0;){var l=o;o=new Set,l.forEach((function(e){r.has(e)||(r.add(e),(t[e]||new Set).forEach((function(e){o.add(e)})))}))}return r.forEach((function(i){var t=s(e,i);t&&n.definitions.push(t)})),n}i.definitions.forEach((function(e){if(e.name){var i=new Set;n(e,i),t[e.name.value]=i}})),e.exports=i,e.exports.A=a(i,"A"),e.exports.B=a(i,"B"),e.exports.C=a(i,"C"),e.exports.D=a(i,"D")},79835:e=>{e.exports={content:"",path:"website/docs/reference/policies/policies.py"}}}]);