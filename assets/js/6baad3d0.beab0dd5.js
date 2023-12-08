(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7204],{34694:(e,i,a)=>{"use strict";a.r(i),a.d(i,{assets:()=>C,contentTitle:()=>d,default:()=>o,frontMatter:()=>n,metadata:()=>s,toc:()=>l});var I=a(11527),g=a(63883),t=a(3643);const n={},d="Instant APIs on your database",s={id:"automatic-crud-validation/index",title:"Instant APIs on your database",description:"CRUD stands for Create, Read, Update, and Delete, which are the four basic functions of persistent storage in a software application. Those operations are commonly used in combination with data validation to ensure that the stored data is correct and consistent.",source:"@site/use-cases/automatic-crud-validation/index.mdx",sourceDirName:"automatic-crud-validation",slug:"/automatic-crud-validation/",permalink:"/use-cases/automatic-crud-validation/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/automatic-crud-validation/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",next:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"}},C={},l=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function A(e){const i={a:"a",code:"code",h1:"h1",h2:"h2",img:"img",p:"p",...(0,g.a)(),...e.components};return(0,I.jsxs)(I.Fragment,{children:[(0,I.jsx)(i.h1,{id:"instant-apis-on-your-database",children:"Instant APIs on your database"}),"\n",(0,I.jsx)(i.p,{children:"CRUD stands for Create, Read, Update, and Delete, which are the four basic functions of persistent storage in a software application. Those operations are commonly used in combination with data validation to ensure that the stored data is correct and consistent."}),"\n",(0,I.jsx)(i.h2,{id:"case-study",children:"Case study"}),"\n",(0,I.jsx)("div",{className:"text-center md:float-right p-8",children:(0,I.jsx)(i.p,{children:(0,I.jsx)(i.img,{src:a(60172).Z+"",width:"121",height:"321"})})}),"\n",(0,I.jsx)(i.p,{children:"Let's say you are developing a web application for a retail store that allows customers to place orders online. In this scenario, you would need to use CRUD operations to create, read, update, and delete data related to orders, customers, products, and inventory."}),"\n",(0,I.jsx)(i.p,{children:"You would have to model each of these entities as a data type, define the operations that can be performed on them and write the code to ensure the correctness of the data processed in the operations."}),"\n",(0,I.jsxs)(i.p,{children:["For example, you would need to define a ",(0,I.jsx)(i.code,{children:"Customer"})," type with the following fields: ",(0,I.jsx)(i.code,{children:"id"}),", ",(0,I.jsx)(i.code,{children:"name"}),", ",(0,I.jsx)(i.code,{children:"email"}),", and ",(0,I.jsx)(i.code,{children:"address"}),". You would also need to define the operations that can be performed on the ",(0,I.jsx)(i.code,{children:"Customer"})," type, such as ",(0,I.jsx)(i.code,{children:"createCustomer"}),", ",(0,I.jsx)(i.code,{children:"updateCustomer"}),", and ",(0,I.jsx)(i.code,{children:"deleteCustomer"}),". You would also need to write the code to validate the data in the ",(0,I.jsx)(i.code,{children:"createCustomer"})," operation to ensure that the customer's email address is valid and that the customer's address is not empty. Same for the other fields."]}),"\n",(0,I.jsx)(i.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,I.jsxs)(i.p,{children:["Metatype simplifies the development of CRUD APIs by providing the ",(0,I.jsx)(i.a,{href:"/docs/reference/runtimes/prisma",children:"Prisma runtime"})," that automates the creation of the API for CRUD operations and corresponding data validation in PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB. It can even validate some advanced types like email which may not be supported by downstream system (databases often store email address into plain string instead of a specialized field). This makes it faster for developers to create scalable CRUD APIs and enable them to focus their expertise where it matters most like checkout or the search capabilities."]}),"\n",(0,I.jsx)(t.Z,{typegraph:"prisma-runtime",python:a(18975),query:a(5487)})]})}function o(e={}){const{wrapper:i}={...(0,g.a)(),...e.components};return i?(0,I.jsx)(i,{...e,children:(0,I.jsx)(A,{...e})}):A(e)}},46153:(e,i,a)=>{"use strict";a.d(i,{r:()=>g});a(50959);var I=a(11527);function g(e){let{name:i,choices:a,choice:g,onChange:t,className:n}=e;return(0,I.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${n??""}`,children:Object.entries(a).map((e=>{let[a,n]=e;return(0,I.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,I.jsx)("div",{children:(0,I.jsxs)("label",{className:"cursor-pointer",children:[(0,I.jsx)("input",{type:"radio",name:i,value:a,checked:a===g,onChange:()=>t(a),className:"hidden peer"}),(0,I.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:n})]})})},a)}))})}},48893:(e,i,a)=>{"use strict";a.d(i,{Z:()=>h});var I=a(50959),g=a(52691),t=a(45197),n=a(14899),d=a(86117),s=a(33961),C=a(11527);const l=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function A(e){const{queryEditor:i,variableEditor:a,headerEditor:g}=(0,s._i)({nonNull:!0}),[t,n]=(0,I.useState)(e.defaultTab),d=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),A=(0,s.fE)();return(0,I.useEffect)((()=>{a&&l(a)}),[t,a]),(0,I.useEffect)((()=>{g&&l(g)}),[t,g]),(0,I.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("extraKeys",{"Alt-G":()=>{i.replaceSelection("@")}}),i.setOption("gutters",[]),i.on("change",l),l(i))}),[i]),(0,I.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",l))}),[a]),(0,I.useEffect)((()=>{g&&(g.setOption("lineNumbers",!1),g.setOption("gutters",[]),g.on("change",l))}),[g]),(0,C.jsx)(s.u.Provider,{children:(0,C.jsxs)("div",{className:"graphiql-editors",children:[(0,C.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,C.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,C.jsx)(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,C.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,C.jsx)(s._8,{}),(0,C.jsx)(s.wC,{onClick:()=>A(),label:"Prettify query (Shift-Ctrl-P)",children:(0,C.jsx)(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,C.jsx)(s.wC,{onClick:()=>d(),label:"Copy query (Shift-Ctrl-C)",children:(0,C.jsx)(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,C.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,C.jsx)("div",{className:("variables"===t?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{n("variables"===t?"":"variables")},children:"Variables"}),(0,C.jsx)("div",{className:("headers"===t?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{n("headers"===t?"":"headers")},children:"Headers"})]})}),(0,C.jsxs)("section",{className:"graphiql-editor-tool "+(t&&t.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===t?"Variables":"Headers",children:[(0,C.jsx)(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==t,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,C.jsx)(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==t,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class o{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,i){this.map.has(e)||(this.length+=1),this.map.set(e,i)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var r=a(46153);function c(){return(0,s.JB)({nonNull:!0}).isFetching?(0,C.jsx)(s.$j,{}):null}const m={typegraph:"Typegraph",playground:"Playground"};function u(e){let{typegraph:i,query:a,code:t,codeLanguage:l,codeFileUrl:u,headers:h={},variables:p={},tab:b="",noTool:Z=!1,defaultMode:y=null}=e;const{siteConfig:{customFields:{tgUrl:v}}}=(0,n.Z)(),x=(0,I.useMemo)((()=>new o),[]),M=(0,I.useMemo)((()=>(0,g.nq)({url:`${v}/${i}`})),[]),[j,N]=(0,I.useState)(y);return(0,C.jsxs)("div",{className:"@container miniql mb-5",children:[y?(0,C.jsx)(r.r,{name:"mode",choices:m,choice:j,onChange:N,className:"mb-2"}):null,(0,C.jsx)(s.j$,{fetcher:M,defaultQuery:a.loc?.source.body.trim(),defaultHeaders:JSON.stringify(h),shouldPersistHeaders:!0,variables:JSON.stringify(p),storage:x,children:(0,C.jsxs)("div",{className:(y?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[y&&"typegraph"!==j?null:(0,C.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[u?(0,C.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,C.jsx)("a",{href:`https://github.com/metatypedev/metatype/blob/main/${u}`,children:u})]}):null,t?(0,C.jsx)(d.Z,{language:l,wrap:!0,className:"flex-1",children:t}):null]}),y&&"playground"!==j?null:(0,C.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,C.jsx)("div",{className:"flex-1 graphiql-session",children:(0,C.jsx)(A,{defaultTab:b,noTool:Z})}),(0,C.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,C.jsx)(c,{}),(0,C.jsx)(s.iB,{})]})]})]})})]})}function h(e){return(0,C.jsx)(t.Z,{fallback:(0,C.jsx)("div",{children:"Loading..."}),children:()=>(0,C.jsx)(u,{...e})})}},3643:(e,i,a)=>{"use strict";a.d(i,{Z:()=>t});var I=a(48893),g=(a(50959),a(11527));function t(e){let{python:i,...a}=e;return(0,g.jsx)(I.Z,{code:i.content,codeLanguage:"python",codeFileUrl:i.path,...a})}},5487:e=>{var i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"create"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"john@doe.com",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"read"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"read_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"where"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"find_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"term"},value:{kind:"StringValue",value:"%doe%",block:!1}},{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"StringValue",value:"",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"firstname"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:286}};i.loc.source={body:'mutation create {\n  create_user(\n    data: {\n      firstname: "" # fill me\n      email: "john@doe.com"\n    }\n  ) {\n    id\n  }\n}\n\nquery read {\n  read_user(\n    where: {\n      firstname: "" # fill me\n    }\n  ) {\n    id\n  }\n  find_user(term:"%doe%", id:"") {\n    email\n    firstname\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function a(e,i){if("FragmentSpread"===e.kind)i.add(e.name.value);else if("VariableDefinition"===e.kind){var I=e.type;"NamedType"===I.kind&&i.add(I.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){a(e,i)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){a(e,i)})),e.definitions&&e.definitions.forEach((function(e){a(e,i)}))}var I={};function g(e,i){for(var a=0;a<e.definitions.length;a++){var I=e.definitions[a];if(I.name&&I.name.value==i)return I}}function t(e,i){var a={kind:e.kind,definitions:[g(e,i)]};e.hasOwnProperty("loc")&&(a.loc=e.loc);var t=I[i]||new Set,n=new Set,d=new Set;for(t.forEach((function(e){d.add(e)}));d.size>0;){var s=d;d=new Set,s.forEach((function(e){n.has(e)||(n.add(e),(I[e]||new Set).forEach((function(e){d.add(e)})))}))}return n.forEach((function(i){var I=g(e,i);I&&a.definitions.push(I)})),a}i.definitions.forEach((function(e){if(e.name){var i=new Set;a(e,i),I[e.name.value]=i}})),e.exports=i,e.exports.create=t(i,"create"),e.exports.read=t(i,"read")},60172:(e,i,a)=>{"use strict";a.d(i,{Z:()=>I});const I="data:image/svg+xml;base64,PHN2ZyBob3N0PSI2NWJkNzExNDRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMjFweCIgaGVpZ2h0PSIzMjFweCIgdmlld0JveD0iLTAuNSAtMC41IDEyMSAzMjEiIGNvbnRlbnQ9IiZsdDtteGZpbGUmZ3Q7Jmx0O2RpYWdyYW0gaWQ9JnF1b3Q7dEF4eUpDZUVWUjVvV2UyWDZEYmsmcXVvdDsgbmFtZT0mcXVvdDtQYWdlLTEmcXVvdDsmZ3Q7elZiZmI5b3dFUDVyZUJ6S0R3anRZNEYybTFRME5qUzFmVFRKa1ZnemNlUTRrT3l2M3lXMms1aEF5N1NwNmd2Y2ZiN3puYis3Y3p6eUYvdnlzeUJac3VJUnNKSG5ST1hJWDQ0OEw1aTQrRnNEbFFMOFcwY0JzYUNSZ3R3TzJORGZvRUZqVnRBSWNzdFFjczRreld3dzVHa0tvYlF3SWdRLzJtWTd6dXlvR1lsaEFHeEN3b2JvRTQxa290QWJiOWJoWDRER2lZbnNCcmRxWlUrTXNUNUpucENJSDN1UWZ6L3lGNEp6cWFSOXVRQldjMmQ0VVg0UEYxYmJ4QVNrOGhvSHoxY2VCOElLZlRpZG1Lek1hU0hDdzJzMTVTbit6Uk81WjZpNUtFSko1VFBLem5pcXRaZmV5ckl1dVdPVXlpaXBGRlhQcVZaZittdWRXNk1aUDVWYW5jL0Y0Mm9vNTRVSXRaVTMwUzFDUkF6YXpBdGFzckZKZ2U4QjQ2Q043dEJQenRqMXBzcE5BQ09TSHV5UVJIZFEzTHEydTYwNXhXUTZFNzdiNVJqV3FvS3hLVTAydWgzMFBFd21qaDFHcGE2OXVvMVE2R1hmUVUyUkx4UjhjcWJnQVVOYTVsc1U0bHE0VzMrdGg0ZFJaRFZ2VjRWWk5naUdhbDJlQUVVTTd0eGxtUkkySUE0VVMzRGFUWUlYYVFTUnJ1Z3hvUkkyR1dscWRjVEx3bTR1blNzSUNlWHJKYjlZU3MrM3VmWE42QjI3eVhVTmx2U21ObkF1bDlvcXdHdHNUei93TkRYYUdnVEZZNEg0dHhFTHpvelk3SHhkcnA2bnEwa08zbTdweFkrZnl6cE1HdFdmSFNLSnNxY29VcDVlMStNcmtFUlcyY2RyNmZhNmVKZVduZzNZM254L2JHYitsTVFWVDJPK25LdjdBR1E0SGpDSG43K3NGc09LVWFSUStHL3p0MVZrUDI1YmdJUy80cVlFM3dxSjI0REdjL1ZzY0tmL2lmU1RPM29hREVrUHpuQis4L2VjbzlxOUFOUWQzejJqL1BzLyZsdDsvZGlhZ3JhbSZndDsmbHQ7L214ZmlsZSZndDsiPgogICAgPGRlZnMvPgogICAgPGc+CiAgICAgICAgPHBhdGggZD0iTSA2MCA2MCBMIDYwIDExMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gNjAgMTE4Ljg4IEwgNTYuNSAxMTEuODggTCA2MCAxMTMuNjMgTCA2My41IDExMS44OCBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KSI+CiAgICAgICAgICAgIDxzd2l0Y2g+CiAgICAgICAgICAgICAgICA8Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij4KICAgICAgICAgICAgICAgICAgICA8ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDExOHB4OyBoZWlnaHQ6IDFweDsgcGFkZGluZy10b3A6IDMwcHg7IG1hcmdpbi1sZWZ0OiAxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQVBJIGNsaWVudHMKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2I+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2ViLCBBcHAsIFNlcnZpY2UKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjYwIiB5PSIzNCIgZmlsbD0icmdiKDAsIDAsIDApIiBmb250LWZhbWlseT0iSGVsdmV0aWNhIiBmb250LXNpemU9IjEycHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPgogICAgICAgICAgICAgICAgICAgIEFQSSBjbGllbnRzLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgICAgICA8cGF0aCBkPSJNIDYwIDE4MCBMIDYwIDIzMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gNjAgMjM4Ljg4IEwgNTYuNSAyMzEuODggTCA2MCAyMzMuNjMgTCA2My41IDIzMS44OCBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIxMjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMTUwcHg7IG1hcmdpbi1sZWZ0OiAxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1JVRCBhbmQgZGF0YSB2YWxpZGF0aW9uCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9iPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1ldGF0eXBlCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMTU0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgQ1JVRCBhbmQgZGF0YSB2YWxpZGEuLi4KICAgICAgICAgICAgICAgIDwvdGV4dD4KICAgICAgICAgICAgPC9zd2l0Y2g+CiAgICAgICAgPC9nPgogICAgICAgIDxwYXRoIGQ9Ik0gMzAgMjU1IEMgMzAgMjQ2LjcyIDQzLjQzIDI0MCA2MCAyNDAgQyA2Ny45NiAyNDAgNzUuNTkgMjQxLjU4IDgxLjIxIDI0NC4zOSBDIDg2Ljg0IDI0Ny4yMSA5MCAyNTEuMDIgOTAgMjU1IEwgOTAgMzA1IEMgOTAgMzEzLjI4IDc2LjU3IDMyMCA2MCAzMjAgQyA0My40MyAzMjAgMzAgMzEzLjI4IDMwIDMwNSBaIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cGF0aCBkPSJNIDkwIDI1NSBDIDkwIDI2My4yOCA3Ni41NyAyNzAgNjAgMjcwIEMgNDMuNDMgMjcwIDMwIDI2My4yOCAzMCAyNTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogNThweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiAyOTNweDsgbWFyZ2luLWxlZnQ6IDMxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTUUwsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb25nb0RCLCBldGMuCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMjk2IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgU1FMLC4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICA8L2c+CiAgICA8c3dpdGNoPgogICAgICAgIDxnIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIvPgogICAgICAgIDxhIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTUpIiB4bGluazpocmVmPSJodHRwczovL3d3dy5kaWFncmFtcy5uZXQvZG9jL2ZhcS9zdmctZXhwb3J0LXRleHQtcHJvYmxlbXMiIHRhcmdldD0iX2JsYW5rIj4KICAgICAgICAgICAgPHRleHQgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMHB4IiB4PSI1MCUiIHk9IjEwMCUiPgogICAgICAgICAgICAgICAgVGV4dCBpcyBub3QgU1ZHIC0gY2Fubm90IGRpc3BsYXkKICAgICAgICAgICAgPC90ZXh0PgogICAgICAgIDwvYT4KICAgIDwvc3dpdGNoPgo8L3N2Zz4K"},18975:e=>{e.exports={content:'@typegraph(\n  cors=Cors(\n    # ..\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef prisma_runtime(g: Graph):\n  public = Policy.public()\n  db = PrismaRuntime("legacy", "POSTGRES_CONN")\n  user = t.struct(\n    {\n      "id": t.uuid(as_id=True, config={"auto": True}),\n      "email": t.email(),\n      "firstname": t.string(min=2, max=2000),\n    },\n    name="user",\n  )\n\n  g.expose(\n    create_user=db.create(user),\n    read_user=db.find_many(user),\n    find_user=db.query_raw(\n      """\n        SELECT id, firstname, email FROM "user"\n        WHERE CAST(id as VARCHAR) = ${id} OR email LIKE ${term} OR firstname LIKE ${term}\n      """,\n      t.struct(\n        {\n          "id": t.string(),\n          "term": t.string(),\n        }\n      ),\n      t.list(user),\n    ),\n    default_policy=[public],\n  )',path:"website/use-cases/prisma.py"}}}]);