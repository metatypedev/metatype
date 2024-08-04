(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7868],{34801:(e,n,t)=>{"use strict";t.r(n),t.d(n,{assets:()=>h,contentTitle:()=>d,default:()=>p,frontMatter:()=>o,metadata:()=>c,toc:()=>u});var i=t(86070),r=t(25710),s=t(65671),a=t(65480),l=t(27676);const o={},d="GraphQL",c={id:"reference/runtimes/graphql/index",title:"GraphQL",description:"GraphQL runtime",source:"@site/docs/reference/runtimes/graphql/index.mdx",sourceDirName:"reference/runtimes/graphql",slug:"/reference/runtimes/graphql/",permalink:"/docs/reference/runtimes/graphql/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/runtimes/graphql/index.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"Deno/typescript",permalink:"/docs/reference/runtimes/deno/"},next:{title:"HTTP/REST",permalink:"/docs/reference/runtimes/http/"}},h={},u=[{value:"GraphQL runtime",id:"graphql-runtime",level:2}];function m(e){const n={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",li:"li",ol:"ol",p:"p",pre:"pre",ul:"ul",...(0,r.R)(),...e.components};return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n.h1,{id:"graphql",children:"GraphQL"}),"\n",(0,i.jsx)(n.h2,{id:"graphql-runtime",children:"GraphQL runtime"}),"\n",(0,i.jsxs)(n.p,{children:["While you can store users in the same database, it's wiser to avoid data duplication and re-use your service for user management available at ",(0,i.jsx)(n.a,{href:"https://graphqlzero.almansi.me",children:"GraphQLZero"})," endpoint. Let's introduce the ",(0,i.jsx)(n.a,{href:"https://spec.graphql.org/October2021/",children:"GraphQL"})," runtime that allows remote GraphQL queries."]}),"\n",(0,i.jsxs)(n.p,{children:["Update ",(0,i.jsx)(n.code,{children:"typegraph.py"})," with the highlighted lines below:"]}),"\n",(0,i.jsx)(s.A,{typegraph:"graphql",python:t(75833),typescript:t(99487),query:t(80529)}),"\n",(0,i.jsx)(n.p,{children:"Again, a few interesting things happened here:"}),"\n",(0,i.jsxs)(n.ol,{children:["\n",(0,i.jsxs)(n.li,{children:["No migration has been run. The field ",(0,i.jsx)(n.code,{children:"user"})," comes from another runtime and doesn't exist in the database. The typegate will orchestrate the query execution in all runtimes and minimize the work done."]}),"\n",(0,i.jsxs)(n.li,{children:["The ",(0,i.jsx)(n.code,{children:"from_parent"})," rule automatically fills the input type with the parent field named ",(0,i.jsx)(n.code,{children:"uid"}),". The ",(0,i.jsx)(n.code,{children:"g(\xb7)"})," rule allows making named references to another type and avoids circular references."]}),"\n"]}),"\n",(0,i.jsx)(n.p,{children:"Other type enforcement rules also exist:"}),"\n",(0,i.jsxs)(n.ul,{children:["\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"from_secret(key)"})," to fill the input type with the secret in the ",(0,i.jsx)(n.code,{children:"TG_[typegraph name]_[key]"})," format"]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"from_context(\xb7)"})," to fill the input type with content from the request context, such as JSON Web Token (JWT), etc."]}),"\n",(0,i.jsxs)(n.li,{children:[(0,i.jsx)(n.code,{children:"set(x)"})," to fill the input type with content ",(0,i.jsx)(n.code,{children:"x"})]}),"\n",(0,i.jsxs)(n.li,{children:["The Entity which you fetch from the external API should have a matching ",(0,i.jsx)(n.em,{children:"name"})," to that specified in the external API. Taking the above example, you need to specify the name(",(0,i.jsx)(n.em,{children:"User"}),") of the type the external API uses in your entity definition. As you can see, the name ",(0,i.jsx)(n.code,{children:"User"})," is included in the user type declared in the typegraph. This is crucial as the query engine uses this information when making the external GraphQL call."]}),"\n"]}),"\n",(0,i.jsxs)(a.Ay,{children:[(0,i.jsx)(l.A,{value:"python",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-python",children:'user = t.struct(\n    {"id": t.string(), "name": t.string()}, name="User"\n  )\n'})})}),(0,i.jsx)(l.A,{value:"typescript",children:(0,i.jsx)(n.pre,{children:(0,i.jsx)(n.code,{className:"language-typescript",children:'const user = t.struct({ "id": t.string(), "name": t.string() }, {name: "User"});\n'})})})]}),"\n",(0,i.jsx)(n.p,{children:"You should now start to see the power provided by Metatype and might wonder how to integrate it step by step with your existing systems. Writing all those types by hand is tedious and error-prone. The next section will show you how to generate types from existing sources."})]})}function p(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,i.jsx)(n,{...e,children:(0,i.jsx)(m,{...e})}):m(e)}},65480:(e,n,t)=>{"use strict";t.d(n,{Ay:()=>a,gc:()=>l});t(30758);var i=t(3733),r=t(56315),s=t(86070);function a(e){let{children:n}=e;const[t,a]=(0,i.e)();return(0,s.jsx)(r.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:a,children:n})}function l(e){let{children:n}=e;const[t]=(0,i.e)();return(0,s.jsx)(r.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}},80529:e=>{var n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"A"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"users"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}},{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"B"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"create_message"},arguments:[{kind:"Argument",name:{kind:"Name",value:"data"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"title"},value:{kind:"StringValue",value:"Hey",block:!1}},{kind:"ObjectField",name:{kind:"Name",value:"user_id"},value:{kind:"StringValue",value:"1",block:!1}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}}]}},{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"C"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"messages"},arguments:[{kind:"Argument",name:{kind:"Name",value:"take"},value:{kind:"IntValue",value:"2"}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:224}};n.loc.source={body:'query A {\n  users {\n    data {\n      id\n      name\n    }\n  }\n}\n\nmutation B {\n  create_message(data: { title: "Hey", user_id: "1" }) {\n    id\n  }\n}\n\nquery C {\n  messages(take: 2) {\n    title\n    user {\n      name\n    }\n  }\n}\n',name:"GraphQL request",locationOffset:{line:1,column:1}};function t(e,n){if("FragmentSpread"===e.kind)n.add(e.name.value);else if("VariableDefinition"===e.kind){var i=e.type;"NamedType"===i.kind&&n.add(i.name.value)}e.selectionSet&&e.selectionSet.selections.forEach((function(e){t(e,n)})),e.variableDefinitions&&e.variableDefinitions.forEach((function(e){t(e,n)})),e.definitions&&e.definitions.forEach((function(e){t(e,n)}))}var i={};function r(e,n){for(var t=0;t<e.definitions.length;t++){var i=e.definitions[t];if(i.name&&i.name.value==n)return i}}function s(e,n){var t={kind:e.kind,definitions:[r(e,n)]};e.hasOwnProperty("loc")&&(t.loc=e.loc);var s=i[n]||new Set,a=new Set,l=new Set;for(s.forEach((function(e){l.add(e)}));l.size>0;){var o=l;l=new Set,o.forEach((function(e){a.has(e)||(a.add(e),(i[e]||new Set).forEach((function(e){l.add(e)})))}))}return a.forEach((function(n){var i=r(e,n);i&&t.definitions.push(i)})),t}n.definitions.forEach((function(e){if(e.name){var n=new Set;t(e,n),i[e.name.value]=n}})),e.exports=n,e.exports.A=s(n,"A"),e.exports.B=s(n,"B"),e.exports.C=s(n,"C")},75833:e=>{e.exports={content:'# highlight-next-line\nfrom typegraph.runtimes.graphql import GraphQLRuntime\n\n\n@typegraph(\n)\ndef graphql(g: Graph):\n  db = PrismaRuntime("database", "POSTGRES_CONN")\n  # highlight-next-line\n  gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")\n  public = Policy.public()\n\n  # highlight-next-line\n  user = t.struct({"id": t.string(), "name": t.string()}, name="User")\n\n  message = t.struct(\n    {\n      "id": t.integer(as_id=True, config=["auto"]),\n      "title": t.string(),\n      # highlight-next-line\n      "user_id": t.string(name="uid"),\n      # highlight-next-line\n      "user": gql.query(\n        t.struct(\n          {\n            # highlight-next-line\n            "id": t.string(as_id=True).from_parent("uid")\n          }\n        ),\n        t.optional(user),\n      ),\n    },\n    name="message",\n  )\n\n  g.expose(\n    public,\n    create_message=db.create(message),\n    messages=db.find_many(message),\n    # highlight-next-line\n    users=gql.query(t.struct({}), t.struct({"data": t.list(user)})),\n  )',path:"examples/typegraphs/graphql.py"}},99487:e=>{e.exports={content:'// highlight-next-line\nimport { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.ts";\n\nawait typegraph(\n  {\n    name: "graphql",\n  },\n  (g) => {\n    const db = new PrismaRuntime("database", "POSTGRES_CONN");\n    // highlight-next-line\n    const gql = new GraphQLRuntime("https://graphqlzero.almansi.me/api");\n    const pub = Policy.public();\n\n    // highlight-next-line\n    const user = t.struct({ "id": t.string(), "name": t.string() }, { name: "User" });\n\n    const message = t.struct(\n      {\n        id: t.integer({}, { asId: true, config: { auto: true } }),\n        title: t.string(),\n        // highlight-next-line\n        user_id: t.string({}, { name: "uid" }),\n        // highlight-next-line\n        user: gql.query(\n          t.struct({\n            // highlight-next-line\n            id: t.string({}, { asId: true }).fromParent("uid"),\n          }),\n          t.optional(user)\n        ),\n      },\n      { name: "message" }\n    );\n\n    g.expose(\n      {\n        create_message: db.create(message),\n        messages: db.findMany(message),\n        // highlight-next-line\n        users: gql.query(t.struct({}), t.struct({ data: t.list(user) })),\n      },\n      pub\n    );\n  }\n);',path:"examples/typegraphs/graphql.ts"}}}]);