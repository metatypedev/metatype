"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[9015,8391],{48391:(e,t,n)=>{n.r(t),n.d(t,{a:()=>l,d:()=>s});var r=n(39651),o=Object.defineProperty,i=(e,t)=>o(e,"name",{value:t,configurable:!0});function a(e,t){for(var n=0;n<t.length;n++){const r=t[n];if("string"!=typeof r&&!Array.isArray(r))for(const t in r)if("default"!==t&&!(t in e)){const n=Object.getOwnPropertyDescriptor(r,t);n&&Object.defineProperty(e,t,n.get?n:{enumerable:!0,get:()=>r[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}i(a,"_mergeNamespaces");!function(e){function t(t,n,r){var o,i=t.getWrapperElement();return(o=i.appendChild(document.createElement("div"))).className=r?"CodeMirror-dialog CodeMirror-dialog-bottom":"CodeMirror-dialog CodeMirror-dialog-top","string"==typeof n?o.innerHTML=n:o.appendChild(n),e.addClass(i,"dialog-opened"),o}function n(e,t){e.state.currentNotificationClose&&e.state.currentNotificationClose(),e.state.currentNotificationClose=t}i(t,"dialogDiv"),i(n,"closeNotification"),e.defineExtension("openDialog",(function(r,o,a){a||(a={}),n(this,null);var l=t(this,r,a.bottom),s=!1,c=this;function u(t){if("string"==typeof t)h.value=t;else{if(s)return;s=!0,e.rmClass(l.parentNode,"dialog-opened"),l.parentNode.removeChild(l),c.focus(),a.onClose&&a.onClose(l)}}i(u,"close");var f,h=l.getElementsByTagName("input")[0];return h?(h.focus(),a.value&&(h.value=a.value,!1!==a.selectValueOnOpen&&h.select()),a.onInput&&e.on(h,"input",(function(e){a.onInput(e,h.value,u)})),a.onKeyUp&&e.on(h,"keyup",(function(e){a.onKeyUp(e,h.value,u)})),e.on(h,"keydown",(function(t){a&&a.onKeyDown&&a.onKeyDown(t,h.value,u)||((27==t.keyCode||!1!==a.closeOnEnter&&13==t.keyCode)&&(h.blur(),e.e_stop(t),u()),13==t.keyCode&&o(h.value,t))})),!1!==a.closeOnBlur&&e.on(l,"focusout",(function(e){null!==e.relatedTarget&&u()}))):(f=l.getElementsByTagName("button")[0])&&(e.on(f,"click",(function(){u(),c.focus()})),!1!==a.closeOnBlur&&e.on(f,"blur",u),f.focus()),u})),e.defineExtension("openConfirm",(function(r,o,a){n(this,null);var l=t(this,r,a&&a.bottom),s=l.getElementsByTagName("button"),c=!1,u=this,f=1;function h(){c||(c=!0,e.rmClass(l.parentNode,"dialog-opened"),l.parentNode.removeChild(l),u.focus())}i(h,"close"),s[0].focus();for(var p=0;p<s.length;++p){var g=s[p];(function(t){e.on(g,"click",(function(n){e.e_preventDefault(n),h(),t&&t(u)}))})(o[p]),e.on(g,"blur",(function(){--f,setTimeout((function(){f<=0&&h()}),200)})),e.on(g,"focus",(function(){++f}))}})),e.defineExtension("openNotification",(function(r,o){n(this,u);var a,l=t(this,r,o&&o.bottom),s=!1,c=o&&typeof o.duration<"u"?o.duration:5e3;function u(){s||(s=!0,clearTimeout(a),e.rmClass(l.parentNode,"dialog-opened"),l.parentNode.removeChild(l))}return i(u,"close"),e.on(l,"click",(function(t){e.e_preventDefault(t),u()})),c&&(a=setTimeout(u,c)),u}))}((0,r.r)());var l={};const s=a({__proto__:null,default:(0,r.g)(l)},[l])},99015:(e,t,n)=>{n.r(t),n.d(t,{s:()=>u});var r=n(39651),o=n(72359),i=n(48391),a=Object.defineProperty,l=(e,t)=>a(e,"name",{value:t,configurable:!0});function s(e,t){for(var n=0;n<t.length;n++){const r=t[n];if("string"!=typeof r&&!Array.isArray(r))for(const t in r)if("default"!==t&&!(t in e)){const n=Object.getOwnPropertyDescriptor(r,t);n&&Object.defineProperty(e,t,n.get?n:{enumerable:!0,get:()=>r[t]})}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}l(s,"_mergeNamespaces");!function(e){function t(e,t){return"string"==typeof e?e=new RegExp(e.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&"),t?"gi":"g"):e.global||(e=new RegExp(e.source,e.ignoreCase?"gi":"g")),{token:function(t){e.lastIndex=t.pos;var n=e.exec(t.string);if(n&&n.index==t.pos)return t.pos+=n[0].length||1,"searching";n?t.pos=n.index:t.skipToEnd()}}}function n(){this.posFrom=this.posTo=this.lastQuery=this.query=null,this.overlay=null}function r(e){return e.state.search||(e.state.search=new n)}function o(e){return"string"==typeof e&&e==e.toLowerCase()}function i(e,t,n){return e.getSearchCursor(t,n,{caseFold:o(t),multiline:!0})}function a(e,t,n,r,o){e.openDialog(t,r,{value:n,selectValueOnOpen:!0,closeOnEnter:!1,onClose:function(){d(e)},onKeyDown:o,bottom:e.options.search.bottom})}function s(e,t,n,r,o){e.openDialog?e.openDialog(t,o,{value:r,selectValueOnOpen:!0,bottom:e.options.search.bottom}):o(prompt(n,r))}function c(e,t,n,r){e.openConfirm?e.openConfirm(t,r):confirm(n)&&r[0]()}function u(e){return e.replace(/\\([nrt\\])/g,(function(e,t){return"n"==t?"\n":"r"==t?"\r":"t"==t?"\t":"\\"==t?"\\":e}))}function f(e){var t=e.match(/^\/(.*)\/([a-z]*)$/);if(t)try{e=new RegExp(t[1],-1==t[2].indexOf("i")?"":"i")}catch{}else e=u(e);return("string"==typeof e?""==e:e.test(""))&&(e=/x^/),e}function h(e,n,r){n.queryText=r,n.query=f(r),e.removeOverlay(n.overlay,o(n.query)),n.overlay=t(n.query,o(n.query)),e.addOverlay(n.overlay),e.showMatchesOnScrollbar&&(n.annotate&&(n.annotate.clear(),n.annotate=null),n.annotate=e.showMatchesOnScrollbar(n.query,o(n.query)))}function p(t,n,o,i){var c=r(t);if(c.query)return g(t,n);var u=t.getSelection()||c.lastQuery;if(u instanceof RegExp&&"x^"==u.source&&(u=null),o&&t.openDialog){var f=null,p=l((function(n,r){e.e_stop(r),n&&(n!=c.queryText&&(h(t,c,n),c.posFrom=c.posTo=t.getCursor()),f&&(f.style.opacity=1),g(t,r.shiftKey,(function(e,n){var r;n.line<3&&document.querySelector&&(r=t.display.wrapper.querySelector(".CodeMirror-dialog"))&&r.getBoundingClientRect().bottom-4>t.cursorCoords(n,"window").top&&((f=r).style.opacity=.4)})))}),"searchNext");a(t,v(t),u,p,(function(n,o){var i=e.keyName(n),a=t.getOption("extraKeys"),l=a&&a[i]||e.keyMap[t.getOption("keyMap")][i];"findNext"==l||"findPrev"==l||"findPersistentNext"==l||"findPersistentPrev"==l?(e.e_stop(n),h(t,r(t),o),t.execCommand(l)):("find"==l||"findPersistent"==l)&&(e.e_stop(n),p(o,n))})),i&&u&&(h(t,c,u),g(t,n))}else s(t,v(t),"Search for:",u,(function(e){e&&!c.query&&t.operation((function(){h(t,c,e),c.posFrom=c.posTo=t.getCursor(),g(t,n)}))}))}function g(t,n,o){t.operation((function(){var a=r(t),l=i(t,a.query,n?a.posFrom:a.posTo);!l.find(n)&&!(l=i(t,a.query,n?e.Pos(t.lastLine()):e.Pos(t.firstLine(),0))).find(n)||(t.setSelection(l.from(),l.to()),t.scrollIntoView({from:l.from(),to:l.to()},20),a.posFrom=l.from(),a.posTo=l.to(),o&&o(l.from(),l.to()))}))}function d(e){e.operation((function(){var t=r(e);t.lastQuery=t.query,t.query&&(t.query=t.queryText=null,e.removeOverlay(t.overlay),t.annotate&&(t.annotate.clear(),t.annotate=null))}))}function m(e,t){var n=e?document.createElement(e):document.createDocumentFragment();for(var r in t)n[r]=t[r];for(var o=2;o<arguments.length;o++){var i=arguments[o];n.appendChild("string"==typeof i?document.createTextNode(i):i)}return n}function v(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("Search:"))," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"})," ",m("span",{style:"color: #888",className:"CodeMirror-search-hint"},e.phrase("(Use /re/ syntax for regexp search)")))}function y(e){return m("",null," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"})," ",m("span",{style:"color: #888",className:"CodeMirror-search-hint"},e.phrase("(Use /re/ syntax for regexp search)")))}function x(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("With:"))," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"}))}function C(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("Replace?"))," ",m("button",{},e.phrase("Yes"))," ",m("button",{},e.phrase("No"))," ",m("button",{},e.phrase("All"))," ",m("button",{},e.phrase("Stop")))}function b(e,t,n){e.operation((function(){for(var r=i(e,t);r.findNext();)if("string"!=typeof t){var o=e.getRange(r.from(),r.to()).match(t);r.replace(n.replace(/\$(\d)/g,(function(e,t){return o[t]})))}else r.replace(n)}))}function O(e,t){if(!e.getOption("readOnly")){var n=e.getSelection()||r(e).lastQuery,o=t?e.phrase("Replace all:"):e.phrase("Replace:"),a=m("",null,m("span",{className:"CodeMirror-search-label"},o),y(e));s(e,a,o,n,(function(n){n&&(n=f(n),s(e,x(e),e.phrase("Replace with:"),"",(function(r){if(r=u(r),t)b(e,n,r);else{d(e);var o=i(e,n,e.getCursor("from")),a=l((function(){var t,l=o.from();!(t=o.findNext())&&(o=i(e,n),!(t=o.findNext())||l&&o.from().line==l.line&&o.from().ch==l.ch)||(e.setSelection(o.from(),o.to()),e.scrollIntoView({from:o.from(),to:o.to()}),c(e,C(e),e.phrase("Replace?"),[function(){s(t)},a,function(){b(e,n,r)}]))}),"advance"),s=l((function(e){o.replace("string"==typeof n?r:r.replace(/\$(\d)/g,(function(t,n){return e[n]}))),a()}),"doReplace");a()}})))}))}}e.defineOption("search",{bottom:!1}),l(t,"searchOverlay"),l(n,"SearchState"),l(r,"getSearchState"),l(o,"queryCaseInsensitive"),l(i,"getSearchCursor"),l(a,"persistentDialog"),l(s,"dialog"),l(c,"confirmDialog"),l(u,"parseString"),l(f,"parseQuery"),l(h,"startSearch"),l(p,"doSearch"),l(g,"findNext"),l(d,"clearSearch"),l(m,"el"),l(v,"getQueryDialog"),l(y,"getReplaceQueryDialog"),l(x,"getReplacementQueryDialog"),l(C,"getDoReplaceConfirm"),l(b,"replaceAll"),l(O,"replace"),e.commands.find=function(e){d(e),p(e)},e.commands.findPersistent=function(e){d(e),p(e,!1,!0)},e.commands.findPersistentNext=function(e){p(e,!1,!0,!0)},e.commands.findPersistentPrev=function(e){p(e,!0,!0,!0)},e.commands.findNext=p,e.commands.findPrev=function(e){p(e,!0)},e.commands.clearSearch=d,e.commands.replace=O,e.commands.replaceAll=function(e){O(e,!0)}}((0,r.r)(),(0,o.r)(),i.a);var c={};const u=s({__proto__:null,default:(0,r.g)(c)},[c])},72359:(e,t,n)=>{n.d(t,{r:()=>s});var r,o=n(39651),i=Object.defineProperty,a=(e,t)=>i(e,"name",{value:t,configurable:!0}),l={exports:{}};function s(){return r||(r=1,function(e){var t,n,r=e.Pos;function o(e){return e.flags??(e.ignoreCase?"i":"")+(e.global?"g":"")+(e.multiline?"m":"")}function i(e,t){for(var n=o(e),r=n,i=0;i<t.length;i++)-1==r.indexOf(t.charAt(i))&&(r+=t.charAt(i));return n==r?e:new RegExp(e.source,r)}function l(e){return/\\s|\\n|\n|\\W|\\D|\[\^/.test(e.source)}function s(e,t,n){t=i(t,"g");for(var o=n.line,a=n.ch,l=e.lastLine();o<=l;o++,a=0){t.lastIndex=a;var s=e.getLine(o),c=t.exec(s);if(c)return{from:r(o,c.index),to:r(o,c.index+c[0].length),match:c}}}function c(e,t,n){if(!l(t))return s(e,t,n);t=i(t,"gm");for(var o,a=1,c=n.line,u=e.lastLine();c<=u;){for(var f=0;f<a&&!(c>u);f++){var h=e.getLine(c++);o=null==o?h:o+"\n"+h}a*=2,t.lastIndex=n.ch;var p=t.exec(o);if(p){var g=o.slice(0,p.index).split("\n"),d=p[0].split("\n"),m=n.line+g.length-1,v=g[g.length-1].length;return{from:r(m,v),to:r(m+d.length-1,1==d.length?v+d[0].length:d[d.length-1].length),match:p}}}}function u(e,t,n){for(var r,o=0;o<=e.length;){t.lastIndex=o;var i=t.exec(e);if(!i)break;var a=i.index+i[0].length;if(a>e.length-n)break;(!r||a>r.index+r[0].length)&&(r=i),o=i.index+1}return r}function f(e,t,n){t=i(t,"g");for(var o=n.line,a=n.ch,l=e.firstLine();o>=l;o--,a=-1){var s=e.getLine(o),c=u(s,t,a<0?0:s.length-a);if(c)return{from:r(o,c.index),to:r(o,c.index+c[0].length),match:c}}}function h(e,t,n){if(!l(t))return f(e,t,n);t=i(t,"gm");for(var o,a=1,s=e.getLine(n.line).length-n.ch,c=n.line,h=e.firstLine();c>=h;){for(var p=0;p<a&&c>=h;p++){var g=e.getLine(c--);o=null==o?g:g+"\n"+o}a*=2;var d=u(o,t,s);if(d){var m=o.slice(0,d.index).split("\n"),v=d[0].split("\n"),y=c+m.length,x=m[m.length-1].length;return{from:r(y,x),to:r(y+v.length-1,1==v.length?x+v[0].length:v[v.length-1].length),match:d}}}}function p(e,t,n,r){if(e.length==t.length)return n;for(var o=0,i=n+Math.max(0,e.length-t.length);;){if(o==i)return o;var a=o+i>>1,l=r(e.slice(0,a)).length;if(l==n)return a;l>n?i=a:o=a+1}}function g(e,o,i,a){if(!o.length)return null;var l=a?t:n,s=l(o).split(/\r|\n\r?/);e:for(var c=i.line,u=i.ch,f=e.lastLine()+1-s.length;c<=f;c++,u=0){var h=e.getLine(c).slice(u),g=l(h);if(1==s.length){var d=g.indexOf(s[0]);if(-1==d)continue e;return i=p(h,g,d,l)+u,{from:r(c,p(h,g,d,l)+u),to:r(c,p(h,g,d+s[0].length,l)+u)}}var m=g.length-s[0].length;if(g.slice(m)==s[0]){for(var v=1;v<s.length-1;v++)if(l(e.getLine(c+v))!=s[v])continue e;var y=e.getLine(c+s.length-1),x=l(y),C=s[s.length-1];if(x.slice(0,C.length)==C)return{from:r(c,p(h,g,m,l)+u),to:r(c+s.length-1,p(y,x,C.length,l))}}}}function d(e,o,i,a){if(!o.length)return null;var l=a?t:n,s=l(o).split(/\r|\n\r?/);e:for(var c=i.line,u=i.ch,f=e.firstLine()-1+s.length;c>=f;c--,u=-1){var h=e.getLine(c);u>-1&&(h=h.slice(0,u));var g=l(h);if(1==s.length){var d=g.lastIndexOf(s[0]);if(-1==d)continue e;return{from:r(c,p(h,g,d,l)),to:r(c,p(h,g,d+s[0].length,l))}}var m=s[s.length-1];if(g.slice(0,m.length)==m){var v=1;for(i=c-s.length+1;v<s.length-1;v++)if(l(e.getLine(i+v))!=s[v])continue e;var y=e.getLine(c+1-s.length),x=l(y);if(x.slice(x.length-s[0].length)==s[0])return{from:r(c+1-s.length,p(y,x,y.length-s[0].length,l)),to:r(c,p(h,g,m.length,l))}}}}function m(e,t,n,o){var a;this.atOccurrence=!1,this.afterEmptyMatch=!1,this.doc=e,n=n?e.clipPos(n):r(0,0),this.pos={from:n,to:n},"object"==typeof o?a=o.caseFold:(a=o,o=null),"string"==typeof t?(null==a&&(a=!1),this.matches=function(n,r){return(n?d:g)(e,t,r,a)}):(t=i(t,"gm"),o&&!1===o.multiline?this.matches=function(n,r){return(n?f:s)(e,t,r)}:this.matches=function(n,r){return(n?h:c)(e,t,r)})}a(o,"regexpFlags"),a(i,"ensureFlags"),a(l,"maybeMultiline"),a(s,"searchRegexpForward"),a(c,"searchRegexpForwardMultiline"),a(u,"lastMatchIn"),a(f,"searchRegexpBackward"),a(h,"searchRegexpBackwardMultiline"),String.prototype.normalize?(t=a((function(e){return e.normalize("NFD").toLowerCase()}),"doFold"),n=a((function(e){return e.normalize("NFD")}),"noFold")):(t=a((function(e){return e.toLowerCase()}),"doFold"),n=a((function(e){return e}),"noFold")),a(p,"adjustPos"),a(g,"searchStringForward"),a(d,"searchStringBackward"),a(m,"SearchCursor"),m.prototype={findNext:function(){return this.find(!1)},findPrevious:function(){return this.find(!0)},find:function(t){var n=this.doc.clipPos(t?this.pos.from:this.pos.to);if(this.afterEmptyMatch&&this.atOccurrence&&(n=r(n.line,n.ch),t?(n.ch--,n.ch<0&&(n.line--,n.ch=(this.doc.getLine(n.line)||"").length)):(n.ch++,n.ch>(this.doc.getLine(n.line)||"").length&&(n.ch=0,n.line++)),0!=e.cmpPos(n,this.doc.clipPos(n))))return this.atOccurrence=!1;var o=this.matches(t,n);if(this.afterEmptyMatch=o&&0==e.cmpPos(o.from,o.to),o)return this.pos=o,this.atOccurrence=!0,this.pos.match||!0;var i=r(t?this.doc.firstLine():this.doc.lastLine()+1,0);return this.pos={from:i,to:i},this.atOccurrence=!1},from:function(){if(this.atOccurrence)return this.pos.from},to:function(){if(this.atOccurrence)return this.pos.to},replace:function(t,n){if(this.atOccurrence){var o=e.splitLines(t);this.doc.replaceRange(o,this.pos.from,this.pos.to,n),this.pos.to=r(this.pos.from.line+o.length-1,o[o.length-1].length+(1==o.length?this.pos.from.ch:0))}}},e.defineExtension("getSearchCursor",(function(e,t,n){return new m(this.doc,e,t,n)})),e.defineDocExtension("getSearchCursor",(function(e,t,n){return new m(this,e,t,n)})),e.defineExtension("selectMatches",(function(t,n){for(var r=[],o=this.getSearchCursor(t,this.getCursor("from"),n);o.findNext()&&!(e.cmpPos(o.to(),this.getCursor("to"))>0);)r.push({anchor:o.from(),head:o.to()});r.length&&this.setSelections(r,0)}))}((0,o.r)())),l.exports}a(s,"requireSearchcursor")}}]);