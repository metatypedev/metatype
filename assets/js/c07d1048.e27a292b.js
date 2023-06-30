"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[7562],{17942:(t,e,n)=>{n.d(e,{Zo:()=>d,kt:()=>N});var a=n(50959);function r(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function l(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,a)}return n}function i(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?l(Object(n),!0).forEach((function(e){r(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function p(t,e){if(null==t)return{};var n,a,r=function(t,e){if(null==t)return{};var n,a,r={},l=Object.keys(t);for(a=0;a<l.length;a++)n=l[a],e.indexOf(n)>=0||(r[n]=t[n]);return r}(t,e);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(t);for(a=0;a<l.length;a++)n=l[a],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(r[n]=t[n])}return r}var m=a.createContext({}),o=function(t){var e=a.useContext(m),n=e;return t&&(n="function"==typeof t?t(e):i(i({},e),t)),n},d=function(t){var e=o(t.components);return a.createElement(m.Provider,{value:e},t.children)},s="mdxType",u={inlineCode:"code",wrapper:function(t){var e=t.children;return a.createElement(a.Fragment,{},e)}},k=a.forwardRef((function(t,e){var n=t.components,r=t.mdxType,l=t.originalType,m=t.parentName,d=p(t,["components","mdxType","originalType","parentName"]),s=o(n),k=r,N=s["".concat(m,".").concat(k)]||s[k]||u[k]||l;return n?a.createElement(N,i(i({ref:e},d),{},{components:n})):a.createElement(N,i({ref:e},d))}));function N(t,e){var n=arguments,r=e&&e.mdxType;if("string"==typeof t||r){var l=n.length,i=new Array(l);i[0]=k;var p={};for(var m in e)hasOwnProperty.call(e,m)&&(p[m]=e[m]);p.originalType=t,p[s]="string"==typeof t?t:r,i[1]=p;for(var o=2;o<l;o++)i[o]=n[o];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}k.displayName="MDXCreateElement"},19969:(t,e,n)=>{n.r(e),n.d(e,{assets:()=>m,contentTitle:()=>i,default:()=>u,frontMatter:()=>l,metadata:()=>p,toc:()=>o});var a=n(60795),r=(n(50959),n(17942));const l={},i="Type System",p={unversionedId:"reference/type-system",id:"reference/type-system",title:"Type System",description:"Overview",source:"@site/docs/reference/type-system.mdx",sourceDirName:"reference",slug:"/reference/type-system",permalink:"/docs/reference/type-system",draft:!1,editUrl:"https://github.com/metatypedev/metatype/tree/main/website/docs/reference/type-system.mdx",tags:[],version:"current",frontMatter:{},sidebar:"docs",previous:{title:"WasmEdge runtime",permalink:"/docs/reference/runtimes/wasmedge"},next:{title:"Meta CLI",permalink:"/docs/reference/meta-cli"}},m={},o=[{value:"Overview",id:"overview",level:2},{value:"Scalar types",id:"scalar-types",level:3},{value:"Non-scalar types",id:"non-scalar-types",level:3},{value:"Type constraints",id:"type-constraints",level:3},{value:"Names and type references",id:"names-and-type-references",level:3},{value:"Injection",id:"injection",level:3},{value:"Types",id:"types",level:2},{value:"<code>t.boolean()</code>",id:"tboolean",level:3},{value:"<code>t.integer()</code>",id:"tinteger",level:3},{value:"Constraints",id:"constraints",level:4},{value:"Examples",id:"examples",level:4},{value:"<code>t.number()</code>",id:"tnumber",level:3},{value:"Constraints",id:"constraints-1",level:4},{value:"Aliases",id:"aliases",level:4},{value:"<code>t.string()</code>",id:"tstring",level:3},{value:"Constraints",id:"constraints-2",level:4},{value:"Supported formats",id:"supported-formats",level:5},{value:"Examples",id:"examples-1",level:4},{value:"Aliases",id:"tstring-aliases",level:4},{value:"<code>t.file()</code>",id:"tfile",level:3},{value:"Type Constraints",id:"type-constraints-1",level:4},{value:"Examples",id:"examples-2",level:4},{value:"<code>t.optional()</code>",id:"toptional",level:3},{value:"Default value",id:"default-value",level:4},{value:"<code>t.array()</code>",id:"tarray",level:3},{value:"Constraints",id:"constraints-3",level:4},{value:"Examples",id:"examples-3",level:4},{value:"<code>t.struct()</code>",id:"tstruct",level:3},{value:"Constraints",id:"constraints-4",level:4},{value:"Examples",id:"examples-4",level:4},{value:"<code>t.union()</code> and <code>t.either()</code>",id:"tunion-and-teither",level:3},{value:"<code>t.func()</code>",id:"tfunc",level:3},{value:"Parameters",id:"parameters",level:4},{value:"Examples",id:"examples-5",level:4}],d={toc:o},s="wrapper";function u(t){let{components:e,...n}=t;return(0,r.kt)(s,(0,a.Z)({},d,n,{components:e,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"type-system"},"Type System"),(0,r.kt)("h2",{id:"overview"},"Overview"),(0,r.kt)("p",null,"Types are used to describe the data to be processed.\nThey constrains the range of value that can be accepted as input data\nor expected as result on each computation running in a runtime."),(0,r.kt)("h3",{id:"scalar-types"},"Scalar types"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"GraphQL type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tinteger"},(0,r.kt)("inlineCode",{parentName:"a"},"t.integer()"))),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"Int")),(0,r.kt)("td",{parentName:"tr",align:null},"Represents signed 32-bit integers.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tnumber"},(0,r.kt)("inlineCode",{parentName:"a"},"t.number()"))),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"Float")),(0,r.kt)("td",{parentName:"tr",align:null},"Represents signed double-precision values as specified by ",(0,r.kt)("a",{parentName:"td",href:"https://en.wikipedia.org/wiki/IEEE_754"},"IEEE 754"),".")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tnumber"},(0,r.kt)("inlineCode",{parentName:"a"},"t.float()"))),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"Float")),(0,r.kt)("td",{parentName:"tr",align:null},"Alias to ",(0,r.kt)("inlineCode",{parentName:"td"},"t.number()"),".")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tboolean"},(0,r.kt)("inlineCode",{parentName:"a"},"t.boolean()"))),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"Boolean")),(0,r.kt)("td",{parentName:"tr",align:null},"Represents ",(0,r.kt)("inlineCode",{parentName:"td"},"true")," or ",(0,r.kt)("inlineCode",{parentName:"td"},"false"),".")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tstring"},(0,r.kt)("inlineCode",{parentName:"a"},"t.string()"))),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"String")),(0,r.kt)("td",{parentName:"tr",align:null},"Represents textual data as UTF-8 character sequences.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tfile"},(0,r.kt)("inlineCode",{parentName:"a"},"t.file()"))),(0,r.kt)("td",{parentName:"tr",align:null},"\u2014"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a file for upload.")))),(0,r.kt)("p",null,"The following scalar types are ",(0,r.kt)("a",{parentName:"p",href:"#tstring-aliases"},"aliases")," to a ",(0,r.kt)("inlineCode",{parentName:"p"},"t.string()")," type with a specific format."),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.uuid()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.json()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.email()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.uri()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.hostname()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.ean()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.phone()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.date()")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.datetime()"))),(0,r.kt)("h3",{id:"non-scalar-types"},"Non-scalar types"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"GraphQL type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#toptional"},(0,r.kt)("inlineCode",{parentName:"a"},"t.optional()"))),(0,r.kt)("td",{parentName:"tr",align:null},"nullable"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a value that may be ",(0,r.kt)("inlineCode",{parentName:"td"},"null"),".")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tarray"},(0,r.kt)("inlineCode",{parentName:"a"},"t.array()"))),(0,r.kt)("td",{parentName:"tr",align:null},"list"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a list of values.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tstruct"},(0,r.kt)("inlineCode",{parentName:"a"},"t.struct()"))),(0,r.kt)("td",{parentName:"tr",align:null},"interface"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a structured data value, consisting of fields which map to typed values.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tunion-and-teither"},(0,r.kt)("inlineCode",{parentName:"a"},"t.union()"))),(0,r.kt)("td",{parentName:"tr",align:null},"union"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a value which can be one of a set of specified types.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tunion-and-teither"},(0,r.kt)("inlineCode",{parentName:"a"},"t.either()"))),(0,r.kt)("td",{parentName:"tr",align:null},"union"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents a value which can match one and only one of a set of specified types.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"#tfunc"},(0,r.kt)("inlineCode",{parentName:"a"},"t.func"))),(0,r.kt)("td",{parentName:"tr",align:null},"\u2014"),(0,r.kt)("td",{parentName:"tr",align:null},"Represents an operation that has to be performed on the typegate.")))),(0,r.kt)("h3",{id:"type-constraints"},"Type constraints"),(0,r.kt)("p",null,"Type constraints define an additional narrowing of the range of values\nthat can be accepted for the type."),(0,r.kt)("p",null,(0,r.kt)("strong",{parentName:"p"},"Example:"),"\nThe ",(0,r.kt)("inlineCode",{parentName:"p"},"min")," constraint on the type ",(0,r.kt)("inlineCode",{parentName:"p"},"t.integer()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\n# represents integers greater than or equal to `12`\nt.integer().min(12)  \n")),(0,r.kt)("h3",{id:"names-and-type-references"},"Names and type references"),(0,r.kt)("h3",{id:"injection"},"Injection"),(0,r.kt)("h2",{id:"types"},"Types"),(0,r.kt)("h3",{id:"tboolean"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.boolean()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.boolean()\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.boolean()")," type represents boolean values, ",(0,r.kt)("inlineCode",{parentName:"p"},"true")," or ",(0,r.kt)("inlineCode",{parentName:"p"},"false"),"."),(0,r.kt)("h3",{id:"tinteger"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.integer()")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.integer()")," type represents 32-bit integers."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.integer()\n")),(0,r.kt)("h4",{id:"constraints"},"Constraints"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Constraint"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"min")),(0,r.kt)("td",{parentName:"tr",align:null},"The minimum value of the integer.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"max")),(0,r.kt)("td",{parentName:"tr",align:null},"The maximum value of the integer.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"x_min")),(0,r.kt)("td",{parentName:"tr",align:null},"The minimum value of the integer, exclusive.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"x_max")),(0,r.kt)("td",{parentName:"tr",align:null},"The maximum value of the integer, exclusive.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"multiple_of")),(0,r.kt)("td",{parentName:"tr",align:null},"The integer must be a multiple of this value.")))),(0,r.kt)("h4",{id:"examples"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\n# non-negative integer\nt.integer().min(0)\n\n# an integer in the rage [18, 120)\nadult_age = t.integer().min(18).x_max(120)\n\n# an even integer\nt.integer().multiple_of(2)\n")),(0,r.kt)("h3",{id:"tnumber"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.number()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.number()\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.number()")," type represents numbers, stored in double precision floating-point format (",(0,r.kt)("a",{parentName:"p",href:"https://en.wikipedia.org/wiki/IEEE_754"},"IEEE 754"),")."),(0,r.kt)("h4",{id:"constraints-1"},"Constraints"),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.number()")," type has the same constraints as ",(0,r.kt)("inlineCode",{parentName:"p"},"t.integer()"),".\nSee ",(0,r.kt)("a",{parentName:"p",href:"#tinteger"},"integer constraints"),"."),(0,r.kt)("h4",{id:"aliases"},"Aliases"),(0,r.kt)("p",null,"The following types are aliases to the ",(0,r.kt)("inlineCode",{parentName:"p"},"t.number()")," type:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"t.float()"))),(0,r.kt)("h3",{id:"tstring"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.string()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.string()\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.string()")," type represents textual data represented as UTF-8 character sequences."),(0,r.kt)("h4",{id:"constraints-2"},"Constraints"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Constraint"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"min")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Minimum length of the string.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"max")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Maximum length of the string.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"pattern")),(0,r.kt)("td",{parentName:"tr",align:null},"String"),(0,r.kt)("td",{parentName:"tr",align:null},"Regular expression pattern that the string must match.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"format")),(0,r.kt)("td",{parentName:"tr",align:null},"String"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"http://json-schema.org/draft/2020-12/json-schema-validation.html#name-defined-formats"},"JSON schema format")," that the string must match. See ",(0,r.kt)("a",{parentName:"td",href:"#supported-formats"},"below")," for the list of supported formats.")))),(0,r.kt)("h5",{id:"supported-formats"},"Supported formats"),(0,r.kt)("p",null,"Here is the list of supported formats:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"uuid")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"json")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"email")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"uri")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"hostname")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"ean")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"phone")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"date")),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("inlineCode",{parentName:"li"},"date-time"))),(0,r.kt)("h4",{id:"examples-1"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\n\n# a non-empty string of maximum 64 characters\nt.string().min(1).max(64)\n\n# a email address\nt.string().format("email")\n\n# a json data\nt.string().format("json")\n')),(0,r.kt)("h4",{id:"tstring-aliases"},"Aliases"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Alias"),(0,r.kt)("th",{parentName:"tr",align:null},"Equivalent declaration"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.uuid()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("uuid")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.email()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("email")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.uri()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("uri")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.json")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("json")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.ean()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("ean")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.phone()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("phone")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.date()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("date")'))),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.datetime()")),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},'t.string().format("date-time")'))))),(0,r.kt)("h3",{id:"tfile"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.file()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.file()\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.file()")," represents files for upload."),(0,r.kt)("h4",{id:"type-constraints-1"},"Type Constraints"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Constraint"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"min")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Minimum size of the file in bytes.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"max")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Maximum size of the file in bytes.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"allow")),(0,r.kt)("td",{parentName:"tr",align:null},"Array of strings"),(0,r.kt)("td",{parentName:"tr",align:null},"List of allowed ",(0,r.kt)("inlineCode",{parentName:"td"},"content-type"),"s")))),(0,r.kt)("h4",{id:"examples-2"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\n\n# A file of a minimum size of 1KB\nt.file().min(1024)\n\n# A JPEG or PNG file less than 2KB\nt.file().max(2048).allow(["image/jpeg", "image/png"])\n')),(0,r.kt)("h3",{id:"toptional"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.optional()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.optional(t.string())\nt.string().optional() # equivalent syntactic sugar\n")),(0,r.kt)("h4",{id:"default-value"},"Default value"),(0,r.kt)("p",null,"If the type is used as an input type, the default value can be specified\nusing the ",(0,r.kt)("inlineCode",{parentName:"p"},".default()")," method."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\n\nt.string().optional().default("default value")\n')),(0,r.kt)("h3",{id:"tarray"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.array()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.array(t.string())\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.array()")," type represents a sequence of values of the same type."),(0,r.kt)("h4",{id:"constraints-3"},"Constraints"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Constraint"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"min")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Minimum number of items.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"max")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Maximum number of items.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"unique_items")),(0,r.kt)("td",{parentName:"tr",align:null},"Boolean"),(0,r.kt)("td",{parentName:"tr",align:null},"Whether the items must be unique.")))),(0,r.kt)("h4",{id:"examples-3"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\n# A list of strings\nt.array(t.string())\n\n# A list of unique strings\nt.array(t.string()).unique_items()\n\n# A list of strings with at least 3 items\n# and at most 10 items\nt.array(t.string()).min(3).max(10)\n")),(0,r.kt)("h3",{id:"tstruct"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.struct()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\n\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n})\n')),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.struct()")," type represents structured data, consisting of fields\nwhich map to typed values."),(0,r.kt)("p",null,"All the fields are required unless the corresponding type is wrapped in\n",(0,r.kt)("inlineCode",{parentName:"p"},"t.optional()"),".\nIn that case, the field is allowed to be missing from the data or be ",(0,r.kt)("inlineCode",{parentName:"p"},"null"),"."),(0,r.kt)("h4",{id:"constraints-4"},"Constraints"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Constraint"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"min")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Minimum number of fields.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"max")),(0,r.kt)("td",{parentName:"tr",align:null},"Integer"),(0,r.kt)("td",{parentName:"tr",align:null},"Maximum number of fields.")))),(0,r.kt)("h4",{id:"examples-4"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\n\n# A user profile\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n})\n\n# A user profile with an optional `name` field\nuser = t.struct({\n    "id": t.uuid().as_id,\n    "email": t.email(),\n    "username": t.string().min(3).max(64),\n    "name": t.optional(t.string().min(3).max(64)),\n})\n')),(0,r.kt)("h3",{id:"tunion-and-teither"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.union()")," and ",(0,r.kt)("inlineCode",{parentName:"h3"},"t.either()")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},"from typegraph import t\n\nt.union([t.string(), t.integer()])\nt.either([t.string(), t.integer()])\n")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.union")," type represents a value that can be of any of the specified types.\nThe ",(0,r.kt)("inlineCode",{parentName:"p"},"t.either")," type represents a value that must be of one and only one of the specified types."),(0,r.kt)("h3",{id:"tfunc"},(0,r.kt)("inlineCode",{parentName:"h3"},"t.func()")),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"t.func()")," type represents an operation to be performed on the typegate\nwith the specified materializer."),(0,r.kt)("p",null,"Usually, the functions are not defined explicitly, but rather\ncreated with the ",(0,r.kt)("a",{parentName:"p",href:"./runtimes"},"runtime")," instance."),(0,r.kt)("h4",{id:"parameters"},"Parameters"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"Parameter"),(0,r.kt)("th",{parentName:"tr",align:null},"Type"),(0,r.kt)("th",{parentName:"tr",align:null},"Description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"input type"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"t.struct()")),(0,r.kt)("td",{parentName:"tr",align:null},"The type of the input data.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"output type"),(0,r.kt)("td",{parentName:"tr",align:null},"any type"),(0,r.kt)("td",{parentName:"tr",align:null},"The type of the output data.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},"materializer"),(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("a",{parentName:"td",href:"./runtimes"},(0,r.kt)("inlineCode",{parentName:"a"},"Materializer"))),(0,r.kt)("td",{parentName:"tr",align:null},"The materializer to use to perform the operation/computation.")))),(0,r.kt)("h4",{id:"examples-5"},"Examples"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-python"},'from typegraph import t\nfrom typegraph.runtimes.deno import FunMat\nfrom typegraph.providers.prisma.runtimes import PrismaRuntime\n\nwith TypeGraph("math") as g:\n    add = t.func(\n        t.struct({\n            "a": t.integer(),\n            "b": t.integer(),\n        }),\n        t.integer(),\n        FunMat("(({a, b}) => a + b")\n    )\n\n    g.expose(add=add)\n\n    db = PrismaRuntime("main-db", "POSTGRES")\n\n    user = t.struct({\n        "id": t.uuid().as_id,\n        "email": t.email(),\n        "username": t.string().min(3).max(64),\n    })\n\n    g.expose(createUser=db.create(user))\n')))}u.isMDXComponent=!0}}]);