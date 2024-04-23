"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9594],{63885:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>c,contentTitle:()=>d,default:()=>o,frontMatter:()=>i,metadata:()=>l,toc:()=>h});var s=t(13274),r=t(99128);const i={sidebar_position:1},d="Types",l={id:"reference/types/index",title:"Types",description:"Overview",source:"@site/docs/reference/types/index.mdx",sourceDirName:"reference/types",slug:"/reference/types/",permalink:"/docs/reference/types/",draft:!1,unlisted:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/types/index.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"docs",previous:{title:"index",permalink:"/docs/guides/import-external-modules/"},next:{title:"Functions",permalink:"/docs/reference/types/functions"}},c={},h=[{value:"Overview",id:"overview",level:2},{value:"Scalar types",id:"scalar-types",level:3},{value:"Non-scalar types",id:"non-scalar-types",level:3},{value:"Type constraints",id:"type-constraints",level:3},{value:"Names and type references",id:"names-and-type-references",level:3},{value:"Injection",id:"injection",level:3},{value:"Types",id:"types-1",level:2},{value:"<code>t.boolean()</code>",id:"tboolean",level:3},{value:"<code>t.integer()</code>",id:"tinteger",level:3},{value:"Constraints",id:"constraints",level:4},{value:"Examples",id:"examples",level:4},{value:"<code>t.number()</code>",id:"tnumber",level:3},{value:"Constraints",id:"constraints-1",level:4},{value:"Aliases",id:"aliases",level:4},{value:"<code>t.string()</code>",id:"tstring",level:3},{value:"Constraints",id:"constraints-2",level:4},{value:"Supported formats",id:"supported-formats",level:5},{value:"Examples",id:"examples-1",level:4},{value:"Aliases",id:"tstring-aliases",level:4},{value:"<code>t.file()</code>",id:"tfile",level:3},{value:"Type Constraints",id:"type-constraints-1",level:4},{value:"Examples",id:"examples-2",level:4},{value:"<code>t.optional()</code>",id:"toptional",level:3},{value:"Default value",id:"default-value",level:4},{value:"<code>t.list()</code>",id:"tlist",level:3},{value:"Constraints",id:"constraints-3",level:4},{value:"Examples",id:"examples-3",level:4},{value:"<code>t.struct()</code>",id:"tstruct",level:3},{value:"Constraints",id:"constraints-4",level:4},{value:"Examples",id:"examples-4",level:4},{value:"<code>t.union()</code> and <code>t.either()</code>",id:"tunion-and-teither",level:3},{value:"<code>t.func()</code>",id:"tfunc",level:3},{value:"Parameters",id:"parameters",level:4},{value:"Methods",id:"methods",level:4},{value:"Examples",id:"examples-5",level:4}];function a(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",h5:"h5",li:"li",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,r.R)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.h1,{id:"types",children:"Types"}),"\n",(0,s.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,s.jsx)(n.p,{children:"Types are used to describe the data to be processed.\nThey constrains the range of value that can be accepted as input data\nor expected as result on each computation running in a runtime."}),"\n",(0,s.jsx)(n.h3,{id:"scalar-types",children:"Scalar types"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"GraphQL type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tinteger",children:(0,s.jsx)(n.code,{children:"t.integer()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Int"})}),(0,s.jsx)(n.td,{children:"Represents signed 32-bit integers."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tnumber",children:(0,s.jsx)(n.code,{children:"t.number()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Float"})}),(0,s.jsxs)(n.td,{children:["Represents signed double-precision values as specified by ",(0,s.jsx)(n.a,{href:"https://en.wikipedia.org/wiki/IEEE_754",children:"IEEE 754"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tnumber",children:(0,s.jsx)(n.code,{children:"t.float()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Float"})}),(0,s.jsxs)(n.td,{children:["Alias to ",(0,s.jsx)(n.code,{children:"t.number()"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tboolean",children:(0,s.jsx)(n.code,{children:"t.boolean()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"Boolean"})}),(0,s.jsxs)(n.td,{children:["Represents ",(0,s.jsx)(n.code,{children:"true"})," or ",(0,s.jsx)(n.code,{children:"false"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tstring",children:(0,s.jsx)(n.code,{children:"t.string()"})})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"String"})}),(0,s.jsx)(n.td,{children:"Represents textual data as UTF-8 character sequences."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tfile",children:(0,s.jsx)(n.code,{children:"t.file()"})})}),(0,s.jsx)(n.td,{children:"\u2014"}),(0,s.jsx)(n.td,{children:"Represents a file for upload."})]})]})]}),"\n",(0,s.jsxs)(n.p,{children:["The following scalar types are ",(0,s.jsx)(n.a,{href:"#tstring-aliases",children:"aliases"})," to a ",(0,s.jsx)(n.code,{children:"t.string()"})," type with a specific format."]}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.uuid()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.json()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.email()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.uri()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.hostname()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.ean()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.phone()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.date()"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.datetime()"})}),"\n"]}),"\n",(0,s.jsx)(n.h3,{id:"non-scalar-types",children:"Non-scalar types"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"GraphQL type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#toptional",children:(0,s.jsx)(n.code,{children:"t.optional()"})})}),(0,s.jsx)(n.td,{children:"nullable"}),(0,s.jsxs)(n.td,{children:["Represents a value that may be ",(0,s.jsx)(n.code,{children:"null"}),"."]})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tlist",children:(0,s.jsx)(n.code,{children:"t.list()"})})}),(0,s.jsx)(n.td,{children:"list"}),(0,s.jsx)(n.td,{children:"Represents a list of values."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tstruct",children:(0,s.jsx)(n.code,{children:"t.struct()"})})}),(0,s.jsx)(n.td,{children:"interface"}),(0,s.jsx)(n.td,{children:"Represents a structured data value, consisting of fields which map to typed values."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tunion-and-teither",children:(0,s.jsx)(n.code,{children:"t.union()"})})}),(0,s.jsx)(n.td,{children:"union"}),(0,s.jsx)(n.td,{children:"Represents a value which can be one of a set of specified types."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tunion-and-teither",children:(0,s.jsx)(n.code,{children:"t.either()"})})}),(0,s.jsx)(n.td,{children:"union"}),(0,s.jsx)(n.td,{children:"Represents a value which can match one and only one of a set of specified types."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"#tfunc",children:(0,s.jsx)(n.code,{children:"t.func"})})}),(0,s.jsx)(n.td,{children:"\u2014"}),(0,s.jsx)(n.td,{children:"Represents an operation that has to be performed on the typegate."})]})]})]}),"\n",(0,s.jsx)(n.h3,{id:"type-constraints",children:"Type constraints"}),"\n",(0,s.jsx)(n.p,{children:"Type constraints define an additional narrowing of the range of values\nthat can be accepted for the type."}),"\n",(0,s.jsxs)(n.p,{children:[(0,s.jsx)(n.strong,{children:"Example:"}),"\nThe ",(0,s.jsx)(n.code,{children:"min"})," constraint on the type ",(0,s.jsx)(n.code,{children:"t.integer()"})]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\n# represents integers greater than or equal to `12`\nt.integer().min(12)  \n"})}),"\n",(0,s.jsx)(n.h3,{id:"names-and-type-references",children:"Names and type references"}),"\n",(0,s.jsx)(n.h3,{id:"injection",children:"Injection"}),"\n",(0,s.jsx)(n.h2,{id:"types-1",children:"Types"}),"\n",(0,s.jsx)(n.h3,{id:"tboolean",children:(0,s.jsx)(n.code,{children:"t.boolean()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.boolean()\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.boolean()"})," type represents boolean values, ",(0,s.jsx)(n.code,{children:"true"})," or ",(0,s.jsx)(n.code,{children:"false"}),"."]}),"\n",(0,s.jsx)(n.h3,{id:"tinteger",children:(0,s.jsx)(n.code,{children:"t.integer()"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.integer()"})," type represents 32-bit integers."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.integer()\n"})}),"\n",(0,s.jsx)(n.h4,{id:"constraints",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"The minimum value of the integer."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"The maximum value of the integer."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"x_min"})}),(0,s.jsx)(n.td,{children:"The minimum value of the integer, exclusive."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"x_max"})}),(0,s.jsx)(n.td,{children:"The maximum value of the integer, exclusive."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"multiple_of"})}),(0,s.jsx)(n.td,{children:"The integer must be a multiple of this value."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\n# non-negative integer\nt.integer().min(0)\n\n# an integer in the rage [18, 120)\nadult_age = t.integer().min(18).x_max(120)\n\n# an even integer\nt.integer().multiple_of(2)\n"})}),"\n",(0,s.jsx)(n.h3,{id:"tnumber",children:(0,s.jsx)(n.code,{children:"t.number()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.number()\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.number()"})," type represents numbers, stored in double precision floating-point format (",(0,s.jsx)(n.a,{href:"https://en.wikipedia.org/wiki/IEEE_754",children:"IEEE 754"}),")."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-1",children:"Constraints"}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.number()"})," type has the same constraints as ",(0,s.jsx)(n.code,{children:"t.integer()"}),".\nSee ",(0,s.jsx)(n.a,{href:"#tinteger",children:"integer constraints"}),"."]}),"\n",(0,s.jsx)(n.h4,{id:"aliases",children:"Aliases"}),"\n",(0,s.jsxs)(n.p,{children:["The following types are aliases to the ",(0,s.jsx)(n.code,{children:"t.number()"})," type:"]}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"t.float()"})}),"\n"]}),"\n",(0,s.jsx)(n.h3,{id:"tstring",children:(0,s.jsx)(n.code,{children:"t.string()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.string()\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.string()"})," type represents textual data represented as UTF-8 character sequences."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-2",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum length of the string."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum length of the string."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"pattern"})}),(0,s.jsx)(n.td,{children:"String"}),(0,s.jsx)(n.td,{children:"Regular expression pattern that the string must match."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"format"})}),(0,s.jsx)(n.td,{children:"String"}),(0,s.jsxs)(n.td,{children:[(0,s.jsx)(n.a,{href:"http://json-schema.org/draft/2020-12/json-schema-validation.html#name-defined-formats",children:"JSON schema format"})," that the string must match. See ",(0,s.jsx)(n.a,{href:"#supported-formats",children:"below"})," for the list of supported formats."]})]})]})]}),"\n",(0,s.jsx)(n.h5,{id:"supported-formats",children:"Supported formats"}),"\n",(0,s.jsx)(n.p,{children:"Here is the list of supported formats:"}),"\n",(0,s.jsxs)(n.ul,{children:["\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"uuid"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"json"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"email"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"uri"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"hostname"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"ean"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"phone"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"date"})}),"\n",(0,s.jsx)(n.li,{children:(0,s.jsx)(n.code,{children:"date-time"})}),"\n"]}),"\n",(0,s.jsx)(n.h4,{id:"examples-1",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\n\n# a non-empty string of maximum 64 characters\nt.string().min(1).max(64)\n\n# a email address\nt.string().format("email")\n\n# a json data\nt.string().format("json")\n'})}),"\n",(0,s.jsx)(n.h4,{id:"tstring-aliases",children:"Aliases"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Alias"}),(0,s.jsx)(n.th,{children:"Equivalent declaration"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uuid()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("uuid")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.email()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("email")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.uri()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("uri")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.json"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("json")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.ean()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("ean")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.phone()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("phone")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.date()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("date")'})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.datetime()"})}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:'t.string().format("date-time")'})})]})]})]}),"\n",(0,s.jsx)(n.h3,{id:"tfile",children:(0,s.jsx)(n.code,{children:"t.file()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.file()\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.file()"})," represents files for upload."]}),"\n",(0,s.jsx)(n.h4,{id:"type-constraints-1",children:"Type Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum size of the file in bytes."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum size of the file in bytes."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"allow"})}),(0,s.jsx)(n.td,{children:"Array of strings"}),(0,s.jsxs)(n.td,{children:["List of allowed ",(0,s.jsx)(n.code,{children:"content-type"}),"s"]})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-2",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\n\n# A file of a minimum size of 1KB\nt.file().min(1024)\n\n# A JPEG or PNG file less than 2KB\nt.file().max(2048).allow(["image/jpeg", "image/png"])\n'})}),"\n",(0,s.jsx)(n.h3,{id:"toptional",children:(0,s.jsx)(n.code,{children:"t.optional()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.optional(t.string())\nt.string().optional() # equivalent syntactic sugar\n"})}),"\n",(0,s.jsx)(n.h4,{id:"default-value",children:"Default value"}),"\n",(0,s.jsxs)(n.p,{children:["If the type is used as an input type, the default value can be specified\nusing the ",(0,s.jsx)(n.code,{children:".default()"})," method."]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\n\nt.string().optional().default("default value")\n'})}),"\n",(0,s.jsx)(n.h3,{id:"tlist",children:(0,s.jsx)(n.code,{children:"t.list()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.list(t.string())\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.list()"})," type represents a sequence of values of the same type."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-3",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum number of items."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum number of items."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"unique_items"})}),(0,s.jsx)(n.td,{children:"Boolean"}),(0,s.jsx)(n.td,{children:"Whether the items must be unique."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-3",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\n# A list of strings\nt.list(t.string())\n\n# A list of unique strings\nt.list(t.string()).unique_items()\n\n# A list of strings with at least 3 items\n# and at most 10 items\nt.list(t.string()).min(3).max(10)\n"})}),"\n",(0,s.jsx)(n.h3,{id:"tstruct",children:(0,s.jsx)(n.code,{children:"t.struct()"})}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\n\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n})\n'})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.struct()"})," type represents structured data, consisting of fields\nwhich map to typed values."]}),"\n",(0,s.jsxs)(n.p,{children:["All the fields are required unless the corresponding type is wrapped in\n",(0,s.jsx)(n.code,{children:"t.optional()"}),".\nIn that case, the field is allowed to be missing from the data or be ",(0,s.jsx)(n.code,{children:"null"}),"."]}),"\n",(0,s.jsx)(n.h4,{id:"constraints-4",children:"Constraints"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Constraint"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"min"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Minimum number of fields."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"max"})}),(0,s.jsx)(n.td,{children:"Integer"}),(0,s.jsx)(n.td,{children:"Maximum number of fields."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-4",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\n\n# A user profile\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n})\n\n# A user profile with an optional `name` field\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n    "name": t.optional(t.string().min(3).max(64)),\n})\n'})}),"\n",(0,s.jsxs)(n.h3,{id:"tunion-and-teither",children:[(0,s.jsx)(n.code,{children:"t.union()"})," and ",(0,s.jsx)(n.code,{children:"t.either()"})]}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:"from typegraph import t\n\nt.union([t.string(), t.integer()])\nt.either([t.string(), t.integer()])\n"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.union"})," type represents a value that can be of any of the specified types.\nThe ",(0,s.jsx)(n.code,{children:"t.either"})," type represents a value that must be of one and only one of the specified types."]}),"\n",(0,s.jsx)(n.h3,{id:"tfunc",children:(0,s.jsx)(n.code,{children:"t.func()"})}),"\n",(0,s.jsxs)(n.p,{children:["The ",(0,s.jsx)(n.code,{children:"t.func()"})," type represents an operation to be performed on the typegate\nwith the specified materializer."]}),"\n",(0,s.jsxs)(n.p,{children:["Usually, the functions are not defined explicitly, but rather\ncreated with the ",(0,s.jsx)(n.a,{href:"./runtimes",children:"runtime"})," instance."]}),"\n",(0,s.jsx)(n.h4,{id:"parameters",children:"Parameters"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Parameter"}),(0,s.jsx)(n.th,{children:"Type"}),(0,s.jsx)(n.th,{children:"Description"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"input type"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"t.struct()"})}),(0,s.jsx)(n.td,{children:"The type of the input data."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"output type"}),(0,s.jsx)(n.td,{children:"any type"}),(0,s.jsx)(n.td,{children:"The type of the output data."})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:"materializer"}),(0,s.jsxs)(n.td,{children:[(0,s.jsx)(n.a,{href:"/docs/concepts/mental-model#materializers",children:(0,s.jsx)(n.code,{children:"Materializer"})}),"~"]}),(0,s.jsx)(n.td,{children:"The materializer to use to perform the operation/computation."})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"methods",children:"Methods"}),"\n",(0,s.jsxs)(n.table,{children:[(0,s.jsx)(n.thead,{children:(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.th,{children:"Method"}),(0,s.jsx)(n.th,{children:"Purpose"}),(0,s.jsx)(n.th,{children:"Reference page"})]})}),(0,s.jsxs)(n.tbody,{children:[(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"rate"})}),(0,s.jsx)(n.td,{children:"Rate limiting"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/typegate/rate-limiting",children:"Rate limiting"})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"reduce"})}),(0,s.jsx)(n.td,{children:"Parameter transformation"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/types/parameter-transformations#funcreducetree",children:(0,s.jsx)(n.code,{children:"reduce"})})})]}),(0,s.jsxs)(n.tr,{children:[(0,s.jsx)(n.td,{children:(0,s.jsx)(n.code,{children:"apply"})}),(0,s.jsx)(n.td,{children:"Parameter transformation"}),(0,s.jsx)(n.td,{children:(0,s.jsx)(n.a,{href:"/docs/reference/types/parameter-transformations#funcapplytree",children:(0,s.jsx)(n.code,{children:"apply"})})})]})]})]}),"\n",(0,s.jsx)(n.h4,{id:"examples-5",children:"Examples"}),"\n",(0,s.jsx)(n.pre,{children:(0,s.jsx)(n.code,{className:"language-python",children:'from typegraph import t\nfrom typegraph.runtimes.deno import FunMat\nfrom typegraph.providers.prisma.runtimes import PrismaRuntime\n\nwith TypeGraph("math") as g:\n    add = t.func(\n        t.struct({\n            "a": t.integer(),\n            "b": t.integer(),\n        }),\n        t.integer(),\n        FunMat("(({a, b}) => a + b")\n    )\n\n    g.expose(add=add)\n\n    db = PrismaRuntime("main-db", "POSTGRES")\n\n    user = t.struct({\n        "id": t.uuid().as_id,\n        "email": t.email(),\n        "username": t.string().min(3).max(64),\n    })\n\n    g.expose(createUser=db.create(user))\n'})})]})}function o(e={}){const{wrapper:n}={...(0,r.R)(),...e.components};return n?(0,s.jsx)(n,{...e,children:(0,s.jsx)(a,{...e})}):a(e)}}}]);