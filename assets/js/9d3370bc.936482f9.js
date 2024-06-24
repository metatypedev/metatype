"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9594],{40042:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>o,contentTitle:()=>h,default:()=>p,frontMatter:()=>c,metadata:()=>a,toc:()=>x});var s=t(86070),i=t(25710),r=t(92465),d=t(43236),l=t(51510);const c={sidebar_position:1},h="Types",a={id:"reference/types/index",title:"Types",description:"Overview",source:"@site/docs/reference/types/index.mdx",sourceDirName:"reference/types",slug:"/reference/types/",permalink:"/docs/reference/types/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/types/index.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"docs",previous:{title:"Programmatic deployment",permalink:"/docs/guides/programmatic-deployment/"},next:{title:"Functions",permalink:"/docs/reference/types/functions"}},o={},x=[{value:"Overview",id:"overview",level:2},{value:"Scalar types",id:"scalar-types",level:3},{value:"Non-scalar types",id:"non-scalar-types",level:3},{value:"Type constraints",id:"type-constraints",level:3},{value:"Names and type references",id:"names-and-type-references",level:3},{value:"Injection",id:"injection",level:3},{value:"Types",id:"types-1",level:2},{value:"<code>t.boolean()</code>",id:"tboolean",level:3},{value:"<code>t.integer()</code>",id:"tinteger",level:3},{value:"Constraints",id:"constraints",level:4},{value:"Examples",id:"examples",level:4},{value:"<code>t.float()</code>",id:"tfloat",level:3},{value:"Constraints",id:"constraints-1",level:4},{value:"<code>t.string()</code>",id:"tstring",level:3},{value:"Constraints",id:"constraints-2",level:4},{value:"Supported formats",id:"supported-formats",level:5},{value:"Examples",id:"examples-1",level:4},{value:"Aliases",id:"tstring-aliases",level:4},{value:"<code>t.file()</code>",id:"tfile",level:3},{value:"Type Constraints",id:"type-constraints-1",level:4},{value:"Examples",id:"examples-2",level:4},{value:"<code>t.optional()</code>",id:"toptional",level:3},{value:"Default value",id:"default-value",level:4},{value:"<code>t.list()</code>",id:"tlist",level:3},{value:"Constraints",id:"constraints-3",level:4},{value:"Examples",id:"examples-3",level:4},{value:"<code>t.struct()</code>",id:"tstruct",level:3},{value:"Constraints",id:"constraints-4",level:4},{value:"Examples",id:"examples-4",level:4},{value:"<code>t.union()</code> and <code>t.either()</code>",id:"tunion-and-teither",level:3},{value:"<code>t.func()</code>",id:"tfunc",level:3},{value:"Parameters",id:"parameters",level:3},{value:"Methods",id:"methods",level:4}];function j(e){const n={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",h4:"h4",h5:"h5",li:"li",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"types",children:"Types"}),"\n",(0,s.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,s.jsx)(n.p,{children:"Types are used to describe the data to be processed. They constrain the range of value that can be accepted as input data or expected as result on each computation running in a runtime."}),"\n",(0,s.jsxs)(n.p,{children:["All the type definition functions are available under the ",(0,s.jsx)(n.code,{children:"t"})," namespace."]}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n"})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'import { t } from "@typegraph/sdk";\n'})})})]}),"\n",(0,s.jsx)(n.h3,{id:"scalar-types",children:"Scalar types"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"GraphQL type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tinteger",children:(0,s.jsx)(n.code,{children:"t.integer()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Int"})}),(0,s.jsx)(n.td,{children:"Represents signed 32-bit integers."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tfloat",children:(0,s.jsx)(n.code,{children:"t.float()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Float"})}),(0,s.jsxs)(n.td,{children:["Represents signed double-precision values as specified by ",(0,s.jsx)(n.a,{href:"https://en.wikipedia.org/wiki/IEEE_754",children:"IEEE 754"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tboolean",children:(0,s.jsx)(n.code,{children:"t.boolean()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Boolean"})}),(0,s.jsxs)(n.td,{children:["Represents ",(0,s.jsx)(n.code,{children:"true"})," or ",(0,s.jsx)(n.code,{children:"false"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tstring",children:(0,s.jsx)(n.code,{children:"t.string()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"String"})}),(0,s.jsx)(n.td,{children:"Represents textual data as UTF-8 character sequences."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tfile",children:(0,s.jsx)(n.code,{children:"t.file()"})})}),(0,s.jsx)(n.td,{children:"\u2014"}),(0,s.jsx)(n.td,{children:"Represents a file for upload."})]})]})]}),"\n",(0,s.jsxs)(n.p,{children:["The following scalar types are ",(0,s.jsx)(n.a,{href:"#tstring-aliases",children:"aliases"})," to a ",(0,s.jsx)(n.code,{children:"t.string()"})," type with a specific format."]}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.uuid()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.json()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.email()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.uri()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.hostname()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.ean()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.phone()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.date()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.datetime()"})}),"\n"]}),"\n",(0,s.jsx)(n.h3,{id:"non-scalar-types",children:"Non-scalar types"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"GraphQL type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#toptional",children:(0,s.jsx)(n.code,{children:"t.optional()"})})}),(0,s.jsx)(n.td,{children:"nullable"}),(0,s.jsxs)(n.td,{children:["Represents a value that may be ",(0,s.jsx)(n.code,{children:"null"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tlist",children:(0,s.jsx)(n.code,{children:"t.list()"})})}),(0,s.jsx)(n.td,{children:"list"}),(0,s.jsx)(n.td,{children:"Represents a list of values."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tstruct",children:(0,s.jsx)(n.code,{children:"t.struct()"})})}),(0,s.jsx)(n.td,{children:"interface"}),(0,s.jsx)(n.td,{children:"Represents a structured data value, consisting of fields which map to typed values."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tunion-and-teither",children:(0,s.jsx)(n.code,{children:"t.union()"})})}),(0,s.jsx)(n.td,{children:"union"}),(0,s.jsx)(n.td,{children:"Represents a value which can be one of a set of specified types."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tunion-and-teither",children:(0,s.jsx)(n.code,{children:"t.either()"})})}),(0,s.jsx)(n.td,{children:"union"}),(0,s.jsx)(n.td,{children:"Represents a value which can match one and only one of a set of specified types."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tfunc",children:(0,s.jsx)(n.code,{children:"t.func"})})}),(0,s.jsx)(n.td,{children:"\u2014"}),(0,s.jsx)(n.td,{children:"Represents an operation that has to be performed on the typegate."})]})]})]}),"\n",(0,s.jsx)(n.h3,{id:"type-constraints",children:"Type constraints"}),"\n",(0,s.jsx)(n.p,{children:"Type constraints define an additional narrowing of the range of values that can be accepted for the type."}),"\n",(0,s.jsxs)(r.gc,{children:[(0,s.jsx)(d.GR,{value:"python",children:(0,s.jsx)(n.p,{children:"They can be set with named arguments on the type definition function."})}),(0,s.jsx)(d.GR,{value:"typescript",children:(0,s.jsx)(n.p,{children:"They can be passed in an object after the last required parameter on the type definition."})})]}),"\n",(0,s.jsx)(n.p,{children:"See the reference for each type below for the list of constraints available."}),"\n",(0,s.jsxs)(n.p,{children:[(0,s.jsx)(n.strong,{children:"Example:"})," The ",(0,s.jsx)(n.code,{children:"min"})," constraint on the type ",(0,s.jsx)(n.code,{children:"t.integer()"})]}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"# represents integers greater than or equal to `12`\nt.integer(min=12)\n"})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"// represents integers greater than or equal to `12`\nt.integer({ min: 12 });\n"})})})]}),"\n",(0,s.jsx)(n.h3,{id:"names-and-type-references",children:"Names and type references"}),"\n",(0,s.jsx)(n.p,{children:"Each type has a unique name. If none is setImmediate, a random name will be generated during typegraph serialization."}),"\n",(0,s.jsx)(n.h3,{id:"injection",children:"Injection"}),"\n",(0,s.jsx)(n.h2,{id:"types-1",children:"Types"}),"\n",(0,s.jsx)(n.h3,{id:"tboolean",children:(0,s.jsx)(n.code,{children:"t.boolean()"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.boolean()"})," type represents boolean values, ",(0,s.jsx)(n.code,{children:"true"})," or ",(0,s.jsx)(n.code,{children:"false"}),"."]}),"\n",(0,s.jsx)(n.h3,{id:"tinteger",children:(0,s.jsx)(n.code,{children:"t.integer()"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.integer()"})," type represents 32-bit integers."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.integer([constraints]);\n"})}),"\n",(0,s.jsx)(n.h4,{id:"constraints",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"The minimum value of the integer."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"The maximum value of the integer."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"x_min"})}),(0,s.jsx)(n.td,{children:"The minimum value of the integer, exclusive."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"x_max"})}),(0,s.jsx)(n.td,{children:"The maximum value of the integer, exclusive."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"multiple_of"})}),(0,s.jsx)(n.td,{children:"The integer must be a multiple of this value."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples",children:"Examples"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"# non-negative integer\nnon_negative = t.integer(min=0)\n\n# an integer in the range [18, 120)\nadult_age = t.integer(min=18, x_max=120)\n\n# an even integer\neven = t.integer(multiple_of=2)\n"})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"// non-negative integer\nconst nonNegative = t.integer({ min: 0 });\n\n// an integer in the range [18, 120)\nconst adultAge = t.integer({ min: 18, x_max: 120 });\n\n// an even integer\nconst even = t.integer({ multiple_of: 2 });\n"})})})]}),"\n",(0,s.jsx)(n.h3,{id:"tfloat",children:(0,s.jsx)(n.code,{children:"t.float()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.float([constraints]);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.float()"})," type represents numbers, stored in double precision floating-point format (",(0,s.jsx)(n.a,{href:"https://en.wikipedia.org/wiki/IEEE_754",children:"IEEE 754"}),")."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-1",children:"Constraints"}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.float()"})," type has the same constraints as ",(0,s.jsx)(n.code,{children:"t.integer()"}),". See ",(0,s.jsx)(n.a,{href:"#tinteger",children:"integer constraints"}),"."]}),"\n",(0,s.jsx)(n.h3,{id:"tstring",children:(0,s.jsx)(n.code,{children:"t.string()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.string([constraints]);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.string()"})," type represents textual data represented as UTF-8 character sequences."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-2",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum length of the string."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum length of the string."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"pattern"})}),(0,s.jsx)(n.td,{children:"String"}),(0,s.jsx)(n.td,{children:"Regular expression pattern that the string must match."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"format"})}),(0,s.jsx)(n.td,{children:"String"}),(0,s.jsxs)(n.td,{children:[(0,s.jsx)(n.a,{href:"http://json-schema.org/draft/2020-12/json-schema-validation.html#name-defined-formats",children:"JSON schema format"})," that the string must match. See ",(0,s.jsx)(n.a,{href:"#supported-formats",children:"below"})," for the list of supported formats."]})]})]})]}),"\n",(0,s.jsx)(n.h5,{id:"supported-formats",children:"Supported formats"}),"\n",(0,s.jsx)(n.p,{children:"Here is the list of supported formats:"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"uuid"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"json"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"email"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"uri"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"hostname"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"ean"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"phone"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"date"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"date-time"})}),"\n"]}),"\n",(0,s.jsx)(n.h4,{id:"examples-1",children:"Examples"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# a non-empty string of maximum 64 characters\nt.string(min=1, max=64)\n\n# an email address\nt.string(format="email")\n\n# a json data\nt.string(format="json")\n'})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'// a non-empty string of maximum 64 characters\nt.string({ min: 1, max: 64 });\n\n// an email address\nt.string({ format: "email" });\n\n// a json data\nt.string({ format: "json" });\n'})})})]}),"\n",(0,s.jsx)(n.h4,{id:"tstring-aliases",children:"Aliases"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Alias"}),(0,s.jsx)(n.th,{children:"Equivalent declaration"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uuid()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="uuid")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.email()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="email")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uri()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="uri")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.json"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="json")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.ean()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="ean")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.phone()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="phone")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.date()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="date")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.datetime()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string(format="date-time")'})})]})]})]})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Alias"}),(0,s.jsx)(n.th,{children:"Equivalent declaration"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uuid()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "uuid" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.email()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "email" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uri()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "uri" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.json"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "json" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.ean()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "ean" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.phone()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "phone" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.date()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "date" })'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.datetime()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string({ format: "date-time" })'})})]})]})]})})]}),"\n",(0,s.jsx)(n.h3,{id:"tfile",children:(0,s.jsx)(n.code,{children:"t.file()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.file([constraints]);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.file()"})," represents files for upload."]}),"\n",(0,s.jsx)(n.h4,{id:"type-constraints-1",children:"Type Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum size of the file in bytes."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum size of the file in bytes."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"allow"})}),(0,s.jsx)(n.td,{children:"Array of strings"}),(0,s.jsxs)(n.td,{children:["List of allowed ",(0,s.jsx)(n.code,{children:"content-type"}),"s"]})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-2",children:"Examples"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# A file of a minimum size of 1KB\nt.file(min=1024)\n\n# A JPEG or PNG file less than 2KB\nt.file(max=2048, allow=["image/jpeg", "image/png"])\n'})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'// A file of a minimum size of 1KB\nt.file({ min: 1024 });\n\n// A JPEG or PNG file less than 2KB\nt.file({ max: 2048, allow: ["image/jpeg", "image/png"] });\n'})})})]}),"\n",(0,s.jsx)(n.h3,{id:"toptional",children:(0,s.jsx)(n.code,{children:"t.optional()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.optional(item_type);\nitem_type.optional(); // equivalent syntactic sugar\n"})}),"\n",(0,s.jsx)(n.h4,{id:"default-value",children:"Default value"}),"\n",(0,s.jsx)(n.p,{children:" If the type is used as an input type, the default value can be specified in the type definition."}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'t.string().optional("default value")\n'})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:'t.string().optional({ defaultItem: "default value" });\n'})})})]}),"\n",(0,s.jsx)(n.h3,{id:"tlist",children:(0,s.jsx)(n.code,{children:"t.list()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.list(item_type, [constraints]);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.list()"})," type represents a sequence of values of the same type."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-3",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum number of items."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum number of items."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"unique_items"})}),(0,s.jsx)(n.td,{children:"Boolean"}),(0,s.jsx)(n.td,{children:"Whether the items must be unique."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-3",children:"Examples"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"# A list of strings\nt.list(t.string())\n\n# A list of unique strings\n\nt.list(t.string(), unique_items=True)\n\n# A list of strings with at least 3 items\n\n# and at most 10 items\n\nt.list(t.string(), min=3, max=10)\n\n"})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"# A list of strings\nt.list(t.string())\n\n# A list of unique strings\nt.list(t.string(), { uniqueItems: true })\n\n# A list of strings with at least 3 items\n# and at most 10 items\nt.list(t.string(), { min: 3, max: 10 })\n"})})})]}),"\n",(0,s.jsx)(n.h3,{id:"tstruct",children:(0,s.jsx)(n.code,{children:"t.struct()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.struct(properties, [constraints]);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.struct()"})," type represents structured data, consisting of nemed properties with pre-defined types."]}),"\n",(0,s.jsxs)(n.p,{children:["All the prperies are required unless the corresponding type is ",(0,s.jsx)(n.a,{href:"#toptional",children:(0,s.jsx)(n.em,{children:"optional"})}),". In that case, the field is allowed to be missing from the value or be ",(0,s.jsx)(n.code,{children:"null"}),"."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-4",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum number of fields."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum number of fields."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-4",children:"Examples"}),"\n",(0,s.jsxs)(r.Ay,{children:[(0,s.jsx)(l.A,{value:"python",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'# A user profile\nuser = t.struct({\n    "id": t.uuid(as_id=True),\n    "email": t.email(),\n    "username": t.string(min=3, max=64),\n})\n\n# A user profile with an optional `name` field\n\nuser = t.struct({ "id": t.uuid(as_id=True), "email": t.email(), "username": t.string(min=3, max=64), "name": t.string(min=3, max=64).optional(), })\n\n'})})}),(0,s.jsx)(l.A,{value:"typescript",children:(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"// A user profile\nconst user = t.struct({\n  id: t.uuid({ as_id: true }),\n  email: t.email(),\n  username: t.string({ min: 3, max: 64 }),\n});\n\n// A user profile with an optional `name\nconst user = t.struct({\n  id: t.uuid({ as_id: true }),\n  email: t.email(),\n  username: t.string({ min: 3, max: 64 }),\n  name: t.string({ min: 3, max: 64 }).optional(),\n});\n"})})})]}),"\n",(0,s.jsxs)(n.h3,{id:"tunion-and-teither",children:[(0,s.jsx)(n.code,{children:"t.union()"})," and ",(0,s.jsx)(n.code,{children:"t.either()"})]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-ts",children:"t.union(variants);\nt.either(variants);\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.union"})," type represents a value that can be of any of the specified variants. The ",(0,s.jsx)(n.code,{children:"t.either"})," type represents a value that must be of one and only one of the specified variants."]}),"\n",(0,s.jsxs)(r.gc,{children:[(0,s.jsxs)(d.GR,{value:"python",children:["The ",(0,s.jsx)(n.code,{children:"variants"})," parameter is a list of types."]}),(0,s.jsx)(d.GR,{value:"typescript",children:(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"variants"})," parameter is an array of types."]})})]}),"\n",(0,s.jsx)(n.h3,{id:"tfunc",children:(0,s.jsx)(n.code,{children:"t.func()"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.func()"})," type represents an operation to be performed on the typegate with the specified configuration associated to it."]}),"\n",(0,s.jsxs)(n.p,{children:["Usually, the functions are not defined explicitly, but rather created with the ",(0,s.jsx)(n.a,{href:"./runtimes",children:"runtime"})," instance."]}),"\n",(0,s.jsx)(n.h3,{id:"parameters",children:"Parameters"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Parameter"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"input type"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.struct()"})}),(0,s.jsx)(n.td,{children:"The type of the input data."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"output type"}),(0,s.jsx)(n.td,{children:"any type"}),(0,s.jsx)(n.td,{children:"The type of the output data."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"function"}),(0,s.jsxs)(n.td,{children:[(0,s.jsx)(n.a,{href:"/docs/concepts/mental-model#functions",children:(0,s.jsx)(n.code,{children:"Function"})}),"~"]}),(0,s.jsx)(n.td,{children:"The abstraction to use to perform the operation/computation."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"methods",children:"Methods"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Method"}),(0,s.jsx)(n.th,{children:"Purpose"}),(0,s.jsx)(n.th,{children:"Reference page"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"rate"})}),(0,s.jsx)(n.td,{children:"Rate limiting"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/typegate/rate-limiting",children:"Rate limiting"})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"reduce"})}),(0,s.jsx)(n.td,{children:"Parameter transformation"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/types/parameter-transformations#funcreducetree",children:(0,s.jsx)(n.code,{children:"reduce"})})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"apply"})}),(0,s.jsx)(n.td,{children:"Parameter transformation"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/types/parameter-transformations#funcapplytree",children:(0,s.jsx)(n.code,{children:"apply"})})})]})]})]})]})}function p(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(j,{...e})}):j(e)}},92465:(e,n,t)=>{t.d(n,{Ay:()=>d,gc:()=>l});t(30758);var s=t(53096),i=t(43236),r=t(86070);function d(e){let{children:n}=e;const[t,d]=(0,s.e)();return(0,r.jsx)(i.mS,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,onChange:d,children:n})}function l(e){let{children:n}=e;const[t]=(0,s.e)();return(0,r.jsx)(i.q9,{choices:{typescript:"Typescript SDK",python:"Python SDK"},choice:t,children:n})}}}]);