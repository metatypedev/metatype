(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[6334],{39053:(e,i,n)=>{"use strict";n.r(i),n.d(i,{assets:()=>c,contentTitle:()=>s,default:()=>u,frontMatter:()=>l,metadata:()=>o,toc:()=>d});var t=n(11527),a=n(63883),r=n(3643);const l={},s="Rate limiting",o={id:"reference/typegate/rate-limiting/index",title:"Rate limiting",description:"The rate limiting algorithm works as follows:",source:"@site/docs/reference/typegate/rate-limiting/index.mdx",sourceDirName:"reference/typegate/rate-limiting",slug:"/reference/typegate/rate-limiting/",permalink:"/docs/reference/typegate/rate-limiting/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/rate-limiting/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"CORS",permalink:"/docs/reference/typegate/cors/"},next:{title:"Meta CLI",permalink:"/docs/reference/meta-cli/"}},c={},d=[];function h(e){const i={code:"code",h1:"h1",li:"li",p:"p",ul:"ul",...(0,a.a)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(i.h1,{id:"rate-limiting",children:"Rate limiting"}),"\n",(0,t.jsx)(i.p,{children:"The rate limiting algorithm works as follows:"}),"\n",(0,t.jsxs)(i.ul,{children:["\n",(0,t.jsxs)(i.li,{children:["each function type can either count the # of calls it gets or the # of results returned ",(0,t.jsx)(i.code,{children:"rate_calls=False"})]}),"\n",(0,t.jsxs)(i.li,{children:["each function type can have a weight ",(0,t.jsx)(i.code,{children:"rate_weight=1"})]}),"\n",(0,t.jsxs)(i.li,{children:["each request is identified by its IP or by one value of its context if set ",(0,t.jsx)(i.code,{children:"context_identifier"})]}),"\n",(0,t.jsxs)(i.li,{children:["a single query can score a maximum of ",(0,t.jsx)(i.code,{children:"query_limit"})]}),"\n",(0,t.jsxs)(i.li,{children:["multiple queries can sum up to ",(0,t.jsx)(i.code,{children:"window_limit"})," in a ",(0,t.jsx)(i.code,{children:"window_sec"})," window"]}),"\n",(0,t.jsxs)(i.li,{children:["when there is multiple typegates (",(0,t.jsx)(i.code,{children:"N"}),"), you can improve performance by avoiding score synchronizing while the typegate has not reached ",(0,t.jsx)(i.code,{children:"local_excess"}),": the real maximum score is thus ",(0,t.jsx)(i.code,{children:"window_limit + min(local_excess, query_limit) * N"})]}),"\n"]}),"\n",(0,t.jsx)(r.Z,{typegraph:"rate",python:n(51930),query:n(61269)}),"\n",(0,t.jsx)(i.p,{children:"Playing with the above should allow you to quickly hit the limits."})]})}function u(e={}){const{wrapper:i}={...(0,a.a)(),...e.components};return i?(0,t.jsx)(i,{...e,children:(0,t.jsx)(h,{...e})}):h(e)}},46153:(e,i,n)=>{"use strict";n.d(i,{r:()=>a});n(50959);var t=n(11527);function a(e){let{name:i,choices:n,choice:a,onChange:r,className:l}=e;return(0,t.jsx)("ul",{className:`pl-0 m-0 list-none w-full ${l??""}`,children:Object.entries(n).map((e=>{let[n,l]=e;return(0,t.jsx)("li",{className:"inline-block rounded-md overflow-clip mr-1",children:(0,t.jsx)("div",{children:(0,t.jsxs)("label",{className:"cursor-pointer",children:[(0,t.jsx)("input",{type:"radio",name:i,value:n,checked:n===a,onChange:()=>r(n),className:"hidden peer"}),(0,t.jsx)("div",{className:"px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white",children:l})]})})},n)}))})}},48893:(e,i,n)=>{"use strict";n.d(i,{Z:()=>x});var t=n(50959),a=n(52691),r=n(45197),l=n(14899),s=n(86117),o=n(33961),c=n(11527);const d=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function h(e){const{queryEditor:i,variableEditor:n,headerEditor:a}=(0,o._i)({nonNull:!0}),[r,l]=(0,t.useState)(e.defaultTab),s=(0,o.Xd)({onCopyQuery:e.onCopyQuery}),h=(0,o.fE)();return(0,t.useEffect)((()=>{n&&d(n)}),[r,n]),(0,t.useEffect)((()=>{a&&d(a)}),[r,a]),(0,t.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("extraKeys",{"Alt-G":()=>{i.replaceSelection("@")}}),i.setOption("gutters",[]),i.on("change",d),d(i))}),[i]),(0,t.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",d))}),[n]),(0,t.useEffect)((()=>{a&&(a.setOption("lineNumbers",!1),a.setOption("gutters",[]),a.on("change",d))}),[a]),(0,c.jsx)(o.u.Provider,{children:(0,c.jsxs)("div",{className:"graphiql-editors",children:[(0,c.jsx)("section",{className:"graphiql-query-editor shadow-sm","aria-label":"Query Editor",children:(0,c.jsxs)("div",{className:"graphiql-query-editor-wrapper",children:[(0,c.jsx)(o.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly}),(0,c.jsxs)("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands",children:[(0,c.jsx)(o._8,{}),(0,c.jsx)(o.wC,{onClick:()=>h(),label:"Prettify query (Shift-Ctrl-P)",children:(0,c.jsx)(o.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})}),(0,c.jsx)(o.wC,{onClick:()=>s(),label:"Copy query (Shift-Ctrl-C)",children:(0,c.jsx)(o.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})})]})]})}),e.noTool?null:(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)("div",{className:"graphiql-editor-tools p-0 text-sm ",children:(0,c.jsxs)("div",{className:"graphiql-editor-tools-tabs",children:[(0,c.jsx)("div",{className:("variables"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("variables"===r?"":"variables")},children:"Variables"}),(0,c.jsx)("div",{className:("headers"===r?"text-slate-800":"")+" p-2 hover:text-slate-800 cursor-pointer",onClick:()=>{l("headers"===r?"":"headers")},children:"Headers"})]})}),(0,c.jsxs)("section",{className:"graphiql-editor-tool "+(r&&r.length>0?"pt-0":"hidden p-0"),"aria-label":"variables"===r?"Variables":"Headers",children:[(0,c.jsx)(o.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),(0,c.jsx)(o.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})]})]})]})})}class u{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,i){this.map.has(e)||(this.length+=1),this.map.set(e,i)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}var m=n(46153);function p(){return(0,o.JB)({nonNull:!0}).isFetching?(0,c.jsx)(o.$j,{}):null}const g={typegraph:"Typegraph",playground:"Playground"};function f(e){let{typegraph:i,query:n,code:r,codeLanguage:d,codeFileUrl:f,headers:x={},variables:y={},tab:v="",noTool:b=!1,defaultMode:j=null}=e;const{siteConfig:{customFields:{tgUrl:w}}}=(0,l.Z)(),k=(0,t.useMemo)((()=>new u),[]),N=(0,t.useMemo)((()=>(0,a.nq)({url:`${w}/${i}`})),[]),[q,_]=(0,t.useState)(j);return(0,c.jsxs)("div",{className:"@container miniql mb-5",children:[j?(0,c.jsx)(m.r,{name:"mode",choices:g,choice:q,onChange:_,className:"mb-2"}):null,(0,c.jsx)(o.j$,{fetcher:N,defaultQuery:n.loc?.source.body.trim(),defaultHeaders:JSON.stringify(x),shouldPersistHeaders:!0,variables:JSON.stringify(y),storage:k,children:(0,c.jsxs)("div",{className:(j?"":"md:grid @2xl:grid-cols-2")+" gap-2 w-full order-first",children:[j&&"typegraph"!==q?null:(0,c.jsxs)("div",{className:" bg-slate-100 rounded-lg flex flex-col mb-2 md:mb-0",children:[f?(0,c.jsxs)("div",{className:"p-2 text-xs font-light",children:["See/edit full code on"," ",(0,c.jsx)("a",{href:`https://github.com/metatypedev/metatype/blob/main/${f}`,children:f})]}):null,r?(0,c.jsx)(s.Z,{language:d,wrap:!0,className:"flex-1",children:r}):null]}),j&&"playground"!==q?null:(0,c.jsxs)("div",{className:"flex flex-col graphiql-container",children:[(0,c.jsx)("div",{className:"flex-1 graphiql-session",children:(0,c.jsx)(h,{defaultTab:v,noTool:b})}),(0,c.jsxs)("div",{className:"flex-auto graphiql-response min-h-[200px] p-2 mt-2 bg-slate-100 rounded-lg",children:[(0,c.jsx)(p,{}),(0,c.jsx)(o.iB,{})]})]})]})})]})}function x(e){return(0,c.jsx)(r.Z,{fallback:(0,c.jsx)("div",{children:"Loading..."}),children:()=>(0,c.jsx)(f,{...e})})}},3643:(e,i,n)=>{"use strict";n.d(i,{Z:()=>r});var t=n(48893),a=(n(50959),n(11527));function r(e){let{python:i,...n}=e;return(0,a.jsx)(t.Z,{code:i.content,codeLanguage:"python",codeFileUrl:i.path,...n})}},61269:e=>{var i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"lightweight_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"medium_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"heavy_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"by_result_count"},arguments:[],directives:[]}]}}],loc:{start:0,end:115}};i.loc.source={body:"query A {\n  lightweight_call\n}\n\nquery B {\n  medium_call\n}\n\nquery C {\n  heavy_call\n}\n\nquery D {\n  by_result_count\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,i){if("FragmentSpread"===e.kind)i.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&i.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,i)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,i)})),e.definitions&&e.definitions.forEach((function(e){n(e,i)}))}var t={};function a(e,i){for(var n=0;n<e.definitions.length;n++){var t=e.definitions[n];if(t.name&&t.name.value==i)return t}}function r(e,i){var n={kind:e.kind,definitions:[a(e,i)]};e.hasOwnProperty("loc")&&(n.loc=e.loc);var r=t[i]||new Set,l=new Set,s=new Set;for(r.forEach((function(e){s.add(e)}));s.size>0;){var o=s;s=new Set,o.forEach((function(e){l.has(e)||(l.add(e),(t[e]||new Set).forEach((function(e){s.add(e)})))}))}return l.forEach((function(i){var t=a(e,i);t&&n.definitions.push(t)})),n}i.definitions.forEach((function(e){if(e.name){var i=new Set;n(e,i),t[e.name.value]=i}})),e.exports=i,e.exports.A=r(i,"A"),e.exports.B=r(i,"B"),e.exports.C=r(i,"C"),e.exports.D=r(i,"D")},51930:e=>{e.exports={content:'@typegraph(\n  # highlight-next-line\n  rate=Rate(\n    # highlight-next-line\n    window_limit=35,\n    # highlight-next-line\n    window_sec=15,\n    # highlight-next-line\n    query_limit=25,\n    # highlight-next-line\n    context_identifier=None,\n    # highlight-next-line\n    local_excess=0,\n    # highlight-next-line\n  ),\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef rate(g: Graph):\n  random = RandomRuntime(seed=0)\n  public = Policy.public()\n\n  g.expose(\n    public,\n    lightweight_call=random.gen(t.string()).rate(\n      calls=True, weight=1\n    ),\n    medium_call=random.gen(t.string()).rate(calls=True, weight=5),\n    heavy_call=random.gen(t.string()).rate(calls=True, weight=15),\n    by_result_count=random.gen(\n      t.list(t.string()),\n    ).rate(\n      calls=False, weight=2\n    ),  # increment by # of results returned\n  )',path:"website/docs/reference/typegate/rate-limiting/rate.py"}}}]);