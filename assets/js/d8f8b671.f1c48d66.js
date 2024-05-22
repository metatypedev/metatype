(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[8349],{74174:(e,n,i)=>{"use strict";i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>o,default:()=>u,frontMatter:()=>l,metadata:()=>s,toc:()=>d});var t=i(13274),r=i(99128),a=i(11640);const l={},o="Rate limiting",s={id:"reference/typegate/rate-limiting/index",title:"Rate limiting",description:"The rate limiting algorithm works as follows:",source:"@site/docs/reference/typegate/rate-limiting/index.mdx",sourceDirName:"reference/typegate/rate-limiting",slug:"/reference/typegate/rate-limiting/",permalink:"/docs/reference/typegate/rate-limiting/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/typegate/rate-limiting/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"CORS",permalink:"/docs/reference/typegate/cors/"},next:{title:"Synchronization",permalink:"/docs/reference/typegate/synchronization/"}},c={},d=[];function h(e){const n={code:"code",h1:"h1",li:"li",p:"p",ul:"ul",...(0,r.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h1,{id:"rate-limiting",children:"Rate limiting"}),"\n",(0,t.jsx)(n.p,{children:"The rate limiting algorithm works as follows:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["each function type can either count the # of calls it gets or the # of results returned ",(0,t.jsx)(n.code,{children:"rate_calls=False"})]}),"\n",(0,t.jsxs)(n.li,{children:["each function type can have a weight ",(0,t.jsx)(n.code,{children:"rate_weight=1"})]}),"\n",(0,t.jsxs)(n.li,{children:["each request is identified by its IP or by one value of its context if set ",(0,t.jsx)(n.code,{children:"context_identifier"})]}),"\n",(0,t.jsxs)(n.li,{children:["a single query can score a maximum of ",(0,t.jsx)(n.code,{children:"query_limit"})]}),"\n",(0,t.jsxs)(n.li,{children:["multiple queries can sum up to ",(0,t.jsx)(n.code,{children:"window_limit"})," in a ",(0,t.jsx)(n.code,{children:"window_sec"})," window"]}),"\n",(0,t.jsxs)(n.li,{children:["when there is multiple typegates (",(0,t.jsx)(n.code,{children:"N"}),"), you can improve performance by avoiding score synchronizing while the typegate has not reached ",(0,t.jsx)(n.code,{children:"local_excess"}),": the real maximum score is thus ",(0,t.jsx)(n.code,{children:"window_limit + min(local_excess, query_limit) * N"})]}),"\n"]}),"\n",(0,t.jsx)(a.A,{typegraph:"rate",python:i(60644),typescript:i(37618),query:i(81921)}),"\n",(0,t.jsx)(n.p,{children:"Playing with the above should allow you to quickly hit the limits."})]})}function u(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(h,{...e})}):h(e)}},11640:(e,n,i)=>{"use strict";i.d(n,{A:()=>a});var t=i(76297),r=(i(79474),i(13274));function a(e){let{python:n,typescript:i,...a}=e;const l=[n&&{content:n.content,codeLanguage:"python",codeFileUrl:n.path},i&&{content:i.content,codeLanguage:"typescript",codeFileUrl:i.path}].filter((e=>!!e));return(0,r.jsx)(t.A,{code:0==l.length?void 0:l,...a})}},81921:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"lightweight_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"medium_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"heavy_call"},arguments:[],directives:[]}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"D"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"by_result_count"},arguments:[],directives:[]}]}}],loc:{start:0,end:115}};n.loc.source={body:"query A {\n  lightweight_call\n}\n\nquery B {\n  medium_call\n}\n\nquery C {\n  heavy_call\n}\n\nquery D {\n  by_result_count\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function i(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var t=e.type;"NamedType"===t.kind&&n.add(t.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){i(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){i(e,n)})),e.definitions&&e.definitions.forEach((function(e){i(e,n)}))}var t={};function r(e,n){for(var i=0;i<e.definitions.length;i++){var t=e.definitions[i];if(t.name&&t.name.value==n)return t}}function a(e,n){var i={kind:e.kind,definitions:[r(e,n)]};e.hasOwnProperty("loc")&&(i.loc=e.loc);var a=t[n]||new Set,l=new Set,o=new Set;for(a.forEach((function(e){o.add(e)}));o.size>0;){var s=o;o=new Set,s.forEach((function(e){l.has(e)||(l.add(e),(t[e]||new Set).forEach((function(e){o.add(e)})))}))}return l.forEach((function(n){var t=r(e,n);t&&i.definitions.push(t)})),i}n.definitions.forEach((function(e){if(e.name){var n=new Set;i(e,n),t[e.name.value]=n}})),e.exports=n,e.exports.A=a(n,"A"),e.exports.B=a(n,"B"),e.exports.C=a(n,"C"),e.exports.D=a(n,"D")},60644:e=>{e.exports={content:'@typegraph(\n  # highlight-next-line\n  rate=Rate(\n    # highlight-next-line\n    window_limit=35,\n    # highlight-next-line\n    window_sec=15,\n    # highlight-next-line\n    query_limit=25,\n    # highlight-next-line\n    context_identifier=None,\n    # highlight-next-line\n    local_excess=0,\n    # highlight-next-line\n  ),\n    allow_origin=["https://metatype.dev", "http://localhost:3000"]\n  ),\n)\ndef rate(g: Graph):\n  random = RandomRuntime(seed=0, reset=None)\n  public = Policy.public()\n\n  g.expose(\n    public,\n    lightweight_call=random.gen(t.string()).rate(\n      calls=True, weight=1\n    ),\n    medium_call=random.gen(t.string()).rate(calls=True, weight=5),\n    heavy_call=random.gen(t.string()).rate(calls=True, weight=15),\n    by_result_count=random.gen(\n      t.list(t.string()),\n    ).rate(\n      calls=False, weight=2\n    ),  # increment by # of results returned\n  )',path:"examples/typegraphs/rate.py"}},37618:e=>{e.exports={content:'typegraph({\n  name: "rate",\n  // highlight-next-line\n  rate: {\n    // highlight-next-line\n    windowLimit: 35,\n    // highlight-next-line\n    windowSec: 15,\n    // highlight-next-line\n    queryLimit: 25,\n    // highlight-next-line\n    contextIdentifier: undefined,\n    // highlight-next-line\n    localExcess: 0,\n    // highlight-next-line\n  },\n}, (g) => {\n  const random = new RandomRuntime({ seed: 0 });\n  const pub = Policy.public();\n\n  g.expose({\n    lightweight_call: random.gen(t.string()).rate({ calls: true, weight: 1 }),\n    medium_call: random.gen(t.string()).rate({ calls: true, weight: 5 }),\n    heavy_call: random.gen(t.string()).rate({ calls: true, weight: 15 }),\n    by_result_count: random.gen(\n      t.list(t.string()),\n    ).rate({ calls: false, weight: 2 }), // increment by # of results returned\n  }, pub);\n});',path:"examples/typegraphs/rate.ts"}}}]);