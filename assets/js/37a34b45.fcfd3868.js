(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9238],{6986:(e,t,n)=>{"use strict";n.d(t,{Z:()=>m});var a=n(959),i=n(3268),r=n(715),o=n(7114),s=n(9037);const l={container:"container_KHaM",panel:"panel_p8cl",editor:"editor_LjJP",response:"response_Ger1",tool:"tool_nUFu",notool:"notool_i7V8"},c=e=>{e.getWrapperElement().closest(".graphiql-editor").style.height=`${e.doc.height}px`};function p(e){const{queryEditor:t,variableEditor:n,headerEditor:i}=(0,s._i)({nonNull:!0}),[r,o]=(0,a.useState)(e.defaultTab),p=(0,s.Xd)({onCopyQuery:e.onCopyQuery}),d=(0,s.fE)();return(0,a.useEffect)((()=>{n&&c(n)}),[r,n]),(0,a.useEffect)((()=>{i&&c(i)}),[r,i]),(0,a.useEffect)((()=>{t&&(t.setOption("lineNumbers",!1),t.setOption("keyMap",t.getOption("extraKeys")),t.setOption("gutters",[]),t.on("change",c),c(t))}),[t]),(0,a.useEffect)((()=>{n&&(n.setOption("lineNumbers",!1),n.setOption("gutters",[]),n.on("change",c))}),[n]),(0,a.useEffect)((()=>{i&&(i.setOption("lineNumbers",!1),i.setOption("gutters",[]),i.on("change",c))}),[i]),a.createElement("div",{className:"graphiql-editors"},a.createElement("section",{className:"graphiql-query-editor","aria-label":"Query Editor"},a.createElement("div",{className:"graphiql-query-editor-wrapper"},a.createElement(s.WK,{editorTheme:e.editorTheme,keyMap:e.keyMap,onCopyQuery:e.onCopyQuery,onEdit:e.onEditQuery,readOnly:e.readOnly})),a.createElement("div",{className:"graphiql-toolbar",role:"toolbar","aria-label":"Editor Commands"},a.createElement(s._8,null),a.createElement(s.wC,{onClick:()=>d(),label:"Prettify query (Shift-Ctrl-P)"},a.createElement(s.Kt,{className:"graphiql-toolbar-icon","aria-hidden":"true"})),a.createElement(s.wC,{onClick:()=>p(),label:"Copy query (Shift-Ctrl-C)"},a.createElement(s.TI,{className:"graphiql-toolbar-icon","aria-hidden":"true"})))),a.createElement("div",{className:"graphiql-editor-tools"},a.createElement("div",{className:"graphiql-editor-tools-tabs"},a.createElement(s.v0,{type:"button",className:"variables"===r?"active":"",onClick:()=>{o("variables"===r?"":"variables")}},"Variables"),a.createElement(s.v0,{type:"button",className:"headers"===r?"active":"",onClick:()=>{o("headers"===r?"":"headers")}},"Headers"))),a.createElement("section",{className:`graphiql-editor-tool ${r&&r.length>0?l.tool:l.notool}`,"aria-label":"variables"===r?"Variables":"Headers"},a.createElement(s.hF,{editorTheme:e.editorTheme,isHidden:"variables"!==r,keyMap:e.keyMap,onEdit:e.onEditVariables,readOnly:e.readOnly}),a.createElement(s.LA,{editorTheme:e.editorTheme,isHidden:"headers"!==r,keyMap:e.keyMap,onEdit:e.onEditHeaders,readOnly:e.readOnly})))}class d{constructor(){this.map=new Map,this.length=0}getItem(e){return this.map.get(e)}setItem(e,t){this.map.has(e)||(this.length+=1),this.map.set(e,t)}removeItem(e){this.map.has(e)&&(this.length-=1),this.map.delete(e)}clear(){this.length=0,this.map.clear()}}function u(){return(0,s.JB)({nonNull:!0}).isFetching?a.createElement(s.$j,null):null}function m(e){let{typegraph:t,query:n,panel:c=null,headers:m={},variables:h={},tab:g=""}=e;const{siteConfig:{customFields:{tgUrl:y}}}=(0,o.Z)(),f=(0,a.useMemo)((()=>new d),[]);return a.createElement(r.Z,{fallback:a.createElement("div",null,"Loading...")},(()=>{const e=(0,a.useMemo)((()=>(0,i.nq)({url:`${y}/${t}`})),[]);return a.createElement(s.j$,{fetcher:e,defaultQuery:n.loc.source.body.trim(),defaultHeaders:JSON.stringify(m),variables:JSON.stringify(h),storage:f},a.createElement("div",{className:`graphiql-container ${l.container}`},c?a.createElement("div",{className:`graphiql-response ${l.panel}`},c):null,a.createElement("div",{className:`graphiql-session ${l.editor}`},a.createElement(p,{defaultTab:g})),a.createElement("div",{className:`graphiql-response ${l.response}`},a.createElement(u,null),a.createElement(s.iB,null))))}))}},9688:(e,t,n)=>{"use strict";n.d(t,{Z:()=>s});var a=n(1163),i=n(6986),r=n(9107),o=n(959);function s(e){let{python:t,...n}=e;return o.createElement(i.Z,(0,a.Z)({panel:o.createElement(r.Z,{language:"python"},t)},n))}},333:(e,t,n)=>{"use strict";n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>l,default:()=>h,frontMatter:()=>s,metadata:()=>c,toc:()=>d});var a=n(1163),i=(n(959),n(7942)),r=n(9107),o=n(9688);const s={sidebar_position:7},l="Your chat app",c={unversionedId:"tutorials/your-chat-app/index",id:"tutorials/your-chat-app/index",title:"Your chat app",description:"Back to your typegraph for the chat-based app. You learn all keys components and it's time to implement the business logic.",source:"@site/docs/tutorials/your-chat-app/index.mdx",sourceDirName:"tutorials/your-chat-app",slug:"/tutorials/your-chat-app/",permalink:"/docs/tutorials/your-chat-app/",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/tutorials/your-chat-app/index.mdx",tags:[],version:"current",sidebarPosition:7,frontMatter:{sidebar_position:7},sidebar:"docs",previous:{title:"Policies and materializers",permalink:"/docs/tutorials/policies-and-materializers/"},next:{title:"How-to contribute",permalink:"/docs/guides/contribute"}},p={},d=[{value:"External typescript function",id:"external-typescript-function",level:2},{value:"Connecting the pieces together",id:"connecting-the-pieces-together",level:2}],u={toc:d},m="wrapper";function h(e){let{components:t,...s}=e;return(0,i.kt)(m,(0,a.Z)({},u,s,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"your-chat-app"},"Your chat app"),(0,i.kt)("p",null,"Back to your typegraph for the chat-based app. You learn all keys components and it's time to implement the business logic."),(0,i.kt)("h2",{id:"external-typescript-function"},"External typescript function"),(0,i.kt)("p",null,"The Deno runtime can register external files for longer functions. You can use the meta CLI to generate the types once the ",(0,i.kt)("inlineCode",{parentName:"p"},"ModuleMat")," has been defined in your typegraph: ",(0,i.kt)("inlineCode",{parentName:"p"},"meta codegen deno -f typegraph.py"),"."),(0,i.kt)(r.Z,{language:"typescript",mdxType:"CodeBlock"},n(6021)),(0,i.kt)("h2",{id:"connecting-the-pieces-together"},"Connecting the pieces together"),(0,i.kt)("p",null,"Take the learning of the last sections and use at your advantage the internal policies allowing to made calls within the Deno runtime and keeping the same context."),(0,i.kt)(o.Z,{typegraph:"business-logic",python:n(2942),query:n(3058),mdxType:"TGExample"}),(0,i.kt)("p",null,"That's it, you just developed chat-based API block for your app - naive for sure, but covering most of the feature of Metatype."))}h.isMDXComponent=!0},3058:e=>{var t={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"your_turn"},arguments:[],directives:[]}]}}],loc:{start:0,end:22}};t.loc.source={body:"query {\n  your_turn\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function n(e,t){if("FragmentSpread"===e.kind)t.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&t.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){n(e,t)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){n(e,t)})),e.definitions&&e.definitions.forEach((function(e){n(e,t)}))}var a={};t.definitions.forEach((function(e){if(e.name){var t=new Set;n(e,t),a[e.name.value]=t}})),e.exports=t},2942:e=>{e.exports='with TypeGraph(\n  "business-logic",\n  cors=TypeGraph.Cors(\n    allow_origin=["https://metatype.dev", "http://localhost:3000"],\n    allow_headers=["authorization"],\n  ),\n  auths=[\n    github_auth,\n  ],\n) as g:\n  db = PrismaRuntime("database", "POSTGRES_CONN")\n  gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")\n  googleapi = import_googleapi()\n\n  public = policies.public()\n  gh_user = policies.jwt("user", "type")\n  # highlight-next-line\n  internal = policies.internal()\n\n  user = t.struct({"id": t.integer(), "name": t.string()})\n\n  message = t.struct(\n    {\n      "id": t.integer().config("id", "auto"),\n      "title": t.string(),\n      "user_id": t.integer().named("uid"),\n      "user": gql.query(  # 1\n        t.struct({"id": t.integer().from_parent(g("uid"))}),  # 2\n        t.optional(user),\n      ),\n    }\n  ).named("message")\n\n  # highlight-start\n  g.expose(\n    list_messages=db.find_many(message),\n    emit_new_message=t.func(\n      t.struct({"title": t.string()}), t.boolean(), ModuleMat("business-logic.ts")\n    ),\n    default_policy=[gh_user],\n  )\n  # highlight-end\n\n  g.expose(\n    create_message=db.insert_one(message),\n    send_notification=googleapi.functions["projectsMessagesSend"],\n    list_users=gql.query(t.struct({}), t.struct({"data": t.array(user)})),\n    default_policy=[internal],\n  )'},6021:e=>{e.exports='import * as emoji from "https://deno.land/x/emoji@0.2.1/mod.ts";\n\ninterface ISend {\n  title: string;\n}\n\nexport default async function (\n  { title }: ISend,\n  { self, context },\n): Promise<boolean> {\n  const text = `New message: ${title} from ${context.user.name} ${\n    emoji("coffee")\n  }`;\n\n  const message = await fetch(\n    self,\n    {\n      method: "POST",\n      headers: {\n        accept: "application/json",\n        "content-type": "application/json",\n        "x-metatype-key": self, // forward internal key\n      },\n      body: JSON.stringify({\n        query: `\n            mutation db($title: String!, $user_id: Int!) {\n                create_message(data: {title: $title, user_id: $user_id}) {\n            }\n            `,\n        variables: { title: text, user_id: context.user.id },\n      }),\n    },\n  ).then((r) => r.json());\n\n  console.log(`created message ${message.data.db.create_message.id}`);\n\n  const notif = await fetch(\n    self,\n    {\n      method: "POST",\n      headers: {\n        accept: "application/json",\n        "content-type": "application/json",\n        "x-typegate-key": self,\n      },\n      body: JSON.stringify({\n        query: `\n            mutation fcm {\n                send_notification\n            }\n            `,\n        variables: {},\n      }),\n    },\n  ).then((r) => r.json());\n\n  console.log(`created notif ${notif.data.fcm.send_notification}`);\n  return true;\n}'}}]);