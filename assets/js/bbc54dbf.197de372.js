(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2427],{26761:(I,g,e)=>{"use strict";e.r(g),e.d(g,{assets:()=>t,contentTitle:()=>a,default:()=>c,frontMatter:()=>n,metadata:()=>d,toc:()=>l});var C=e(86070),A=e(25710),i=e(93214);const n={},a="ORM for the edge",d={id:"orm-for-the-edge/index",title:"ORM for the edge",description:"Edge computing platforms like Deno Deploy and Cloudflare Workers can provide a convenient and scalable way for developers to deploy their applications and APIs near the end-users, improving performance, reducing latency, and enhancing the user experience. Due to the resource constraints and compatibility issues (legacy libraries or specific drivers) of those environments, running a traditional Object-Relational Mapping (ORM) library might not be as easy as in normal deployments.",source:"@site/use-cases/orm-for-the-edge/index.mdx",sourceDirName:"orm-for-the-edge",slug:"/orm-for-the-edge/",permalink:"/use-cases/orm-for-the-edge/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/orm-for-the-edge/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Microservices orchestration",permalink:"/use-cases/microservice-orchestration/"},next:{title:"Programmable API gateway",permalink:"/use-cases/programmable-api-gateway/"}},t={},l=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function s(I){const g={a:"a",h1:"h1",h2:"h2",img:"img",p:"p",...(0,A.R)(),...I.components};return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(g.h1,{id:"orm-for-the-edge",children:"ORM for the edge"}),"\n",(0,C.jsx)(g.p,{children:"Edge computing platforms like Deno Deploy and Cloudflare Workers can provide a convenient and scalable way for developers to deploy their applications and APIs near the end-users, improving performance, reducing latency, and enhancing the user experience. Due to the resource constraints and compatibility issues (legacy libraries or specific drivers) of those environments, running a traditional Object-Relational Mapping (ORM) library might not be as easy as in normal deployments."}),"\n",(0,C.jsx)(g.h2,{id:"case-study",children:"Case study"}),"\n",(0,C.jsx)("div",{className:"text-center md:float-right p-8",children:(0,C.jsx)(g.p,{children:(0,C.jsx)(g.img,{src:e(66661).A+""})})}),"\n",(0,C.jsx)(g.p,{children:"Suppose you are building a mobile app that allows users to order food from local restaurants. To provide a low-latency user experience, you want to run your server-side logic as close as possible to your users."}),"\n",(0,C.jsx)(g.p,{children:"You can deploy your functions across multiple locations on distributed edge servers. For database interactions, you may need a lightweight relay API to remains compatible with the platform and offer an efficient interface like an ORM provide."}),"\n",(0,C.jsx)(g.p,{children:"When a user makes a request to view the menu or place an order, the corresponding function running on the edge will make a request to the lightweight relay API to retrieve or modify the relevant data in the database."}),"\n",(0,C.jsx)(g.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,C.jsxs)(g.p,{children:["Metatype can act out of the box as a lightweight relay API, simplifying database interactions via HTTP/GraphQL requests, and allowing you to query your database through the ",(0,C.jsx)(g.a,{href:"/docs/reference/runtimes/prisma",children:"Prisma runtime"}),". Prisma is a well-known ORM library that provides a convenient interface to interact with PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB databases."]}),"\n",(0,C.jsx)(i.A,{typegraph:"prisma-runtime",python:e(42211),typescript:e(67133),query:e(76726)})]})}function c(I={}){const{wrapper:g}={...(0,A.R)(),...I.components};return g?(0,C.jsx)(g,{...I,children:(0,C.jsx)(s,{...I})}):s(I)}},76726:I=>{var g={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"create"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"john@doe.com",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"read"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"read_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"where"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"find_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"term"},value:{kind:"StringValue",value:"%doe%",block:!1}},{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"StringValue",value:"",block:!1}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"firstname"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:286}};g.loc.source={body:'mutation create {\n  create_user(\n    data: {\n      firstname: "" # fill me\n      email: "john@doe.com"\n    }\n  ) {\n    id\n  }\n}\n\nquery read {\n  read_user(\n    where: {\n      firstname: "" # fill me\n    }\n  ) {\n    id\n  }\n  find_user(term:"%doe%", id:"") {\n    email\n    firstname\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function e(I,g){if("FragmentSpread"===I.kind)g.add(I.name.value);else if("VariableDefinition"===I.kind){var C=I.type;"NamedType"===C.kind&&g.add(C.name.value)}I.selectionSet&&I.selectionSet.selections.forEach((function(I){e(I,g)})),I.variableDefinitions&&I.variableDefinitions.forEach((function(I){e(I,g)})),I.definitions&&I.definitions.forEach((function(I){e(I,g)}))}var C={};function A(I,g){for(var e=0;e<I.definitions.length;e++){var C=I.definitions[e];if(C.name&&C.name.value==g)return C}}function i(I,g){var e={kind:I.kind,definitions:[A(I,g)]};I.hasOwnProperty("loc")&&(e.loc=I.loc);var i=C[g]||new Set,n=new Set,a=new Set;for(i.forEach((function(I){a.add(I)}));a.size>0;){var d=a;a=new Set,d.forEach((function(I){n.has(I)||(n.add(I),(C[I]||new Set).forEach((function(I){a.add(I)})))}))}return n.forEach((function(g){var C=A(I,g);C&&e.definitions.push(C)})),e}g.definitions.forEach((function(I){if(I.name){var g=new Set;e(I,g),C[I.name.value]=g}})),I.exports=g,I.exports.create=i(g,"create"),I.exports.read=i(g,"read")},66661:(I,g,e)=>{"use strict";e.d(g,{A:()=>C});const C="data:image/svg+xml;base64,PHN2ZyBob3N0PSI2NWJkNzExNDRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIyNTFweCIgaGVpZ2h0PSIzMjFweCIgdmlld0JveD0iLTAuNSAtMC41IDI1MSAzMjEiIGNvbnRlbnQ9IiZsdDtteGZpbGUmZ3Q7Jmx0O2RpYWdyYW0gaWQ9JnF1b3Q7dEF4eUpDZUVWUjVvV2UyWDZEYmsmcXVvdDsgbmFtZT0mcXVvdDtQYWdlLTEmcXVvdDsmZ3Q7eFZaTmM1c3dFUDAxUHRiRGgwM2NxKzAwUGRpVHRENmtPY3F3QmsyRXhBaGhUSDk5RjVENEtIWkNPcTV6UXZ1MGk3VHY3VXFhdUt2NDlDQkpFbTFGQUd6aVdNRnA0cTRuam1OYkN3OC9KVklZeExWckpKUTAwRmdMN09odk1JNGF6V2dBYWM5UkNjRVVUZnFnTHpnSFgvVXdJcVhJKzI0SHdmcXJKaVNFQWJEekNSdWl6elJRVVkwdW5Mc1cvdzQwak16S3R2ZTFub21KY2RhWnBCRUpSTjZCM1B1SnU1SkNxSG9VbjFiQVN2WU1MM1hjdHd1enpjWWtjRFVtUU8vNFNGaW1jOVA3VW9WSkZnTE1YWnRjY1B3c0l4VXp0R3djd29tcVh6aTJwbk50dlhSbTFxWG1sakVLWTNBbGl6ckltUnY3cFR2WnhsV1dDUnhtcHhOT1JTWjl2VitkZ1NJeUJPMmw2NjNNcEJPbUdYa0FFUU91Z2c2NlFyOVlVeHMzVnNWSVlFVFJZMTk0b3VzbmJFS2J2ejBKaW50clhjVGhrT0kyT2hyZ29MTm9DMVhLbkZmSk9hT1N4ekM1NVI0SFlUbFlBeGZvc29hRWljTE00bjhiaHlaQ0d1UlpTQmJrMkVsbG1obFhOSWFCK0ZKa1BJQkE4NTlIVk1FdUlSWFZPVFozdnhZdXluTUVxZUEwaG5yWDFZMmhqd2JYTkVyZTlwbHRzS2pUWTU1MVdab2U4Mi9SN04yMitEOVUrNVgxQkJKVlVpQS8waERlc0NGc2QyUkhqQzcvc1J4Nzc1ZnlwbFExcjdWMXJNZWYyM0hsdkFWRlZKRjhmZzNQckg0TnoyWTNyR0dqYklmZzNZL054Rm1kSVV6d1VLeVgxWndGeXA4T21NUGJLU21IZnNFb1VpamQ5L25iMTJSdjlnMUEvTmV3a3VBeFUvZ2IwSGhhMytyMi9FcWsvM1Z3ekwwaDZkNFp6aGZYT0RkdWZHbmUvWWRMMHp5ai91SFd2UG9aMGFqL3hpR3hZaUlMRGd5elFrZTh5VjVCcHVQT2lSMUlMQ3NHYVZvKy9UTHVLeXA0K3ZtbmhuZTdtdy9OOW9sWnYwZmFsN3A3L3djPSZsdDsvZGlhZ3JhbSZndDsmbHQ7L214ZmlsZSZndDsiPgogICAgPGRlZnMvPgogICAgPGc+CiAgICAgICAgPHBhdGggZD0iTSA2MCA2MCBMIDk2LjQ3IDExNC43IiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0ic3Ryb2tlIi8+CiAgICAgICAgPHBhdGggZD0iTSA5OS4zOCAxMTkuMDcgTCA5Mi41OCAxMTUuMTkgTCA5Ni40NyAxMTQuNyBMIDk4LjQxIDExMS4zIFoiIGZpbGw9InJnYigwLCAwLCAwKSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPgogICAgICAgIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMzBweDsgbWFyZ2luLWxlZnQ6IDFweDsiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6IHJnYigwLCAwLCAwKTsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTogaW5saW5lLWJsb2NrOyBmb250LXNpemU6IDEycHg7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGNvbG9yOiByZ2IoMCwgMCwgMCk7IGxpbmUtaGVpZ2h0OiAxLjI7IHBvaW50ZXItZXZlbnRzOiBhbGw7IHdoaXRlLXNwYWNlOiBub3JtYWw7IG92ZXJmbG93LXdyYXA6IG5vcm1hbDsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZW5vIERlcGxveQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFdvcmxkd2lkZSBydW50aW1lCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMzQiIGZpbGw9InJnYigwLCAwLCAwKSIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxMnB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4KICAgICAgICAgICAgICAgICAgICBEZW5vIERlcGxveS4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICAgICAgPHBhdGggZD0iTSAxMzAgMTgwIEwgMTMwIDIzMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gMTMwIDIzOC44OCBMIDEyNi41IDIzMS44OCBMIDEzMCAyMzMuNjMgTCAxMzMuNSAyMzEuODggWiIgZmlsbD0icmdiKDAsIDAsIDApIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPHJlY3QgeD0iNzAiIHk9IjEyMCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI2MCIgZmlsbD0icmdiKDI1NSwgMjU1LCAyNTUpIiBzdHJva2U9InJnYigwLCAwLCAwKSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPgogICAgICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0wLjUgLTAuNSkiPgogICAgICAgICAgICA8c3dpdGNoPgogICAgICAgICAgICAgICAgPGZvcmVpZ25PYmplY3QgcG9pbnRlci1ldmVudHM9Im5vbmUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIgc3R5bGU9Im92ZXJmbG93OiB2aXNpYmxlOyB0ZXh0LWFsaWduOiBsZWZ0OyI+CiAgICAgICAgICAgICAgICAgICAgPGRpdiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgc3R5bGU9ImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiB1bnNhZmUgY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IHVuc2FmZSBjZW50ZXI7IHdpZHRoOiAxMThweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiAxNTBweDsgbWFyZ2luLWxlZnQ6IDcxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGlnaHR3ZWlnaHQgT1JNCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9iPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWV0YXR5cGUKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjEzMCIgeT0iMTU0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgTGlnaHR3ZWlnaHQgT1JNLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgICAgICA8cGF0aCBkPSJNIDEwMCAyNTUgQyAxMDAgMjQ2LjcyIDExMy40MyAyNDAgMTMwIDI0MCBDIDEzNy45NiAyNDAgMTQ1LjU5IDI0MS41OCAxNTEuMjEgMjQ0LjM5IEMgMTU2Ljg0IDI0Ny4yMSAxNjAgMjUxLjAyIDE2MCAyNTUgTCAxNjAgMzA1IEMgMTYwIDMxMy4yOCAxNDYuNTcgMzIwIDEzMCAzMjAgQyAxMTMuNDMgMzIwIDEwMCAzMTMuMjggMTAwIDMwNSBaIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cGF0aCBkPSJNIDE2MCAyNTUgQyAxNjAgMjYzLjI4IDE0Ni41NyAyNzAgMTMwIDI3MCBDIDExMy40MyAyNzAgMTAwIDI2My4yOCAxMDAgMjU1IiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KSI+CiAgICAgICAgICAgIDxzd2l0Y2g+CiAgICAgICAgICAgICAgICA8Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij4KICAgICAgICAgICAgICAgICAgICA8ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDU4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMjkzcHg7IG1hcmdpbi1sZWZ0OiAxMDFweDsiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6IHJnYigwLCAwLCAwKTsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTogaW5saW5lLWJsb2NrOyBmb250LXNpemU6IDEycHg7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGNvbG9yOiByZ2IoMCwgMCwgMCk7IGxpbmUtaGVpZ2h0OiAxLjI7IHBvaW50ZXItZXZlbnRzOiBhbGw7IHdoaXRlLXNwYWNlOiBub3JtYWw7IG92ZXJmbG93LXdyYXA6IG5vcm1hbDsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNRTCwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1vbmdvREIsIGV0Yy4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjEzMCIgeT0iMjk2IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgU1FMLC4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICAgICAgPHBhdGggZD0iTSAxOTAgNjAgTCAxNjIuODUgMTE0LjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJzdHJva2UiLz4KICAgICAgICA8cGF0aCBkPSJNIDE2MC41IDExOSBMIDE2MC41IDExMS4xNyBMIDE2Mi44NSAxMTQuMyBMIDE2Ni43NiAxMTQuMyBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIxMzAiIHk9IjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMzBweDsgbWFyZ2luLWxlZnQ6IDEzMXB4OyI+CiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgZGF0YS1kcmF3aW8tY29sb3JzPSJjb2xvcjogcmdiKDAsIDAsIDApOyAiIHN0eWxlPSJib3gtc2l6aW5nOiBib3JkZXItYm94OyBmb250LXNpemU6IDBweDsgdGV4dC1hbGlnbjogY2VudGVyOyI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IGZvbnQtc2l6ZTogMTJweDsgZm9udC1mYW1pbHk6IEhlbHZldGljYTsgY29sb3I6IHJnYigwLCAwLCAwKTsgbGluZS1oZWlnaHQ6IDEuMjsgcG9pbnRlci1ldmVudHM6IGFsbDsgd2hpdGUtc3BhY2U6IG5vcm1hbDsgb3ZlcmZsb3ctd3JhcDogbm9ybWFsOyI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENsb3VkZmxhcmUgV29ya2VycwogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNlcnZlcmxlc3MgZnVuY3Rpb25zCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSIxOTAiIHk9IjM0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgQ2xvdWRmbGFyZSBXb3JrZXJzLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgIDwvZz4KICAgIDxzd2l0Y2g+CiAgICAgICAgPGcgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5Ii8+CiAgICAgICAgPGEgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtNSkiIHhsaW5rOmhyZWY9Imh0dHBzOi8vd3d3LmRpYWdyYW1zLm5ldC9kb2MvZmFxL3N2Zy1leHBvcnQtdGV4dC1wcm9ibGVtcyIgdGFyZ2V0PSJfYmxhbmsiPgogICAgICAgICAgICA8dGV4dCB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwcHgiIHg9IjUwJSIgeT0iMTAwJSI+CiAgICAgICAgICAgICAgICBUZXh0IGlzIG5vdCBTVkcgLSBjYW5ub3QgZGlzcGxheQogICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgPC9hPgogICAgPC9zd2l0Y2g+Cjwvc3ZnPgo="},42211:I=>{I.exports={content:'@typegraph(\n  cors=Cors(\n    # ..\n    allow_origin=[\n      "https://metatype.dev",\n      "http://localhost:3000",\n    ],\n  ),\n)\ndef prisma_runtime(g: Graph):\n  public = Policy.public()\n  db = PrismaRuntime("legacy", "POSTGRES_CONN")\n  user = t.struct(\n    {\n      "id": t.uuid(as_id=True, config={"auto": True}),\n      "email": t.email(),\n      "firstname": t.string(min=2, max=2000),\n    },\n    name="user",\n  )\n\n  g.expose(\n    create_user=db.create(user),\n    read_user=db.find_many(user),\n    find_user=db.query_raw(\n      \'SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = ${id} OR email LIKE ${term} OR firstname LIKE ${term}\',\n      t.struct(\n        {\n          "id": t.string(),\n          "term": t.string(),\n        }\n      ),\n      t.list(user),\n    ),\n    default_policy=[public],\n  )',path:"examples/typegraphs/prisma-runtime.py"}},67133:I=>{I.exports={content:'typegraph({\n  name: "prisma-runtime",\n  cors: {\n    // ..\n    allowOrigin: ["https://metatype.dev", "http://localhost:3000"],\n  },\n}, (g) => {\n  const pub = Policy.public();\n  const db = new PrismaRuntime("legacy", "POSTGRES_CONN");\n  const user = t.struct(\n    {\n      "id": t.uuid({ asId: true, config: { "auto": true } }),\n      "email": t.email(),\n      "firstname": t.string({ min: 2, max: 2000 }, {}),\n    },\n    { name: "user" },\n  );\n\n  g.expose({\n    create_user: db.create(user),\n    read_user: db.findMany(user),\n    find_user: db.queryRaw(\n      `SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = $\\{id} OR email LIKE $\\{term} OR firstname LIKE $\\{term}`,\n      t.struct(\n        {\n          "id": t.string(),\n          "term": t.string(),\n        },\n      ),\n      t.list(user),\n    ),\n  }, pub);\n});',path:"examples/typegraphs/prisma-runtime.ts"}}}]);