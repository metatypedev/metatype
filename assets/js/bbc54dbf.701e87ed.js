(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8178],{7942:(e,g,I)=>{"use strict";I.d(g,{Zo:()=>r,kt:()=>s});var t=I(959);function i(e,g,I){return g in e?Object.defineProperty(e,g,{value:I,enumerable:!0,configurable:!0,writable:!0}):e[g]=I,e}function a(e,g){var I=Object.keys(e);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(e);g&&(t=t.filter((function(g){return Object.getOwnPropertyDescriptor(e,g).enumerable}))),I.push.apply(I,t)}return I}function n(e){for(var g=1;g<arguments.length;g++){var I=null!=arguments[g]?arguments[g]:{};g%2?a(Object(I),!0).forEach((function(g){i(e,g,I[g])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(I)):a(Object(I)).forEach((function(g){Object.defineProperty(e,g,Object.getOwnPropertyDescriptor(I,g))}))}return e}function C(e,g){if(null==e)return{};var I,t,i=function(e,g){if(null==e)return{};var I,t,i={},a=Object.keys(e);for(t=0;t<a.length;t++)I=a[t],g.indexOf(I)>=0||(i[I]=e[I]);return i}(e,g);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(t=0;t<a.length;t++)I=a[t],g.indexOf(I)>=0||Object.prototype.propertyIsEnumerable.call(e,I)&&(i[I]=e[I])}return i}var A=t.createContext({}),l=function(e){var g=t.useContext(A),I=g;return e&&(I="function"==typeof e?e(g):n(n({},g),e)),I},r=function(e){var g=l(e.components);return t.createElement(A.Provider,{value:g},e.children)},o="mdxType",d={inlineCode:"code",wrapper:function(e){var g=e.children;return t.createElement(t.Fragment,{},g)}},c=t.forwardRef((function(e,g){var I=e.components,i=e.mdxType,a=e.originalType,A=e.parentName,r=C(e,["components","mdxType","originalType","parentName"]),o=l(I),c=i,s=o["".concat(A,".").concat(c)]||o[c]||d[c]||a;return I?t.createElement(s,n(n({ref:g},r),{},{components:I})):t.createElement(s,n({ref:g},r))}));function s(e,g){var I=arguments,i=g&&g.mdxType;if("string"==typeof e||i){var a=I.length,n=new Array(a);n[0]=c;var C={};for(var A in g)hasOwnProperty.call(g,A)&&(C[A]=g[A]);C.originalType=e,C[o]="string"==typeof e?e:i,n[1]=C;for(var l=2;l<a;l++)n[l]=I[l];return t.createElement.apply(null,n)}return t.createElement.apply(null,I)}c.displayName="MDXCreateElement"},3397:(e,g,I)=>{"use strict";I.r(g),I.d(g,{assets:()=>l,contentTitle:()=>C,default:()=>c,frontMatter:()=>n,metadata:()=>A,toc:()=>r});var t=I(2564),i=(I(959),I(7942)),a=I(7035);const n={},C="ORM for the edge",A={unversionedId:"orm-for-the-edge/index",id:"orm-for-the-edge/index",title:"ORM for the edge",description:"Edge computing platforms like Deno Deploy and Cloudflare Workers can provide a convenient and scalable way for developers to deploy their applications and APIs near the end-users, improving performance, reducing latency, and enhancing the user experience. Due to the resource constraints and compatibility issues (legacy libraries or specific drivers) of those environments, running a traditional Object-Relational Mapping (ORM) library might not be as easy as in normal deployments.",source:"@site/use-cases/orm-for-the-edge/index.mdx",sourceDirName:"orm-for-the-edge",slug:"/orm-for-the-edge/",permalink:"/use-cases/orm-for-the-edge/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/orm-for-the-edge/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Microservices orchestration",permalink:"/use-cases/microservice-orchestration/"},next:{title:"Programmable API gateway",permalink:"/use-cases/programmable-api-gateway/"}},l={},r=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}],o={toc:r},d="wrapper";function c(e){let{components:g,...n}=e;return(0,i.kt)(d,(0,t.Z)({},o,n,{components:g,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"orm-for-the-edge"},"ORM for the edge"),(0,i.kt)("p",null,"Edge computing platforms like ",(0,i.kt)("a",{parentName:"p",href:"https://deno.com/deploy"},"Deno Deploy")," and ",(0,i.kt)("a",{parentName:"p",href:"https://workers.cloudflare.com"},"Cloudflare Workers")," can provide a convenient and scalable way for developers to deploy their applications and APIs near the end-users, improving performance, reducing latency, and enhancing the user experience. Due to the resource constraints and compatibility issues (legacy libraries or specific drivers) of those environments, running a traditional Object-Relational Mapping (ORM) library might not be as easy as in normal deployments."),(0,i.kt)("h2",{id:"case-study"},"Case study"),(0,i.kt)("div",{className:"text-center md:float-right p-8"},(0,i.kt)("p",null,(0,i.kt)("img",{src:I(271).Z,width:"251",height:"321"}))),(0,i.kt)("p",null,"Suppose you are building a mobile app that allows users to order food from local restaurants. To provide a low-latency user experience, you want to run your server-side logic as close as possible to your users."),(0,i.kt)("p",null,"You can deploy your functions across multiple locations on distributed edge servers. For database interactions, you may need a lightweight relay API to remains compatible with the platform and offer an efficient interface like an ORM provide."),(0,i.kt)("p",null,"When a user makes a request to view the menu or place an order, the corresponding function running on the edge will make a request to the lightweight relay API to retrieve or modify the relevant data in the database."),(0,i.kt)("h2",{id:"metatypes-solution"},"Metatype's solution"),(0,i.kt)("p",null,"Metatype can act out of the box as a lightweight relay API, simplifying database interactions via HTTP/GraphQL requests, and allowing you to query your database through the ",(0,i.kt)("a",{parentName:"p",href:"/docs/reference/typegraph/typegraph/providers/prisma/runtimes/prisma"},"Prisma runtime"),". Prisma is a well-known ORM library that provides a convenient interface to interact with PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB databases."),(0,i.kt)(a.Z,{typegraph:"prisma-runtime",python:I(8975),query:I(683),mdxType:"TGExample"}))}c.isMDXComponent=!0},4133:(e,g,I)=>{"use strict";I.d(g,{r:()=>i});var t=I(959);function i(e){let{name:g,choices:I,choice:i,onChange:a}=e;return t.createElement("ul",{className:"pl-0 m-0 list-none rounded-md overflow-clip"},Object.entries(I).map((e=>{let[I,n]=e;return t.createElement("li",{key:I,className:"inline-block"},t.createElement("div",null,t.createElement("label",{className:"cursor-pointer"},t.createElement("input",{type:"radio",name:g,value:I,checked:I===i,onChange:()=>a(I),className:"hidden peer"}),t.createElement("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white"},n))))})))}},2481:(e,g,I)=>{"use strict";I.d(g,{Z:()=>u});var t=I(959),i=I(4087),a=I(7731),n=I(1996),C=I(3117),A=I(884);const l=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function r(e){const{queryEditor:g,variableEditor:I,headerEditor:i}=(0,A._i)({nonNull:!0}),[a,n]=(0,t.useState)(e.defaultTab),C=(0,A.Xd)({onCopyQuery:e.onCopyQuery}),r=(0,A.fE)();return(0,t.useEffect)((()=>{I&&l(I)}),[a,I]),(0,t.useEffect)((()=>{i&&l(i)}),[a,i]),(0,t.useEffect)((()=>{g&&(g.setOption("lineNumbers",!1),g.setOption("extraKeys",{"Alt-G":()=>{g.replaceSelection("@")}}),g.setOption("gutters",[]),g.on("change",l),l(g))}),[g]),(0,t.useEffect)((()=>{I&&(I.setOption("lineNumbers",!1),I.setOption("gutters",[]),I.on("change",l))}),[I]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",l))}),[i]),t.createElement("div",{className:"graphiql-editors"},t.createElement("section",{className:"graphiql-query-editor","aria-label":"Query Editor"},t.createElement("div",{className:"graphiql-query-editor-wrapper"},t.createElement(A.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly})),t.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},t.createElement(A._8,null),t.createElement(A.wC,{onClick:()=>r(),label:"Prettify query (Shift-Ctrl-P)"},t.createElement(A.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),t.createElement(A.wC,{onClick:()=>C(),label:"Copy query (Shift-Ctrl-C)"},t.createElement(A.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})))),e.noTool?null:t.createElement(t.Fragment,null,t.createElement("div",{className:"graphiql-editor-tools p-0 text-sm "},t.createElement("div",{className:"graphiql-editor-tools-tabs"},t.createElement("div",{className:("variables"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{n("variables"===a?"":"variables")}},"Variables"),t.createElement("div",{className:("headers"===a?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{n("headers"===a?"":"headers")}},"Headers"))),t.createElement("section",{className:"graphiql-editor-tool "+(a&&a.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===a?"Variables":"Headers"},t.createElement(A.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==a,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),t.createElement(A.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==a,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly}))))}class o{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,g){this.map.has(e)||(this.length+=1),this.map.set(e,g)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var d=I(4133);function c(){return(0,A.JB)({nonNull:!0}).isFetching?t.createElement(A.$j,null):null}const s={typegraph:"Typegraph",playground:"Playground"};function m(e){let{typegraph:g,query:I,code:a,codeLanguage:l,codeFileUrl:m,headers:u={},variables:p={},tab:b="",noTool:Z=!1,defaultMode:y=null}=e;const{siteConfig:{customFields:{tgUrl:h}}}=(0,n.Z)(),v=(0,t.useMemo)((()=>new o),[]),M=(0,t.useMemo)((()=>(0,i.nq)({url:`${h}/${g}`})),[]),[G,W]=(0,t.useState)(y);return t.createElement("div",{className:"@container miniql"},y?t.createElement("div",{className:"mb-2"},t.createElement(d.r,{name:"mode",choices:s,choice:G,onChange:W})):null,t.createElement(A.j$,{fetcher:M,defaultQuery:I.loc?.source.body.trim(),defaultHeaders:JSON.stringify(u),shouldPersistHeaders:!0,variables:JSON.stringify(p),storage:v},t.createElement("div",{className:`grid ${y?"":"@2xl:grid-cols-2"} gap-2 w-full order-first`},y&&"typegraph"!==G?null:t.createElement("div",{className:" bg-slate-100 rounded-lg relative"},m?t.createElement("div",{className:"absolute p-2 text-xs font-light"},"See/edit full code on"," ",t.createElement("a",{href:`https://github.com/metatypedev/metatype/blob/main/${m}`},m)):null,a?t.createElement(C.Z,{language:l,wrap:!0,className:"pt-7 h-full"},a):null),y&&"playground"!==G?null:t.createElement("div",{className:"flex flex-col graphiql-container"},t.createElement("div",{className:"flex-1 graphiql-session"},t.createElement(r,{defaultTab:b,noTool:Z})),t.createElement("div",{className:"flex-1 graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg"},t.createElement(c,null),t.createElement(A.iB,null))))))}function u(e){return t.createElement(a.Z,{fallback:t.createElement("div",null,"Loading...")},(()=>t.createElement(m,e)))}},7035:(e,g,I)=>{"use strict";I.d(g,{Z:()=>n});var t=I(2564),i=I(2481),a=I(959);function n(e){let{python:g,...I}=e;return a.createElement(i.Z,(0,t.Z)({code:g.content,codeLanguage:"python",codeFileUrl:g.path},I))}},683:e=>{var g={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"create"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"StringValue",value:"john@doe.com",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"read"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"read_user"},arguments:[{kind:"Argument",name:{kind:"Name",value:"where"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"firstname"},value:{kind:"StringValue",value:"",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:223}};g.loc.source={body:'mutation create {\n  create_user(\n    data: {\n      firstname: "" # fill me\n      email: "john@doe.com"\n    }\n  ) {\n    id\n  }\n}\n\nquery read {\n  read_user(\n    where: {\n      firstname: "" # fill me\n    }\n  ) {\n    id\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function I(e,g){if("FragmentSpread"===e.kind)g.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&g.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){I(e,g)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){I(e,g)})),e.definitions&&e.definitions.forEach((function(e){I(e,g)}))}var t={};function i(e,g){for(var I=0;I<e.definitions.length;I++){var t=e.definitions[I];if(t.name&&t.name.value==g)return t}}function a(e,g){var I={kind:e.kind,definitions:[i(e,g)]};e.hasOwnProperty("loc")&&(I.loc=e.loc);var a=t[g]||new Set,n=new Set,C=new Set;for(a.forEach((function(e){C.add(e)}));C.size>0;){var A=C;C=new Set,A.forEach((function(e){n.has(e)||(n.add(e),(t[e]||new Set).forEach((function(e){C.add(e)})))}))}return n.forEach((function(g){var t=i(e,g);t&&I.definitions.push(t)})),I}g.definitions.forEach((function(e){if(e.name){var g=new Set;I(e,g),t[e.name.value]=g}})),e.exports=g,e.exports.create=a(g,"create"),e.exports.read=a(g,"read")},271:(e,g,I)=>{"use strict";I.d(g,{Z:()=>t});const t="data:image/svg+xml;base64,PHN2ZyBob3N0PSI2NWJkNzExNDRlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIyNTFweCIgaGVpZ2h0PSIzMjFweCIgdmlld0JveD0iLTAuNSAtMC41IDI1MSAzMjEiIGNvbnRlbnQ9IiZsdDtteGZpbGUmZ3Q7Jmx0O2RpYWdyYW0gaWQ9JnF1b3Q7dEF4eUpDZUVWUjVvV2UyWDZEYmsmcXVvdDsgbmFtZT0mcXVvdDtQYWdlLTEmcXVvdDsmZ3Q7eFZaTmM1c3dFUDAxUHRiRGgwM2NxKzAwUGRpVHRENmtPY3F3QmsyRXhBaGhUSDk5RjVENEtIWkNPcTV6UXZ1MGk3VHY3VXFhdUt2NDlDQkpFbTFGQUd6aVdNRnA0cTRuam1OYkN3OC9KVklZeExWckpKUTAwRmdMN09odk1JNGF6V2dBYWM5UkNjRVVUZnFnTHpnSFgvVXdJcVhJKzI0SHdmcXJKaVNFQWJEekNSdWl6elJRVVkwdW5Mc1cvdzQwak16S3R2ZTFub21KY2RhWnBCRUpSTjZCM1B1SnU1SkNxSG9VbjFiQVN2WU1MM1hjdHd1enpjWWtjRFVtUU8vNFNGaW1jOVA3VW9WSkZnTE1YWnRjY1B3c0l4VXp0R3djd29tcVh6aTJwbk50dlhSbTFxWG1sakVLWTNBbGl6ckltUnY3cFR2WnhsV1dDUnhtcHhOT1JTWjl2VitkZ1NJeUJPMmw2NjNNcEJPbUdYa0FFUU91Z2c2NlFyOVlVeHMzVnNWSVlFVFJZMTk0b3VzbmJFS2J2ejBKaW50clhjVGhrT0kyT2hyZ29MTm9DMVhLbkZmSk9hT1N4ekM1NVI0SFlUbFlBeGZvc29hRWljTE00bjhiaHlaQ0d1UlpTQmJrMkVsbG1obFhOSWFCK0ZKa1BJQkE4NTlIVk1FdUlSWFZPVFozdnhZdXluTUVxZUEwaG5yWDFZMmhqd2JYTkVyZTlwbHRzS2pUWTU1MVdab2U4Mi9SN04yMitEOVUrNVgxQkJKVlVpQS8waERlc0NGc2QyUkhqQzcvc1J4Nzc1ZnlwbFExcjdWMXJNZWYyM0hsdkFWRlZKRjhmZzNQckg0TnoyWTNyR0dqYklmZzNZL054Rm1kSVV6d1VLeVgxWndGeXA4T21NUGJLU21IZnNFb1VpamQ5L25iMTJSdjlnMUEvTmV3a3VBeFUvZ2IwSGhhMytyMi9FcWsvM1Z3ekwwaDZkNFp6aGZYT0RkdWZHbmUvWWRMMHp5ai91SFd2UG9aMGFqL3hpR3hZaUlMRGd5elFrZTh5VjVCcHVQT2lSMUlMQ3NHYVZvKy9UTHVLeXA0K3ZtbmhuZTdtdy9OOW9sWnYwZmFsN3A3L3djPSZsdDsvZGlhZ3JhbSZndDsmbHQ7L214ZmlsZSZndDsiPgogICAgPGRlZnMvPgogICAgPGc+CiAgICAgICAgPHBhdGggZD0iTSA2MCA2MCBMIDk2LjQ3IDExNC43IiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0ic3Ryb2tlIi8+CiAgICAgICAgPHBhdGggZD0iTSA5OS4zOCAxMTkuMDcgTCA5Mi41OCAxMTUuMTkgTCA5Ni40NyAxMTQuNyBMIDk4LjQxIDExMS4zIFoiIGZpbGw9InJnYigwLCAwLCAwKSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9ImFsbCIvPgogICAgICAgIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMzBweDsgbWFyZ2luLWxlZnQ6IDFweDsiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6IHJnYigwLCAwLCAwKTsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTogaW5saW5lLWJsb2NrOyBmb250LXNpemU6IDEycHg7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGNvbG9yOiByZ2IoMCwgMCwgMCk7IGxpbmUtaGVpZ2h0OiAxLjI7IHBvaW50ZXItZXZlbnRzOiBhbGw7IHdoaXRlLXNwYWNlOiBub3JtYWw7IG92ZXJmbG93LXdyYXA6IG5vcm1hbDsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZW5vIERlcGxveQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFdvcmxkd2lkZSBydW50aW1lCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSI2MCIgeT0iMzQiIGZpbGw9InJnYigwLCAwLCAwKSIgZm9udC1mYW1pbHk9IkhlbHZldGljYSIgZm9udC1zaXplPSIxMnB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4KICAgICAgICAgICAgICAgICAgICBEZW5vIERlcGxveS4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICAgICAgPHBhdGggZD0iTSAxMzAgMTgwIEwgMTMwIDIzMy42MyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgcG9pbnRlci1ldmVudHM9InN0cm9rZSIvPgogICAgICAgIDxwYXRoIGQ9Ik0gMTMwIDIzOC44OCBMIDEyNi41IDIzMS44OCBMIDEzMCAyMzMuNjMgTCAxMzMuNSAyMzEuODggWiIgZmlsbD0icmdiKDAsIDAsIDApIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPHJlY3QgeD0iNzAiIHk9IjEyMCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI2MCIgZmlsbD0icmdiKDI1NSwgMjU1LCAyNTUpIiBzdHJva2U9InJnYigwLCAwLCAwKSIgcG9pbnRlci1ldmVudHM9ImFsbCIvPgogICAgICAgIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0wLjUgLTAuNSkiPgogICAgICAgICAgICA8c3dpdGNoPgogICAgICAgICAgICAgICAgPGZvcmVpZ25PYmplY3QgcG9pbnRlci1ldmVudHM9Im5vbmUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHJlcXVpcmVkRmVhdHVyZXM9Imh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ZlYXR1cmUjRXh0ZW5zaWJpbGl0eSIgc3R5bGU9Im92ZXJmbG93OiB2aXNpYmxlOyB0ZXh0LWFsaWduOiBsZWZ0OyI+CiAgICAgICAgICAgICAgICAgICAgPGRpdiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgc3R5bGU9ImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiB1bnNhZmUgY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IHVuc2FmZSBjZW50ZXI7IHdpZHRoOiAxMThweDsgaGVpZ2h0OiAxcHg7IHBhZGRpbmctdG9wOiAxNTBweDsgbWFyZ2luLWxlZnQ6IDcxcHg7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBkYXRhLWRyYXdpby1jb2xvcnM9ImNvbG9yOiByZ2IoMCwgMCwgMCk7ICIgc3R5bGU9ImJveC1zaXppbmc6IGJvcmRlci1ib3g7IGZvbnQtc2l6ZTogMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgZm9udC1zaXplOiAxMnB4OyBmb250LWZhbWlseTogSGVsdmV0aWNhOyBjb2xvcjogcmdiKDAsIDAsIDApOyBsaW5lLWhlaWdodDogMS4yOyBwb2ludGVyLWV2ZW50czogYWxsOyB3aGl0ZS1zcGFjZTogbm9ybWFsOyBvdmVyZmxvdy13cmFwOiBub3JtYWw7Ij4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Yj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGlnaHR3ZWlnaHQgT1JNCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9iPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWV0YXR5cGUKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjEzMCIgeT0iMTU0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgTGlnaHR3ZWlnaHQgT1JNLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgICAgICA8cGF0aCBkPSJNIDEwMCAyNTUgQyAxMDAgMjQ2LjcyIDExMy40MyAyNDAgMTMwIDI0MCBDIDEzNy45NiAyNDAgMTQ1LjU5IDI0MS41OCAxNTEuMjEgMjQ0LjM5IEMgMTU2Ljg0IDI0Ny4yMSAxNjAgMjUxLjAyIDE2MCAyNTUgTCAxNjAgMzA1IEMgMTYwIDMxMy4yOCAxNDYuNTcgMzIwIDEzMCAzMjAgQyAxMTMuNDMgMzIwIDEwMCAzMTMuMjggMTAwIDMwNSBaIiBmaWxsPSJyZ2IoMjU1LCAyNTUsIDI1NSkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cGF0aCBkPSJNIDE2MCAyNTUgQyAxNjAgMjYzLjI4IDE0Ni41NyAyNzAgMTMwIDI3MCBDIDExMy40MyAyNzAgMTAwIDI2My4yOCAxMDAgMjU1IiBmaWxsPSJub25lIiBzdHJva2U9InJnYigwLCAwLCAwKSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBwb2ludGVyLWV2ZW50cz0iYWxsIi8+CiAgICAgICAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTAuNSAtMC41KSI+CiAgICAgICAgICAgIDxzd2l0Y2g+CiAgICAgICAgICAgICAgICA8Zm9yZWlnbk9iamVjdCBwb2ludGVyLWV2ZW50cz0ibm9uZSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5IiBzdHlsZT0ib3ZlcmZsb3c6IHZpc2libGU7IHRleHQtYWxpZ246IGxlZnQ7Ij4KICAgICAgICAgICAgICAgICAgICA8ZGl2IHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sIiBzdHlsZT0iZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IHVuc2FmZSBjZW50ZXI7IGp1c3RpZnktY29udGVudDogdW5zYWZlIGNlbnRlcjsgd2lkdGg6IDU4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMjkzcHg7IG1hcmdpbi1sZWZ0OiAxMDFweDsiPgogICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGRhdGEtZHJhd2lvLWNvbG9ycz0iY29sb3I6IHJnYigwLCAwLCAwKTsgIiBzdHlsZT0iYm94LXNpemluZzogYm9yZGVyLWJveDsgZm9udC1zaXplOiAwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTogaW5saW5lLWJsb2NrOyBmb250LXNpemU6IDEycHg7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGNvbG9yOiByZ2IoMCwgMCwgMCk7IGxpbmUtaGVpZ2h0OiAxLjI7IHBvaW50ZXItZXZlbnRzOiBhbGw7IHdoaXRlLXNwYWNlOiBub3JtYWw7IG92ZXJmbG93LXdyYXA6IG5vcm1hbDsiPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNRTCwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1vbmdvREIsIGV0Yy4KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD4KICAgICAgICAgICAgICAgIDx0ZXh0IHg9IjEzMCIgeT0iMjk2IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgU1FMLC4uLgogICAgICAgICAgICAgICAgPC90ZXh0PgogICAgICAgICAgICA8L3N3aXRjaD4KICAgICAgICA8L2c+CiAgICAgICAgPHBhdGggZD0iTSAxOTAgNjAgTCAxNjIuODUgMTE0LjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJzdHJva2UiLz4KICAgICAgICA8cGF0aCBkPSJNIDE2MC41IDExOSBMIDE2MC41IDExMS4xNyBMIDE2Mi44NSAxMTQuMyBMIDE2Ni43NiAxMTQuMyBaIiBmaWxsPSJyZ2IoMCwgMCwgMCkiIHN0cm9rZT0icmdiKDAsIDAsIDApIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8cmVjdCB4PSIxMzAiIHk9IjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIGZpbGw9InJnYigyNTUsIDI1NSwgMjU1KSIgc3Ryb2tlPSJyZ2IoMCwgMCwgMCkiIHBvaW50ZXItZXZlbnRzPSJhbGwiLz4KICAgICAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC41IC0wLjUpIj4KICAgICAgICAgICAgPHN3aXRjaD4KICAgICAgICAgICAgICAgIDxmb3JlaWduT2JqZWN0IHBvaW50ZXItZXZlbnRzPSJub25lIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiByZXF1aXJlZEZlYXR1cmVzPSJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0V4dGVuc2liaWxpdHkiIHN0eWxlPSJvdmVyZmxvdzogdmlzaWJsZTsgdGV4dC1hbGlnbjogbGVmdDsiPgogICAgICAgICAgICAgICAgICAgIDxkaXYgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWwiIHN0eWxlPSJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogdW5zYWZlIGNlbnRlcjsganVzdGlmeS1jb250ZW50OiB1bnNhZmUgY2VudGVyOyB3aWR0aDogMTE4cHg7IGhlaWdodDogMXB4OyBwYWRkaW5nLXRvcDogMzBweDsgbWFyZ2luLWxlZnQ6IDEzMXB4OyI+CiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgZGF0YS1kcmF3aW8tY29sb3JzPSJjb2xvcjogcmdiKDAsIDAsIDApOyAiIHN0eWxlPSJib3gtc2l6aW5nOiBib3JkZXItYm94OyBmb250LXNpemU6IDBweDsgdGV4dC1hbGlnbjogY2VudGVyOyI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IGZvbnQtc2l6ZTogMTJweDsgZm9udC1mYW1pbHk6IEhlbHZldGljYTsgY29sb3I6IHJnYigwLCAwLCAwKTsgbGluZS1oZWlnaHQ6IDEuMjsgcG9pbnRlci1ldmVudHM6IGFsbDsgd2hpdGUtc3BhY2U6IG5vcm1hbDsgb3ZlcmZsb3ctd3JhcDogbm9ybWFsOyI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGI+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENsb3VkZmxhcmUgV29ya2VycwogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYj4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNlcnZlcmxlc3MgZnVuY3Rpb25zCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8L2ZvcmVpZ25PYmplY3Q+CiAgICAgICAgICAgICAgICA8dGV4dCB4PSIxOTAiIHk9IjM0IiBmaWxsPSJyZ2IoMCwgMCwgMCkiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+CiAgICAgICAgICAgICAgICAgICAgQ2xvdWRmbGFyZSBXb3JrZXJzLi4uCiAgICAgICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgICAgIDwvc3dpdGNoPgogICAgICAgIDwvZz4KICAgIDwvZz4KICAgIDxzd2l0Y2g+CiAgICAgICAgPGcgcmVxdWlyZWRGZWF0dXJlcz0iaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNFeHRlbnNpYmlsaXR5Ii8+CiAgICAgICAgPGEgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtNSkiIHhsaW5rOmhyZWY9Imh0dHBzOi8vd3d3LmRpYWdyYW1zLm5ldC9kb2MvZmFxL3N2Zy1leHBvcnQtdGV4dC1wcm9ibGVtcyIgdGFyZ2V0PSJfYmxhbmsiPgogICAgICAgICAgICA8dGV4dCB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwcHgiIHg9IjUwJSIgeT0iMTAwJSI+CiAgICAgICAgICAgICAgICBUZXh0IGlzIG5vdCBTVkcgLSBjYW5ub3QgZGlzcGxheQogICAgICAgICAgICA8L3RleHQ+CiAgICAgICAgPC9hPgogICAgPC9zd2l0Y2g+Cjwvc3ZnPgo="},8975:e=>{e.exports={content:'with TypeGraph(\n  "prisma-runtime",\n) as g:\n  public = policies.public()\n  db = PrismaRuntime("legacy", "POSTGRES_CONN")\n\n  user = t.struct(\n    {\n      "id": t.uuid().config("id", "auto"),\n      "email": t.email(),\n      "firstname": t.string().min(2).max(2000),\n    }\n  ).named("user")\n\n  g.expose(\n    create_user=db.create(user),\n    read_user=db.find(user),\n    default_policy=[public],\n  )',path:"website/use-cases/prisma.py"}}}]);