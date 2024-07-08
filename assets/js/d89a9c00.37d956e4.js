(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[5253],{88572:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>h,RM:()=>c});var r=t(86070),o=t(25710),s=t(65671),i=t(65480),a=t(27676);const c=[];function l(e){const n={a:"a",code:"code",p:"p",pre:"pre",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(n.p,{children:["Cross-Origin Resource Sharing (CORS) is a mechanism that allows or denies cross-origin requests in the browser. It prevents websites that you've not explicitly allowed from using your API. Note that it doesn't protect non-browser clients like server side code or a mobile app from using your typegraphs, only browsers implements the CORS mechanism. More details can be found ",(0,r.jsx)(n.a,{href:"https://developer.mozilla.org/en/docs/Web/HTTP/CORS",children:"here"}),"."]}),"\n",(0,r.jsxs)(i.Ay,{children:[(0,r.jsx)(a.A,{value:"typescript",children:(0,r.jsx)(s.A,{typegraph:"cors",typescript:t(30801),query:t(4489)})}),(0,r.jsx)(a.A,{value:"python",children:(0,r.jsx)(s.A,{typegraph:"cors",python:t(77743),query:t(4489)})})]}),"\n",(0,r.jsx)(n.p,{children:"If your browser support well CORS, you should the following error if you try to run the interactive demo."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "errors": [\n    {\n      "message": "NetworkError when attempting to fetch resource.",\n      "stack": ""\n    }\n  ]\n}\n'})}),"\n",(0,r.jsx)(n.p,{children:"Look in the network tab of your browser inspect tools to see the error proper."}),"\n",(0,r.jsx)(n.p,{children:"By the way, there is a hidden cors header in all interactive demos you have met so far:"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-python",children:'# ..\nCors(allow_origin=["https://metatype.dev", "http://localhost:3000"])\n# ..\n'})})]})}function h(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(l,{...e})}):l(e)}},24331:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>a,default:()=>p,frontMatter:()=>i,metadata:()=>c,toc:()=>h});var r=t(86070),o=t(25710),s=t(88572);const i={},a="CORS",c={id:"reference/typegate/cors/index",title:"CORS",description:"",source:"@site/docs/reference/typegate/cors/index.mdx",sourceDirName:"reference/typegate/cors",slug:"/reference/typegate/cors/",permalink:"/docs/reference/typegate/cors/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/cors/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Authentication",permalink:"/docs/reference/typegate/authentication/"},next:{title:"Rate limiting",permalink:"/docs/reference/typegate/rate-limiting/"}},l={},h=[...s.RM];function d(e){const n={h1:"h1",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"cors",children:"CORS"}),"\n",(0,r.jsx)(s.Ay,{})]})}function p(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(d,{...e})}):d(e)}},65480:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>i,gc:()=>a});t(30758);var r=t(30351),o=t(56315),s=t(86070);function i(e){let{children:n}=e;const[t,i]=(0,r.e)();return(0,s.jsx)(o.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:i,children:n})}function a(e){let{children:n}=e;const[t]=(0,r.e)();return(0,s.jsx)(o.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},4489:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"catch_me_if_you_can"},arguments:[],directives:[]}]}}],loc:{start:0,end:75}};n.loc.source={body:"query {\n  catch_me_if_you_can\n  # the results panel should show an error\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var r=e.type;"NamedType"===r.kind&&n.add(r.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var r={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),r[e.name.value]=n}})),e.exports=n},77743:e=>{e.exports={content:'@typegraph(\n  # highlight-start\n  cors=Cors(\n    allow_origin=["https://not-this.domain"],\n    allow_headers=["x-custom-header"],\n    expose_headers=["header-1"],\n    allow_credentials=True,\n    max_age_sec=60,\n  ),\n  # highlight-end\n)\ndef cors(g: Graph):\n  random = RandomRuntime(seed=0, reset=None)\n\n  g.expose(\n    Policy.public(),\n    catch_me_if_you_can=random.gen(t.string()),\n  )',path:"examples/typegraphs/cors.py"}},30801:e=>{e.exports={content:'await typegraph(\n  {\n    name: "cors",\n    // highlight-start\n    cors: {\n      allowOrigin: ["https://not-this.domain"],\n      allowHeaders: ["x-custom-header"],\n      exposeHeaders: ["header-1"],\n      allowCredentials: true,\n      maxAgeSec: 60,\n    },\n    // highlight-end\n  },\n  (g) => {\n    const random = new RandomRuntime({ seed: 0 });\n\n    g.expose(\n      {\n        catch_me_if_you_can: random.gen(t.string()),\n      },\n      Policy.public()\n    );\n  }\n);',path:"examples/typegraphs/cors.ts"}}}]);