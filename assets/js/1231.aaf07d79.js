"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[1231,5595],{55595:(e,t,r)=>{r.r(t),r.d(t,{C:()=>l,c:()=>i});var n=r(79408);function a(e,t){for(var r=0;r<t.length;r++){const n=t[r];if("string"!=typeof n&&!Array.isArray(n))for(const t in n)if("default"!==t&&!(t in e)){const r=Object.getOwnPropertyDescriptor(n,t);r&&Object.defineProperty(e,t,r.get?r:{enumerable:!0,get:()=>n[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(0,Object.defineProperty)(a,"name",{value:"_mergeNamespaces",configurable:!0});var u=(0,n.r)();const l=(0,n.g)(u),i=a({__proto__:null,default:l},[u])},39050:(e,t,r)=>{r.d(t,{i:()=>n});function n(e,t){var r,n;const{levels:a,indentLevel:u}=e;return((a&&0!==a.length?a.at(-1)-(null!==(r=this.electricInput)&&void 0!==r&&r.test(t)?1:0):u)||0)*((null===(n=this.config)||void 0===n?void 0:n.indentUnit)||0)}(0,Object.defineProperty)(n,"name",{value:"indent",configurable:!0})},41231:(e,t,r)=>{r.r(t);var n=r(55595),a=r(53208),u=r(39050),l=(r(79408),Object.defineProperty);n.C.defineMode("graphql-variables",(e=>{const t=(0,a.Xs)({eatWhitespace:e=>e.eatSpace(),lexRules:i,parseRules:c,editorConfig:{tabSize:e.tabSize}});return{config:e,startState:t.startState,token:t.token,indent:u.i,electricInput:/^\s*[}\]]/,fold:"brace",closeBrackets:{pairs:'[]{}""',explode:"[]{}"}}}));const i={Punctuation:/^\[|]|\{|\}|:|,/,Number:/^-?(?:0|(?:[1-9][0-9]*))(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/,String:/^"(?:[^"\\]|\\(?:"|\/|\\|b|f|n|r|t|u[0-9a-fA-F]{4}))*"?/,Keyword:/^true|false|null/},c={Document:[(0,a.p)("{"),(0,a.pb)("Variable",(0,a.MD)((0,a.p)(","))),(0,a.p)("}")],Variable:[s("variable"),(0,a.p)(":"),"Value"],Value(e){switch(e.kind){case"Number":return"NumberValue";case"String":return"StringValue";case"Punctuation":switch(e.value){case"[":return"ListValue";case"{":return"ObjectValue"}return null;case"Keyword":switch(e.value){case"true":case"false":return"BooleanValue";case"null":return"NullValue"}return null}},NumberValue:[(0,a.t)("Number","number")],StringValue:[(0,a.t)("String","string")],BooleanValue:[(0,a.t)("Keyword","builtin")],NullValue:[(0,a.t)("Keyword","keyword")],ListValue:[(0,a.p)("["),(0,a.pb)("Value",(0,a.MD)((0,a.p)(","))),(0,a.p)("]")],ObjectValue:[(0,a.p)("{"),(0,a.pb)("ObjectField",(0,a.MD)((0,a.p)(","))),(0,a.p)("}")],ObjectField:[s("attribute"),(0,a.p)(":"),"Value"]};function s(e){return{style:e,match:e=>"String"===e.kind,update(e,t){e.name=t.value.slice(1,-1)}}}l(s,"name",{value:"namedKey",configurable:!0})}}]);