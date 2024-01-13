(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8119],{1182:(e,n,i)=>{"use strict";i.r(n),i.d(n,{assets:()=>d,contentTitle:()=>l,default:()=>u,frontMatter:()=>s,metadata:()=>o,toc:()=>c});var t=i(11527),a=i(67541),r=i(83060);const s={},l="GraphQL",o={id:"reference/runtimes/graphql/index",title:"GraphQL",description:"GraphQL runtime",source:"@site/docs/reference/runtimes/graphql/index.mdx",sourceDirName:"reference/runtimes/graphql",slug:"/reference/runtimes/graphql/",permalink:"/docs/reference/runtimes/graphql/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/graphql/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Deno/typescript",permalink:"/docs/reference/runtimes/deno/"},next:{title:"HTTP/REST",permalink:"/docs/reference/runtimes/http/"}},d={},c=[{value:"GraphQL runtime",id:"graphql-runtime",level:2}];function h(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",li:"li",ol:"ol",p:"p",ul:"ul",...(0,a.a)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"graphql",children:"GraphQL"}),"\n",(0,t.jsx)(n.h2,{id:"graphql-runtime",children:"GraphQL runtime"}),"\n",(0,t.jsxs)(n.p,{children:["You currently have a single model to describe messages sent in the chat-based app. A reasonable next step is to add a user model and make a link between the two. While you can store users in the same database, it's wiser to avoid data duplication and re-use your service for user management available at ",(0,t.jsx)(n.a,{href:"https://graphqlzero.almansi.me",children:"GraphQLZero"})," endpoint. Let's introduce the GraphQL runtime that allows remote GraphQL queries."]}),"\n",(0,t.jsxs)(n.p,{children:["Update ",(0,t.jsx)(n.code,{children:"typegraph.py"})," with the highlighted lines below:"]}),"\n",(0,t.jsx)(r.Z,{typegraph:"graphql",python:i(91778),query:i(81222)}),"\n",(0,t.jsx)(n.p,{children:"Again, a few interesting happened here:"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsxs)(n.li,{children:["No migration has been run. The field ",(0,t.jsx)(n.code,{children:"user"})," comes from another runtime and doesn't exist in the database. The typegate will orchestrate the query execution in all runtimes and minimize the work done."]}),"\n",(0,t.jsxs)(n.li,{children:["The ",(0,t.jsx)(n.code,{children:"from_parent"})," rule automatically fills the input type with the parent field named ",(0,t.jsx)(n.code,{children:"uid"}),". The ",(0,t.jsx)(n.code,{children:"g(\xb7)"})," rule allows making named reference to another type and avoid circular reference."]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Other type enforcement rules also exists:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"from_secret(key)"})," to fill the input type with the secret in the ",(0,t.jsx)(n.code,{children:"TG_[typegraph name]_[key]"})," format"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"from_context(\xb7)"})," to fill the input type with content from the request context, such as JSON Web Token (JWT), etc."]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"set(x)"})," to fill the input type with content ",(0,t.jsx)(n.code,{children:"x"})]}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"You should now start to see the power provided by Metatype and might wonder how to integrate it step by step with your existing systems. Writing all those types by hand is tedious and error-prone. The next section will show you how to generate types from existing sources."})]})}function u(e={}){const{wrapper:n}={...(0,a.a)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(h,{...e})}):h(e)}},39805:(e,n,i)=>{"use strict";i.d(n,{r:()=>a});i(50959);var t=i(11527);function a(e){let{name:n,choices:i,choice:a,onChange:r,className:s}=e;return(0,t.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${s??""}`,children:Object.entries(i).map((e=>{let[i,s]=e;return(0,t.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,t.jsx)("div",{children:(0,t.jsxs)("label",{className:"cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:n,value:i,checked:i===a,onChange:()=>r(i),className:"hidden peer"}),(0,t.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:s})]})})},i)}))})}},814:(e,n,i)=>{"use strict";i.d(n,{Z:()=>v});var t=i(50959),a=i(73327),r=i(49790),s=i(56096),l=i(40067),o=i(25920),d=i(54314),c=i(11527);const h=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function u(e){const{queryEditor:n,variableEditor:i,headerEditor:a}=(0,d._i)({nonNull:!0}),[r,s]=(0,t.useState)(e.defaultTab),l=(0,d.Xd)({onCopyQuery:e.onCopyQuery}),o=(0,d.fE)();return(0,t.useEffect)((()=>{i&&h(i)}),[r,i]),(0,t.useEffect)((()=>{a&&h(a)}),[r,a]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("extraKeys",{"Alt-G":()=>{n.replaceSelection("@")}}),n.setOption("gutters",[]),n.on("change",h),h(n))}),[n]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",h))}),[i]),(0,t.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",h))}),[a]),(0,c.jsx)(d.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(d.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(d._8,{}),(0,c.jsx)(d.wC,{onClick:()=>o(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(d.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(d.wC,{onClick:()=>l(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(d.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("variables"===r?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{s("headers"===r?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,c.jsx)(d.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(d.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class m{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,n){this.map.has(e)||(this.length+=1),this.map.set(e,n)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var p=i(39805);function f(){return(0,d.JB)({nonNull:!0}).isFetching?(0,c.jsx)(d.$j,{}):null}const g={typegraph:"Typegraph",playground:"Playground"};function x(e){let{typegraph:n,query:i,code:r,codeLanguage:h,codeFileUrl:x,headers:v={},variables:y={},tab:k="",noTool:j=!1,defaultMode:b=null}=e;const{siteConfig:{customFields:{tgUrl:N}}}=(0,s.Z)(),w=(0,t.useMemo)((()=>new m),[]),S=(0,t.useMemo)((()=>(0,a.nq)({url:`${N}/${n}`})),[]),[q,E]=(0,t.useState)(b);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[b?(0,c.jsx)(p.r,{name:"mode",choices:g,choice:q,onChange:E,className:"mb-2"}):null,(0,c.jsx)(d.j$,{fetcher:S,defaultQuery:i.loc?.source.body.trim(),defaultHeaders:JSON.stringify(v),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:w,children:(0,c.jsxs)("div",{className:(b?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[b&&"typegraph"!==q?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[x?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)(o.Z,{href:`https://github.com/metatypedev/metatype/blob/main/${x}`,children:x})]}):null,r?(0,c.jsx)(l.Z,{language:h,wrap:!0,className:"flex-1",children:r}):null]}),b&&"playground"!==q?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(u,{defaultTab:k,noTool:j})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(f,{}),(0,c.jsx)(d.iB,{})]})]})]})})]})}function v(e){return(0,c.jsx)(r.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(x,{...e})})}},83060:(e,n,i)=>{"use strict";i.d(n,{Z:()=>r});var t=i(814),a=(i(50959),i(11527));function r(e){let{python:n,...i}=e;return(0,a.jsx)(t.Z,{code:n.content,codeLanguage:"python",codeFileUrl:n.path,...i})}},81222:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"users"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_message"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"title"},value:{kind:"StringValue",value:"Hey",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"user_id"},value:{kind:"StringValue",value:"1",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"messages"},arguments:[{kind:"Argument",name:{kind:"Name",value:"take"},value:{kind:"IntValue",value:"2"}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:224}};n.loc.source={body:'query A {\n  users {\n    data {\n      id\n      name\n    }\n  }\n}\n\nmutation B {\n  create_message(data: { title: "Hey", user_id: "1" }) {\n    id\n  }\n}\n\nquery C {\n  messages(take: 2) {\n    title\n    user {\n      name\n    }\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&n.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,n)})),e.definitions&&e.definitions.forEach((function(e){i(e,n)}))}var t={};function a(e,n){for(var i=0;i<e.definitions.length;i++){var t=e.definitions[i];if(t.name&&t.name.value==n)return t}}function r(e,n){var i={kind:e.kind,definitions:[a(e,n)]};e.hasOwnProperty("loc")&&(i.loc=e.loc);var r=t[n]||new Set,s=new Set,l=new Set;for(r.forEach((function(e){l.add(e)}));l.size>0;){var o=l;l=new Set,o.forEach((function(e){s.has(e)||(s.add(e),(t[e]||new Set).forEach((function(e){l.add(e)})))}))}return s.forEach((function(n){var t=a(e,n);t&&i.definitions.push(t)})),i}n.definitions.forEach((function(e){if(e.name){var n=new Set;i(e,n),t[e.name.value]=n}})),e.exports=n,e.exports.A=r(n,"A"),e.exports.B=r(n,"B"),e.exports.C=r(n,"C")},91778:e=>{e.exports={content:"",path:"website/docs/reference/runtimes/graphql/graphql.py"}}}]);