"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7456],{1641:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>o,default:()=>p,frontMatter:()=>i,metadata:()=>l,toc:()=>c});var r=a(1163),n=(a(959),a(7942));a(9688);const i={},o="Authentication and authorization provider",l={unversionedId:"authentication-authorization-provider/index",id:"authentication-authorization-provider/index",title:"Authentication and authorization provider",description:"Work in progress.",source:"@site/use-cases/authentication-authorization-provider/index.mdx",sourceDirName:"authentication-authorization-provider",slug:"/authentication-authorization-provider/",permalink:"/use-cases/authentication-authorization-provider/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/authentication-authorization-provider/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"},next:{title:"Automatic CRUD",permalink:"/use-cases/automatic-crud/"}},s={},c=[],d={toc:c},u="wrapper";function p(e){let{components:t,...a}=e;return(0,n.kt)(u,(0,r.Z)({},d,a,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"authentication-and-authorization-provider"},"Authentication and authorization provider"),(0,n.kt)("p",null,"Work in progress."))}p.isMDXComponent=!0},6986:(e,t,a)=>{a.d(t,{Z:()=>h});var r=a(959),n=a(3268),i=a(715),o=a(7114),l=a(9037);const s={container:"container_KHaM",panel:"panel_p8cl",editor:"editor_LjJP",response:"response_Ger1",tool:"tool_nUFu",notool:"notool_i7V8"},c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function d(e){const{queryEditor:t,variableEditor:a,headerEditor:n}=(0,l._i)({nonNull:!0}),[i,o]=(0,r.useState)(e.defaultTab),d=(0,l.Xd)({onCopyQuery:e.onCopyQuery}),u=(0,l.fE)();return(0,r.useEffect)((()=>{a&&c(a)}),[i,a]),(0,r.useEffect)((()=>{n&&c(n)}),[i,n]),(0,r.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("keyMap",t.getOption("extraKeys")),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,r.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",c))}),[a]),(0,r.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),r.createElement("div",{className:"graphiql-editors"},r.createElement("section",{className:"graphiql-query-editor","aria-label":"Query Editor"},r.createElement("div",{className:"graphiql-query-editor-wrapper"},r.createElement(l.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly})),r.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},r.createElement(l._8,null),r.createElement(l.wC,{onClick:()=>u(),label:"Prettify query (Shift-Ctrl-P)"},r.createElement(l.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),r.createElement(l.wC,{onClick:()=>d(),label:"Copy query (Shift-Ctrl-C)"},r.createElement(l.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})))),r.createElement("div",{className:"graphiql-editor-tools"},r.createElement("div",{className:"graphiql-editor-tools-tabs"},r.createElement(l.v0,{type:"button",className:"variables"===i?"active":"",onClick:()=>{o("variables"===i?"":"variables")}},"Variables"),r.createElement(l.v0,{type:"button",className:"headers"===i?"active":"",onClick:()=>{o("headers"===i?"":"headers")}},"Headers"))),r.createElement("section",{className:`graphiql-editor-tool ${i&&i.length>0?s.tool:s.notool}`,"aria-label":"variables"===i?"Variables":"Headers"},r.createElement(l.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==i,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),r.createElement(l.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==i,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}function p(){return(0,l.JB)({nonNull:!0}).isFetching?r.createElement(l.$j,null):null}function h(e){let{typegraph:t,query:a,panel:c=null,headers:h={},variables:m={},tab:E=""}=e;const{siteConfig:{customFields:{tgUrl:g}}}=(0,o.Z)(),y=(0,r.useMemo)((()=>new u),[]);return r.createElement(i.Z,{fallback:r.createElement("div",null,"Loading...")},(()=>{const e=(0,r.useMemo)((()=>(0,n.nq)({url:`${g}/${t}`})),[]);return r.createElement(l.j$,{fetcher:e,defaultQuery:a.loc.source.body.trim(),defaultHeaders:JSON.stringify(h),variables:JSON.stringify(m),storage:y},r.createElement("div",{className:`graphiql-container ${s.container}`},c?r.createElement("div",{className:`graphiql-response ${s.panel}`},c):null,r.createElement("div",{className:`graphiql-session ${s.editor}`},r.createElement(d,{defaultTab:E})),r.createElement("div",{className:`graphiql-response ${s.response}`},r.createElement(p,null),r.createElement(l.iB,null))))}))}},9688:(e,t,a)=>{a.d(t,{Z:()=>l});var r=a(1163),n=a(6986),i=a(9107),o=a(959);function l(e){let{python:t,...a}=e;return o.createElement(n.Z,(0,r.Z)({panel:o.createElement(i.Z,{language:"python"},t)},a))}}}]);