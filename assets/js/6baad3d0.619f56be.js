(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7010],{51092:(e,I,g)=>{"use strict";g.r(I),g.d(I,{assets:()=>d,contentTitle:()=>t,default:()=>c,frontMatter:()=>a,metadata:()=>A,toc:()=>s});var i=g(86070),n=g(25710),C=g(65671);const a={},t="Instant APIs on your database",A={id:"automatic-crud-validation/index",title:"Instant APIs on your database",description:"CRUD stands for Create, Read, Update, and Delete, which are the four basic functions of persistent storage in a software application. Those operations are commonly used in combination with data validation to ensure that the stored data is correct and consistent.",source:"@site/use-cases/automatic-crud-validation/index.mdx",sourceDirName:"automatic-crud-validation",slug:"/automatic-crud-validation/",permalink:"/use-cases/automatic-crud-validation/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/docs/metatype.dev/use-cases/automatic-crud-validation/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",next:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"}},d={},s=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function o(e){const I={a:"a",code:"code",h1:"h1",h2:"h2",img:"img",p:"p",...(0,n.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(I.h1,{id:"instant-apis-on-your-database",children:"Instant APIs on your database"}),"\n",(0,i.jsx)(I.p,{children:"CRUD stands for Create, Read, Update, and Delete, which are the four basic functions of persistent storage in a software application. Those operations are commonly used in combination with data validation to ensure that the stored data is correct and consistent."}),"\n",(0,i.jsx)(I.h2,{id:"case-study",children:"Case study"}),"\n",(0,i.jsx)("div",{className:"text-center md:float-right p-8",children:(0,i.jsx)(I.p,{children:(0,i.jsx)(I.img,{src:g(37834).A+""})})}),"\n",(0,i.jsx)(I.p,{children:"Let's say you are developing a web application for a retail store that allows customers to place orders online. In this scenario, you would need to use CRUD operations to create, read, update, and delete data related to orders, customers, products, and inventory."}),"\n",(0,i.jsx)(I.p,{children:"You would have to model each of these entities as a data type, define the operations that can be performed on them and write the code to ensure the correctness of the data processed in the operations."}),"\n",(0,i.jsxs)(I.p,{children:["For example, you would need to define a ",(0,i.jsx)(I.code,{children:"Customer"})," type with the following fields: ",(0,i.jsx)(I.code,{children:"id"}),", ",(0,i.jsx)(I.code,{children:"name"}),", ",(0,i.jsx)(I.code,{children:"email"}),", and ",(0,i.jsx)(I.code,{children:"address"}),". You would also need to define the operations that can be performed on the ",(0,i.jsx)(I.code,{children:"Customer"})," type, such as ",(0,i.jsx)(I.code,{children:"createCustomer"}),", ",(0,i.jsx)(I.code,{children:"updateCustomer"}),", and ",(0,i.jsx)(I.code,{children:"deleteCustomer"}),". You would also need to write the code to validate the data in the ",(0,i.jsx)(I.code,{children:"createCustomer"})," operation to ensure that the customer's email address is valid and that the customer's address is not empty. Same for the other fields."]}),"\n",(0,i.jsx)(I.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,i.jsxs)(I.p,{children:["Metatype simplifies the development of CRUD APIs by providing the ",(0,i.jsx)(I.a,{href:"/docs/reference/runtimes/prisma",children:"Prisma runtime"})," that automates the creation of the API for CRUD operations and corresponding data validation in PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB. It can even validate some advanced types like email which may not be supported by downstream system (databases often store email address into plain string instead of a specialized field). This makes it faster for developers to create scalable CRUD APIs and enable them to focus their expertise where it matters most like checkout or the search capabilities."]}),"\n",(0,i.jsx)(C.A,{typegraph:"prisma-runtime",python:g(70160),typescript:g(93814),query:g(29922)})]})}function c(e={}){const{wrapper:I}={...(0,n.R)(),...e.components};return I?(0,i.jsx)(I,{...e,children:(0,i.jsx)(o,{...e})}):o(e)}},65671:(e,I,g)=>{"use strict";g.d(I,{A:()=>C});var i=g(98302),n=(g(30758),g(86070));function C(e){let{python:I,typescript:g,rust:C,...a}=e;const t=[I&&{content:I.content,codeLanguage:"python",codeFileUrl:I.path},g&&{content:g.content,codeLanguage:"typescript",codeFileUrl:g.path},C&&{content:C.content,codeLanguage:"rust",codeFileUrl:C.path}].filter((e=>!!e));return(0,n.jsx)(i.A,{code:0==t.length?void 0:t,...a})}},29922:e=>{var I={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"create"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"john@doe.com",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"read"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"read_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"where"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"find_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"term"},value:{kind:"StringValue",value:"%doe%",block:!1}},{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"StringValue",value:"",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"firstname"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:288}};I.loc.source={body:'mutation create {\n  create_user(\n    data: {\n      firstname: "" # fill me\n      email: "john@doe.com"\n    }\n  ) {\n    id\n  }\n}\n\nquery read {\n  read_user(\n    where: {\n      firstname: "" # fill me\n    }\n  ) {\n    id\n  }\n  find_user(term: "%doe%", id: "") {\n    email\n    firstname\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function g(e,I){if("FragmentSpread"===e.kind)I.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&I.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){g(e,I)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){g(e,I)})),e.definitions&&e.definitions.forEach((function(e){g(e,I)}))}var i={};function n(e,I){for(var g=0;g<e.definitions.length;g++){var i=e.definitions[g];if(i.name&&i.name.value==I)return i}}function C(e,I){var g={kind:e.kind,definitions:[n(e,I)]};e.hasOwnProperty("loc")&&(g.loc=e.loc);var C=i[I]||new Set,a=new Set,t=new Set;for(C.forEach((function(e){t.add(e)}));t.size>0;){var A=t;t=new Set,A.forEach((function(e){a.has(e)||(a.add(e),(i[e]||new Set).forEach((function(e){t.add(e)})))}))}return a.forEach((function(I){var i=n(e,I);i&&g.definitions.push(i)})),g}I.definitions.forEach((function(e){if(e.name){var I=new Set;g(e,I),i[e.name.value]=I}})),e.exports=I,e.exports.create=C(I,"create"),e.exports.read=C(I,"read")},37834:(e,I,g)=>{"use strict";g.d(I,{A:()=>i});const i="data:image/svg+xml;base64,PHN2ZyBob3N0PSI2NWJkNzExNDRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIxMjFweCIgaGVpZ2h0PSIzMjFweCIgdmlld0JveD0iLTAuNSAtMC41IDEyMSAzMjEiIGNvbnRlbnQ9IiZsdDtteGZpbGUmZ3Q7Jmx0O2RpYWdyYW0gaWQ9JnF1b3Q7dEF4eUpDZUVWUjVvV2UyWDZEYmsmcXVvdDsgbmFtZT0mcXVvdDtQYWdlLTEmcXVvdDsmZ3Q7elZiZmI5b3dFUDVyZUJ6S0R3anRZNEYybTFRME5qUzFmVFRKa1ZnemNlUTRrT3l2M3lXMms1aEF5N1NwNmd2Y2ZiN3puYis3Y3p6eUYvdnlzeUJac3VJUnNKSG5ST1hJWDQ0OEw1aTQrRnNEbFFMOFcwY0JzYUNSZ3R3TzJORGZvRUZqVnRBSWNzdFFjczRreld3dzVHa0tvYlF3SWdRLzJtWTd6dXlvR1lsaEFHeEN3b2JvRTQxa290QWJiOWJoWDRER2lZbnNCcmRxWlUrTXNUNUpucENJSDN1UWZ6L3lGNEp6cWFSOXVRQldjMmQ0VVg0UEYxYmJ4QVNrOGhvSHoxY2VCOElLZlRpZG1Lek1hU0hDdzJzMTVTbit6Uk81WjZpNUtFSko1VFBLem5pcXRaZmV5ckl1dVdPVXlpaXBGRlhQcVZaZittdWRXNk1aUDVWYW5jL0Y0Mm9vNTRVSXRaVTMwUzFDUkF6YXpBdGFzckZKZ2U4QjQ2Q043dEJQenRqMXBzcE5BQ09TSHV5UVJIZFEzTHEydTYwNXhXUTZFNzdiNVJqV3FvS3hLVTAydWgzMFBFd21qaDFHcGE2OXVvMVE2R1hmUVUyUkx4UjhjcWJnQVVOYTVsc1U0bHE0VzMrdGg0ZFJaRFZ2VjRWWk5naUdhbDJlQUVVTTd0eGxtUkkySUE0VVMzRGFUWUlYYVFTUnJ1Z3hvUkkyR1dscWRjVEx3bTR1blNzSUNlWHJKYjlZU3MrM3VmWE42QjI3eVhVTmx2U21ObkF1bDlvcXdHdHNUei93TkRYYUdnVEZZNEg0dHhFTHpvelk3SHhkcnA2bnEwa08zbTdweFkrZnl6cE1HdFdmSFNLSnNxY29VcDVlMStNcmtFUlcyY2RyNmZhNmVKZVduZzNZM254L2JHYitsTVFWVDJPK25LdjdBR1E0SGpDSG43K3NGc09LVWFSUStHL3p0MVZrUDI1YmdJUy80cVlFM3dxSjI0REdjL1ZzY0tmL2lmU1RPM29hREVrUHpuQis4L2VjbzlxOUFOUWQzejJqL1BzLyZsdDsvZGlhZ3JhbSZndDsmbHQ7L214ZmlsZSZndDsiPgogICAgPGRlZnMvPgogICAgPGc+CiAgICAgICAgPHBhdGggZD0iTSA2MCA2MCBMIDYwIDExMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gNjAgMTE4Ljg4IEwgNTYuNSAxMTEuODggTCA2MCAxMTMuNjMgTCA2My41IDExMS44OCBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjYwIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KSI+CiAgICAgICAgICAgIDxzd2l0Y2g+CiAgICAgICAgICAgICAgICA8Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij4KICAgICAgICAgICAgICAgICAgICA8ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDExOHB4OyBoZWlnaHQ6IDFweDsgcGFkZGluZy10b3A6IDMwcHg7IG1hcmdpbi1sZWZ0OiAxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQVBJIGNsaWVudHMKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2I+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2ViLCBBcHAsIFNlcnZpY2UKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjYwIiB5PSIzNCIgZmlsbD0icmdiKDAsIDAsIDApIiBmb250LWZhbWlseT0iSGVsdmV0aWNhIiBmb250LXNpemU9IjEycHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPgogICAgICAgICAgICAgICAgICAgIEFQSSBjbGllbnRzLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgICAgICA8cGF0aCBkPSJNIDYwIDE4MCBMIDYwIDIzMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gNjAgMjM4Ljg4IEwgNTYuNSAyMzEuODggTCA2MCAyMzMuNjMgTCA2My41IDIzMS44OCBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIwIiB5PSIxMjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMTUwcHg7IG1hcmdpbi1sZWZ0OiAxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ1JVRCBhbmQgZGF0YSB2YWxpZGF0aW9uCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9iPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1ldGF0eXBlCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMTU0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgQ1JVRCBhbmQgZGF0YSB2YWxpZGEuLi4KICAgICAgICAgICAgICAgIDwvdGV4dD4KICAgICAgICAgICAgPC9zd2l0Y2g+CiAgICAgICAgPC9nPgogICAgICAgIDxwYXRoIGQ9Ik0gMzAgMjU1IEMgMzAgMjQ2LjcyIDQzLjQzIDI0MCA2MCAyNDAgQyA2Ny45NiAyNDAgNzUuNTkgMjQxLjU4IDgxLjIxIDI0NC4zOSBDIDg2Ljg0IDI0Ny4yMSA5MCAyNTEuMDIgOTAgMjU1IEwgOTAgMzA1IEMgOTAgMzEzLjI4IDc2LjU3IDMyMCA2MCAzMjAgQyA0My40MyAzMjAgMzAgMzEzLjI4IDMwIDMwNSBaIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cGF0aCBkPSJNIDkwIDI1NSBDIDkwIDI2My4yOCA3Ni41NyAyNzAgNjAgMjcwIEMgNDMuNDMgMjcwIDMwIDI2My4yOCAzMCAyNTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogNThweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiAyOTNweDsgbWFyZ2luLWxlZnQ6IDMxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTUUwsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb25nb0RCLCBldGMuCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMjk2IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgU1FMLC4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICA8L2c+CiAgICA8c3dpdGNoPgogICAgICAgIDxnIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIvPgogICAgICAgIDxhIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTUpIiB4bGluazpocmVmPSJodHRwczovL3d3dy5kaWFncmFtcy5uZXQvZG9jL2ZhcS9zdmctZXhwb3J0LXRleHQtcHJvYmxlbXMiIHRhcmdldD0iX2JsYW5rIj4KICAgICAgICAgICAgPHRleHQgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMHB4IiB4PSI1MCUiIHk9IjEwMCUiPgogICAgICAgICAgICAgICAgVGV4dCBpcyBub3QgU1ZHIC0gY2Fubm90IGRpc3BsYXkKICAgICAgICAgICAgPC90ZXh0PgogICAgICAgIDwvYT4KICAgIDwvc3dpdGNoPgo8L3N2Zz4K"},70160:e=>{e.exports={content:'@typegraph(\n  cors=Cors(\n    # ..\n  ),\n)\ndef prisma_runtime(g: Graph):\n  public = Policy.public()\n  db = PrismaRuntime("legacy", "POSTGRES_CONN")\n  user = t.struct(\n    {\n      "id": t.uuid(as_id=True, config={"auto": True}),\n      "email": t.email(),\n      "firstname": t.string(min=2, max=2000),\n    },\n    name="user",\n  )\n\n  g.expose(\n    create_user=db.create(user),\n    read_user=db.find_many(user),\n    find_user=db.query_raw(\n      \'SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = ${id} OR email LIKE ${term} OR firstname LIKE ${term}\',\n      t.struct(\n        {\n          "id": t.string(),\n          "term": t.string(),\n        }\n      ),\n      t.list(user),\n    ),\n    default_policy=[public],\n  )',path:"../examples/typegraphs/prisma-runtime.py"}},93814:e=>{e.exports={content:'typegraph(\n  {\n    name: "prisma-runtime",\n    cors: {\n      // ..\n      allowOrigin: ["https://metatype.dev", "http://localhost:3000"],\n    },\n  },\n  (g) => {\n    const pub = Policy.public();\n    const db = new PrismaRuntime("legacy", "POSTGRES_CONN");\n    const user = t.struct(\n      {\n        id: t.uuid({ asId: true, config: { auto: true } }),\n        email: t.email(),\n        firstname: t.string({ min: 2, max: 2000 }, {}),\n      },\n      { name: "user" }\n    );\n\n    g.expose(\n      {\n        create_user: db.create(user),\n        read_user: db.findMany(user),\n        find_user: db.queryRaw(\n          `SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = $\\{id} OR email LIKE $\\{term} OR firstname LIKE $\\{term}`,\n          t.struct({\n            id: t.string(),\n            term: t.string(),\n          }),\n          t.list(user)\n        ),\n      },\n      pub\n    );\n  }\n);',path:"../examples/typegraphs/prisma-runtime.ts"}}}]);