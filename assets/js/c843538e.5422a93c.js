(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[2384],{15404:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>r,default:()=>p,frontMatter:()=>o,metadata:()=>u,toc:()=>l});var a=t(86070),i=t(25710),s=t(65671);const o={},r="Cloud function runner",u={id:"faas-runner/index",title:"Cloud function runner",description:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks.",source:"@site/use-cases/faas-runner/index.mdx",sourceDirName:"faas-runner",slug:"/faas-runner/",permalink:"/use-cases/faas-runner/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/use-cases/faas-runner/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"useCases",previous:{title:"Backend for frontend",permalink:"/use-cases/backend-for-frontend/"},next:{title:"Composable GraphQL server",permalink:"/use-cases/graphql-server/"}},c={},l=[{value:"Case study",id:"case-study",level:2},{value:"Metatype&#39;s solution",id:"metatypes-solution",level:2}];function d(e){const n={h1:"h1",h2:"h2",img:"img",li:"li",ol:"ol",p:"p",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.h1,{id:"cloud-function-runner",children:"Cloud function runner"}),"\n",(0,a.jsx)(n.p,{children:"A Function-as-a-Service (FaaS) runner is a platform that allows developers to deploy and run small, single-purpose functions in the cloud. FaaS runners typically provide a serverless architecture, which means that developers do not have to worry about infrastructure management or the scaling, as the platform automatically handles these tasks."}),"\n",(0,a.jsx)(n.h2,{id:"case-study",children:"Case study"}),"\n",(0,a.jsx)("div",{className:"text-center md:float-right p-8",children:(0,a.jsx)(n.p,{children:(0,a.jsx)(n.img,{src:t(84225).A+""})})}),"\n",(0,a.jsx)(n.p,{children:"For example, imagine you have an e-commerce application that uses FaaS to process orders. When a customer places an order, multiple functions may need to be executed, such as validating the order, processing the payment, and updating the inventory."}),"\n",(0,a.jsx)(n.p,{children:"Each function may be executed independently by the FaaS platform and may take varying amounts of time to complete. Those functions may also be executed for historical reason on different platforms like AWS Lambda, Google Cloud Functions, or Azure Functions."}),"\n",(0,a.jsx)(n.p,{children:"To collect the results of all the functions in a timely manner, you need to ensure that each function is executed in the correct order and that you are not waiting for a slow function to complete before moving on to the next function."}),"\n",(0,a.jsx)(n.h2,{id:"metatypes-solution",children:"Metatype's solution"}),"\n",(0,a.jsx)(n.p,{children:"To solve the use case of executing multiple functions and collecting their results, Metatype provides two key features."}),"\n",(0,a.jsxs)(n.ol,{children:["\n",(0,a.jsxs)(n.li,{children:["\n",(0,a.jsx)(n.p,{children:"Function composition/chaining: functions can be chained together to form a pipeline. The output of one function can be used as the input of the next function in the pipeline. This allows us to execute multiple functions in a specific order."}),"\n"]}),"\n",(0,a.jsxs)(n.li,{children:["\n",(0,a.jsx)(n.p,{children:"Embedded runner: you can easily write a function that glues together multiple functions and executes them in a specific order. This allows you to execute multiple functions in a specific order. Currently, both Python and Typescript are supported."}),"\n"]}),"\n"]}),"\n",(0,a.jsx)(s.A,{typegraph:"faas-runner",python:t(50350),typescript:t(19752),query:t(20256)})]})}function p(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(d,{...e})}):d(e)}},20256:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pycumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]},{kind:"Field",name:{kind:"Name",value:"tscumsum"},arguments:[{kind:"Argument",name:{kind:"Name",value:"n"},value:{kind:"IntValue",value:"5"}}],directives:[]}]}}],loc:{start:0,end:45}};n.loc.source={body:"query {\n  pycumsum(n: 5)\n\n  tscumsum(n: 5)\n}\n",name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var a=e.type;"NamedType"===a.kind&&n.add(a.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var a={};n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),a[e.name.value]=n}})),e.exports=n},84225:(e,n,t)=>{"use strict";t.d(n,{A:()=>a});const a=t.p+"assets/images/image.drawio-1eac40d204b6d3f2e3f634e3bd1b86b1.svg"},50350:e=>{e.exports={content:'@typegraph(\n)\ndef faas_runner(g: Graph):\n  public = Policy.public()\n\n  deno = DenoRuntime()\n  python = PythonRuntime()\n\n  inp = t.struct({"n": t.integer(min=0, max=100)})\n  out = t.integer()\n\n  g.expose(\n    pycumsum=python.from_lambda(inp, out, lambda inp: sum(range(inp["n"]))),\n    tscumsum=deno.func(\n      inp,\n      out,\n      code="({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",\n    ),\n    default_policy=[public],\n  )',path:"examples/typegraphs/faas-runner.py"}},19752:e=>{e.exports={content:'typegraph(\n  {\n    name: "faas-runner",\n  },\n  (g) => {\n    const pub = Policy.public();\n\n    const deno = new DenoRuntime();\n    const python = new PythonRuntime();\n\n    const inp = t.struct({ n: t.integer({ min: 0, max: 100 }) });\n    const out = t.integer();\n\n    g.expose(\n      {\n        pycumsum: python.fromLambda(inp, out, {\n          code: `lambda inp: sum(range(inp[\'n\']))`,\n        }),\n        tscumsum: deno.func(inp, out, {\n          code: "({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",\n        }),\n      },\n      pub\n    );\n  }\n);',path:"examples/typegraphs/faas-runner.ts"}}}]);