"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9461],{4594:(e,t,n)=>{n.d(t,{a:()=>c,b:()=>f,c:()=>d,d:()=>m,e:()=>g,g:()=>l});var i=n(7337),a=n(8084),r=n(718),u=Object.defineProperty,o=(e,t)=>u(e,"name",{value:t,configurable:!0});function l(e,t){const n={schema:e,type:null,parentType:null,inputType:null,directiveDef:null,fieldDef:null,argDef:null,argDefs:null,objectFieldDefs:null};return(0,r.f)(t,(t=>{var a,r;switch(t.kind){case"Query":case"ShortQuery":n.type=e.getQueryType();break;case"Mutation":n.type=e.getMutationType();break;case"Subscription":n.type=e.getSubscriptionType();break;case"InlineFragment":case"FragmentDefinition":t.type&&(n.type=e.getType(t.type));break;case"Field":case"AliasedField":n.fieldDef=n.type&&t.name?s(e,n.parentType,t.name):null,n.type=null===(a=n.fieldDef)||void 0===a?void 0:a.type;break;case"SelectionSet":n.parentType=n.type?(0,i.xC)(n.type):null;break;case"Directive":n.directiveDef=t.name?e.getDirective(t.name):null;break;case"Arguments":const u=t.prevState?"Field"===t.prevState.kind?n.fieldDef:"Directive"===t.prevState.kind?n.directiveDef:"AliasedField"===t.prevState.kind?t.prevState.name&&s(e,n.parentType,t.prevState.name):null:null;n.argDefs=u?u.args:null;break;case"Argument":if(n.argDef=null,n.argDefs)for(let e=0;e<n.argDefs.length;e++)if(n.argDefs[e].name===t.name){n.argDef=n.argDefs[e];break}n.inputType=null===(r=n.argDef)||void 0===r?void 0:r.type;break;case"EnumValue":const o=n.inputType?(0,i.xC)(n.inputType):null;n.enumValue=o instanceof i.mR?p(o.getValues(),(e=>e.value===t.name)):null;break;case"ListValue":const l=n.inputType?(0,i.tf)(n.inputType):null;n.inputType=l instanceof i.p2?l.ofType:null;break;case"ObjectValue":const c=n.inputType?(0,i.xC)(n.inputType):null;n.objectFieldDefs=c instanceof i.sR?c.getFields():null;break;case"ObjectField":const f=t.name&&n.objectFieldDefs?n.objectFieldDefs[t.name]:null;n.inputType=null==f?void 0:f.type;break;case"NamedType":n.type=t.name?e.getType(t.name):null}})),n}function s(e,t,n){return n===a.S.name&&e.getQueryType()===t?a.S:n===a.T.name&&e.getQueryType()===t?a.T:n===a.a.name&&(0,i.Gv)(t)?a.a:t&&t.getFields?t.getFields()[n]:void 0}function p(e,t){for(let n=0;n<e.length;n++)if(t(e[n]))return e[n]}function c(e){return{kind:"Field",schema:e.schema,field:e.fieldDef,type:y(e.fieldDef)?null:e.parentType}}function f(e){return{kind:"Directive",schema:e.schema,directive:e.directiveDef}}function d(e){return e.directiveDef?{kind:"Argument",schema:e.schema,argument:e.argDef,directive:e.directiveDef}:{kind:"Argument",schema:e.schema,argument:e.argDef,field:e.fieldDef,type:y(e.fieldDef)?null:e.parentType}}function m(e){return{kind:"EnumValue",value:e.enumValue||void 0,type:e.inputType?(0,i.xC)(e.inputType):void 0}}function g(e,t){return{kind:"Type",schema:e.schema,type:t||e.type}}function y(e){return"__"===e.name.slice(0,2)}o(l,"getTypeInfo"),o(s,"getFieldDef"),o(p,"find"),o(c,"getFieldReference"),o(f,"getDirectiveReference"),o(d,"getArgumentReference"),o(m,"getEnumValueReference"),o(g,"getTypeReference"),o(y,"isMetaField")},718:(e,t,n)=>{n.d(t,{f:()=>i});function i(e,t){const n=[];let i=e;for(;null==i?void 0:i.kind;)n.push(i),i=i.prevState;for(let a=n.length-1;a>=0;a--)t(n[a])}(0,Object.defineProperty)(i,"name",{value:"forEachState",configurable:!0})},9461:(e,t,n)=>{n.r(t);var i=n(7130),a=n(4594),r=(n(8084),n(959),n(1527),n(422),n(718),Object.defineProperty),u=(e,t)=>r(e,"name",{value:t,configurable:!0});function o(e,t){const n=t.target||t.srcElement;if(!(n instanceof HTMLElement))return;if("SPAN"!==(null==n?void 0:n.nodeName))return;const i=n.getBoundingClientRect(),a={left:(i.left+i.right)/2,top:(i.top+i.bottom)/2};e.state.jump.cursor=a,e.state.jump.isHoldingModifier&&f(e)}function l(e){e.state.jump.isHoldingModifier||!e.state.jump.cursor?e.state.jump.isHoldingModifier&&e.state.jump.marker&&d(e):e.state.jump.cursor=null}function s(e,t){if(e.state.jump.isHoldingModifier||!c(t.key))return;e.state.jump.isHoldingModifier=!0,e.state.jump.cursor&&f(e);const n=u((u=>{u.code===t.code&&(e.state.jump.isHoldingModifier=!1,e.state.jump.marker&&d(e),i.C.off(document,"keyup",n),i.C.off(document,"click",a),e.off("mousedown",r))}),"onKeyUp"),a=u((t=>{const{destination:n,options:i}=e.state.jump;n&&i.onClick(n,t)}),"onClick"),r=u(((t,n)=>{e.state.jump.destination&&(n.codemirrorIgnore=!0)}),"onMouseDown");i.C.on(document,"keyup",n),i.C.on(document,"click",a),e.on("mousedown",r)}i.C.defineOption("jump",!1,((e,t,n)=>{if(n&&n!==i.C.Init){const t=e.state.jump.onMouseOver;i.C.off(e.getWrapperElement(),"mouseover",t);const n=e.state.jump.onMouseOut;i.C.off(e.getWrapperElement(),"mouseout",n),i.C.off(document,"keydown",e.state.jump.onKeyDown),delete e.state.jump}if(t){const n=e.state.jump={options:t,onMouseOver:o.bind(null,e),onMouseOut:l.bind(null,e),onKeyDown:s.bind(null,e)};i.C.on(e.getWrapperElement(),"mouseover",n.onMouseOver),i.C.on(e.getWrapperElement(),"mouseout",n.onMouseOut),i.C.on(document,"keydown",n.onKeyDown)}})),u(o,"onMouseOver"),u(l,"onMouseOut"),u(s,"onKeyDown");const p="undefined"!=typeof navigator&&navigator&&navigator.appVersion.includes("Mac");function c(e){return e===(p?"Meta":"Control")}function f(e){if(e.state.jump.marker)return;const{cursor:t,options:n}=e.state.jump,i=e.coordsChar(t),a=e.getTokenAt(i,!0),r=n.getDestination||e.getHelper(i,"jump");if(r){const t=r(a,n,e);if(t){const n=e.markText({line:i.line,ch:a.start},{line:i.line,ch:a.end},{className:"CodeMirror-jump-token"});e.state.jump.marker=n,e.state.jump.destination=t}}}function d(e){const{marker:t}=e.state.jump;e.state.jump.marker=null,e.state.jump.destination=null,t.clear()}u(c,"isJumpModifier"),u(f,"enableJumpMode"),u(d,"disableJumpMode"),i.C.registerHelper("jump","graphql",((e,t)=>{if(!t.schema||!t.onClick||!e.state)return;const{state:n}=e,{kind:i,step:r}=n,u=(0,a.g)(t.schema,n);return"Field"===i&&0===r&&u.fieldDef||"AliasedField"===i&&2===r&&u.fieldDef?(0,a.a)(u):"Directive"===i&&1===r&&u.directiveDef?(0,a.b)(u):"Argument"===i&&0===r&&u.argDef?(0,a.c)(u):"EnumValue"===i&&u.enumValue?(0,a.d)(u):"NamedType"===i&&u.type?(0,a.e)(u):void 0}))}}]);