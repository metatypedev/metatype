"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[3748,9203,7153],{77153:(e,t,n)=>{n.r(t),n.d(t,{a:()=>s,d:()=>c});var r=n(57130),o=Object.defineProperty,i=(e,t)=>o(e,"name",{value:t,configurable:!0});function a(e,t){return t.forEach((function(t){t&&"string"!=typeof t&&!Array.isArray(t)&&Object.keys(t).forEach((function(n){if("default"!==n&&!(n in e)){var r=Object.getOwnPropertyDescriptor(t,n);Object.defineProperty(e,n,r.get?r:{enumerable:!0,get:function(){return t[n]}})}}))})),Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}i(a,"_mergeNamespaces");var s={exports:{}};!function(e){function t(t,n,r){var o,i=t.getWrapperElement();return(o=i.appendChild(document.createElement("div"))).className=r?"CodeMirror-dialog CodeMirror-dialog-bottom":"CodeMirror-dialog CodeMirror-dialog-top","string"==typeof n?o.innerHTML=n:o.appendChild(n),e.addClass(i,"dialog-opened"),o}function n(e,t){e.state.currentNotificationClose&&e.state.currentNotificationClose(),e.state.currentNotificationClose=t}i(t,"dialogDiv"),i(n,"closeNotification"),e.defineExtension("openDialog",(function(r,o,a){a||(a={}),n(this,null);var s=t(this,r,a.bottom),c=!1,l=this;function u(t){if("string"==typeof t)h.value=t;else{if(c)return;c=!0,e.rmClass(s.parentNode,"dialog-opened"),s.parentNode.removeChild(s),l.focus(),a.onClose&&a.onClose(s)}}i(u,"close");var f,h=s.getElementsByTagName("input")[0];return h?(h.focus(),a.value&&(h.value=a.value,!1!==a.selectValueOnOpen&&h.select()),a.onInput&&e.on(h,"input",(function(e){a.onInput(e,h.value,u)})),a.onKeyUp&&e.on(h,"keyup",(function(e){a.onKeyUp(e,h.value,u)})),e.on(h,"keydown",(function(t){a&&a.onKeyDown&&a.onKeyDown(t,h.value,u)||((27==t.keyCode||!1!==a.closeOnEnter&&13==t.keyCode)&&(h.blur(),e.e_stop(t),u()),13==t.keyCode&&o(h.value,t))})),!1!==a.closeOnBlur&&e.on(s,"focusout",(function(e){null!==e.relatedTarget&&u()}))):(f=s.getElementsByTagName("button")[0])&&(e.on(f,"click",(function(){u(),l.focus()})),!1!==a.closeOnBlur&&e.on(f,"blur",u),f.focus()),u})),e.defineExtension("openConfirm",(function(r,o,a){n(this,null);var s=t(this,r,a&&a.bottom),c=s.getElementsByTagName("button"),l=!1,u=this,f=1;function h(){l||(l=!0,e.rmClass(s.parentNode,"dialog-opened"),s.parentNode.removeChild(s),u.focus())}i(h,"close"),c[0].focus();for(var p=0;p<c.length;++p){var g=c[p];!function(t){e.on(g,"click",(function(n){e.e_preventDefault(n),h(),t&&t(u)}))}(o[p]),e.on(g,"blur",(function(){--f,setTimeout((function(){f<=0&&h()}),200)})),e.on(g,"focus",(function(){++f}))}})),e.defineExtension("openNotification",(function(r,o){n(this,u);var a,s=t(this,r,o&&o.bottom),c=!1,l=o&&void 0!==o.duration?o.duration:5e3;function u(){c||(c=!0,clearTimeout(a),e.rmClass(s.parentNode,"dialog-opened"),s.parentNode.removeChild(s))}return i(u,"close"),e.on(s,"click",(function(t){e.e_preventDefault(t),u()})),l&&(a=setTimeout(u,l)),u}))}(r.a.exports);var c=a({__proto__:null,default:s.exports},[s.exports])},53748:(e,t,n)=>{n.r(t),n.d(t,{s:()=>u});var r=n(57130),o=n(9203),i=n(77153),a=Object.defineProperty,s=(e,t)=>a(e,"name",{value:t,configurable:!0});function c(e,t){return t.forEach((function(t){t&&"string"!=typeof t&&!Array.isArray(t)&&Object.keys(t).forEach((function(n){if("default"!==n&&!(n in e)){var r=Object.getOwnPropertyDescriptor(t,n);Object.defineProperty(e,n,r.get?r:{enumerable:!0,get:function(){return t[n]}})}}))})),Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}s(c,"_mergeNamespaces");var l={exports:{}};!function(e){function t(e,t){return"string"==typeof e?e=new RegExp(e.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&"),t?"gi":"g"):e.global||(e=new RegExp(e.source,e.ignoreCase?"gi":"g")),{token:function(t){e.lastIndex=t.pos;var n=e.exec(t.string);if(n&&n.index==t.pos)return t.pos+=n[0].length||1,"searching";n?t.pos=n.index:t.skipToEnd()}}}function n(){this.posFrom=this.posTo=this.lastQuery=this.query=null,this.overlay=null}function r(e){return e.state.search||(e.state.search=new n)}function o(e){return"string"==typeof e&&e==e.toLowerCase()}function i(e,t,n){return e.getSearchCursor(t,n,{caseFold:o(t),multiline:!0})}function a(e,t,n,r,o){e.openDialog(t,r,{value:n,selectValueOnOpen:!0,closeOnEnter:!1,onClose:function(){d(e)},onKeyDown:o,bottom:e.options.search.bottom})}function c(e,t,n,r,o){e.openDialog?e.openDialog(t,o,{value:r,selectValueOnOpen:!0,bottom:e.options.search.bottom}):o(prompt(n,r))}function l(e,t,n,r){e.openConfirm?e.openConfirm(t,r):confirm(n)&&r[0]()}function u(e){return e.replace(/\\([nrt\\])/g,(function(e,t){return"n"==t?"\n":"r"==t?"\r":"t"==t?"\t":"\\"==t?"\\":e}))}function f(e){var t=e.match(/^\/(.*)\/([a-z]*)$/);if(t)try{e=new RegExp(t[1],-1==t[2].indexOf("i")?"":"i")}catch(n){}else e=u(e);return("string"==typeof e?""==e:e.test(""))&&(e=/x^/),e}function h(e,n,r){n.queryText=r,n.query=f(r),e.removeOverlay(n.overlay,o(n.query)),n.overlay=t(n.query,o(n.query)),e.addOverlay(n.overlay),e.showMatchesOnScrollbar&&(n.annotate&&(n.annotate.clear(),n.annotate=null),n.annotate=e.showMatchesOnScrollbar(n.query,o(n.query)))}function p(t,n,o,i){var l=r(t);if(l.query)return g(t,n);var u=t.getSelection()||l.lastQuery;if(u instanceof RegExp&&"x^"==u.source&&(u=null),o&&t.openDialog){var f=null,p=s((function(n,r){e.e_stop(r),n&&(n!=l.queryText&&(h(t,l,n),l.posFrom=l.posTo=t.getCursor()),f&&(f.style.opacity=1),g(t,r.shiftKey,(function(e,n){var r;n.line<3&&document.querySelector&&(r=t.display.wrapper.querySelector(".CodeMirror-dialog"))&&r.getBoundingClientRect().bottom-4>t.cursorCoords(n,"window").top&&((f=r).style.opacity=.4)})))}),"searchNext");a(t,v(t),u,p,(function(n,o){var i=e.keyName(n),a=t.getOption("extraKeys"),s=a&&a[i]||e.keyMap[t.getOption("keyMap")][i];"findNext"==s||"findPrev"==s||"findPersistentNext"==s||"findPersistentPrev"==s?(e.e_stop(n),h(t,r(t),o),t.execCommand(s)):"find"!=s&&"findPersistent"!=s||(e.e_stop(n),p(o,n))})),i&&u&&(h(t,l,u),g(t,n))}else c(t,v(t),"Search for:",u,(function(e){e&&!l.query&&t.operation((function(){h(t,l,e),l.posFrom=l.posTo=t.getCursor(),g(t,n)}))}))}function g(t,n,o){t.operation((function(){var a=r(t),s=i(t,a.query,n?a.posFrom:a.posTo);(s.find(n)||(s=i(t,a.query,n?e.Pos(t.lastLine()):e.Pos(t.firstLine(),0))).find(n))&&(t.setSelection(s.from(),s.to()),t.scrollIntoView({from:s.from(),to:s.to()},20),a.posFrom=s.from(),a.posTo=s.to(),o&&o(s.from(),s.to()))}))}function d(e){e.operation((function(){var t=r(e);t.lastQuery=t.query,t.query&&(t.query=t.queryText=null,e.removeOverlay(t.overlay),t.annotate&&(t.annotate.clear(),t.annotate=null))}))}function m(e,t){var n=e?document.createElement(e):document.createDocumentFragment();for(var r in t)n[r]=t[r];for(var o=2;o<arguments.length;o++){var i=arguments[o];n.appendChild("string"==typeof i?document.createTextNode(i):i)}return n}function v(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("Search:"))," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"})," ",m("span",{style:"color: #888",className:"CodeMirror-search-hint"},e.phrase("(Use /re/ syntax for regexp search)")))}function y(e){return m("",null," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"})," ",m("span",{style:"color: #888",className:"CodeMirror-search-hint"},e.phrase("(Use /re/ syntax for regexp search)")))}function x(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("With:"))," ",m("input",{type:"text",style:"width: 10em",className:"CodeMirror-search-field"}))}function b(e){return m("",null,m("span",{className:"CodeMirror-search-label"},e.phrase("Replace?"))," ",m("button",{},e.phrase("Yes"))," ",m("button",{},e.phrase("No"))," ",m("button",{},e.phrase("All"))," ",m("button",{},e.phrase("Stop")))}function C(e,t,n){e.operation((function(){for(var r=i(e,t);r.findNext();)if("string"!=typeof t){var o=e.getRange(r.from(),r.to()).match(t);r.replace(n.replace(/\$(\d)/g,(function(e,t){return o[t]})))}else r.replace(n)}))}function O(e,t){if(!e.getOption("readOnly")){var n=e.getSelection()||r(e).lastQuery,o=t?e.phrase("Replace all:"):e.phrase("Replace:"),a=m("",null,m("span",{className:"CodeMirror-search-label"},o),y(e));c(e,a,o,n,(function(n){n&&(n=f(n),c(e,x(e),e.phrase("Replace with:"),"",(function(r){if(r=u(r),t)C(e,n,r);else{d(e);var o=i(e,n,e.getCursor("from")),a=s((function(){var t,s=o.from();!(t=o.findNext())&&(o=i(e,n),!(t=o.findNext())||s&&o.from().line==s.line&&o.from().ch==s.ch)||(e.setSelection(o.from(),o.to()),e.scrollIntoView({from:o.from(),to:o.to()}),l(e,b(e),e.phrase("Replace?"),[function(){c(t)},a,function(){C(e,n,r)}]))}),"advance"),c=s((function(e){o.replace("string"==typeof n?r:r.replace(/\$(\d)/g,(function(t,n){return e[n]}))),a()}),"doReplace");a()}})))}))}}e.defineOption("search",{bottom:!1}),s(t,"searchOverlay"),s(n,"SearchState"),s(r,"getSearchState"),s(o,"queryCaseInsensitive"),s(i,"getSearchCursor"),s(a,"persistentDialog"),s(c,"dialog"),s(l,"confirmDialog"),s(u,"parseString"),s(f,"parseQuery"),s(h,"startSearch"),s(p,"doSearch"),s(g,"findNext"),s(d,"clearSearch"),s(m,"el"),s(v,"getQueryDialog"),s(y,"getReplaceQueryDialog"),s(x,"getReplacementQueryDialog"),s(b,"getDoReplaceConfirm"),s(C,"replaceAll"),s(O,"replace"),e.commands.find=function(e){d(e),p(e)},e.commands.findPersistent=function(e){d(e),p(e,!1,!0)},e.commands.findPersistentNext=function(e){p(e,!1,!0,!0)},e.commands.findPersistentPrev=function(e){p(e,!0,!0,!0)},e.commands.findNext=p,e.commands.findPrev=function(e){p(e,!0)},e.commands.clearSearch=d,e.commands.replace=O,e.commands.replaceAll=function(e){O(e,!0)}}(r.a.exports,o.a.exports,i.a.exports);var u=c({__proto__:null,default:l.exports},[l.exports])},9203:(e,t,n)=>{n.r(t),n.d(t,{a:()=>s,s:()=>c});var r=n(57130),o=Object.defineProperty,i=(e,t)=>o(e,"name",{value:t,configurable:!0});function a(e,t){return t.forEach((function(t){t&&"string"!=typeof t&&!Array.isArray(t)&&Object.keys(t).forEach((function(n){if("default"!==n&&!(n in e)){var r=Object.getOwnPropertyDescriptor(t,n);Object.defineProperty(e,n,r.get?r:{enumerable:!0,get:function(){return t[n]}})}}))})),Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}i(a,"_mergeNamespaces");var s={exports:{}};!function(e){var t,n,r=e.Pos;function o(e){var t=e.flags;return null!=t?t:(e.ignoreCase?"i":"")+(e.global?"g":"")+(e.multiline?"m":"")}function a(e,t){for(var n=o(e),r=n,i=0;i<t.length;i++)-1==r.indexOf(t.charAt(i))&&(r+=t.charAt(i));return n==r?e:new RegExp(e.source,r)}function s(e){return/\\s|\\n|\n|\\W|\\D|\[\^/.test(e.source)}function c(e,t,n){t=a(t,"g");for(var o=n.line,i=n.ch,s=e.lastLine();o<=s;o++,i=0){t.lastIndex=i;var c=e.getLine(o),l=t.exec(c);if(l)return{from:r(o,l.index),to:r(o,l.index+l[0].length),match:l}}}function l(e,t,n){if(!s(t))return c(e,t,n);t=a(t,"gm");for(var o,i=1,l=n.line,u=e.lastLine();l<=u;){for(var f=0;f<i&&!(l>u);f++){var h=e.getLine(l++);o=null==o?h:o+"\n"+h}i*=2,t.lastIndex=n.ch;var p=t.exec(o);if(p){var g=o.slice(0,p.index).split("\n"),d=p[0].split("\n"),m=n.line+g.length-1,v=g[g.length-1].length;return{from:r(m,v),to:r(m+d.length-1,1==d.length?v+d[0].length:d[d.length-1].length),match:p}}}}function u(e,t,n){for(var r,o=0;o<=e.length;){t.lastIndex=o;var i=t.exec(e);if(!i)break;var a=i.index+i[0].length;if(a>e.length-n)break;(!r||a>r.index+r[0].length)&&(r=i),o=i.index+1}return r}function f(e,t,n){t=a(t,"g");for(var o=n.line,i=n.ch,s=e.firstLine();o>=s;o--,i=-1){var c=e.getLine(o),l=u(c,t,i<0?0:c.length-i);if(l)return{from:r(o,l.index),to:r(o,l.index+l[0].length),match:l}}}function h(e,t,n){if(!s(t))return f(e,t,n);t=a(t,"gm");for(var o,i=1,c=e.getLine(n.line).length-n.ch,l=n.line,h=e.firstLine();l>=h;){for(var p=0;p<i&&l>=h;p++){var g=e.getLine(l--);o=null==o?g:g+"\n"+o}i*=2;var d=u(o,t,c);if(d){var m=o.slice(0,d.index).split("\n"),v=d[0].split("\n"),y=l+m.length,x=m[m.length-1].length;return{from:r(y,x),to:r(y+v.length-1,1==v.length?x+v[0].length:v[v.length-1].length),match:d}}}}function p(e,t,n,r){if(e.length==t.length)return n;for(var o=0,i=n+Math.max(0,e.length-t.length);;){if(o==i)return o;var a=o+i>>1,s=r(e.slice(0,a)).length;if(s==n)return a;s>n?i=a:o=a+1}}function g(e,o,i,a){if(!o.length)return null;var s=a?t:n,c=s(o).split(/\r|\n\r?/);e:for(var l=i.line,u=i.ch,f=e.lastLine()+1-c.length;l<=f;l++,u=0){var h=e.getLine(l).slice(u),g=s(h);if(1==c.length){var d=g.indexOf(c[0]);if(-1==d)continue e;return i=p(h,g,d,s)+u,{from:r(l,p(h,g,d,s)+u),to:r(l,p(h,g,d+c[0].length,s)+u)}}var m=g.length-c[0].length;if(g.slice(m)==c[0]){for(var v=1;v<c.length-1;v++)if(s(e.getLine(l+v))!=c[v])continue e;var y=e.getLine(l+c.length-1),x=s(y),b=c[c.length-1];if(x.slice(0,b.length)==b)return{from:r(l,p(h,g,m,s)+u),to:r(l+c.length-1,p(y,x,b.length,s))}}}}function d(e,o,i,a){if(!o.length)return null;var s=a?t:n,c=s(o).split(/\r|\n\r?/);e:for(var l=i.line,u=i.ch,f=e.firstLine()-1+c.length;l>=f;l--,u=-1){var h=e.getLine(l);u>-1&&(h=h.slice(0,u));var g=s(h);if(1==c.length){var d=g.lastIndexOf(c[0]);if(-1==d)continue e;return{from:r(l,p(h,g,d,s)),to:r(l,p(h,g,d+c[0].length,s))}}var m=c[c.length-1];if(g.slice(0,m.length)==m){var v=1;for(i=l-c.length+1;v<c.length-1;v++)if(s(e.getLine(i+v))!=c[v])continue e;var y=e.getLine(l+1-c.length),x=s(y);if(x.slice(x.length-c[0].length)==c[0])return{from:r(l+1-c.length,p(y,x,y.length-c[0].length,s)),to:r(l,p(h,g,m.length,s))}}}}function m(e,t,n,o){var i;this.atOccurrence=!1,this.afterEmptyMatch=!1,this.doc=e,n=n?e.clipPos(n):r(0,0),this.pos={from:n,to:n},"object"==typeof o?i=o.caseFold:(i=o,o=null),"string"==typeof t?(null==i&&(i=!1),this.matches=function(n,r){return(n?d:g)(e,t,r,i)}):(t=a(t,"gm"),o&&!1===o.multiline?this.matches=function(n,r){return(n?f:c)(e,t,r)}:this.matches=function(n,r){return(n?h:l)(e,t,r)})}i(o,"regexpFlags"),i(a,"ensureFlags"),i(s,"maybeMultiline"),i(c,"searchRegexpForward"),i(l,"searchRegexpForwardMultiline"),i(u,"lastMatchIn"),i(f,"searchRegexpBackward"),i(h,"searchRegexpBackwardMultiline"),String.prototype.normalize?(t=i((function(e){return e.normalize("NFD").toLowerCase()}),"doFold"),n=i((function(e){return e.normalize("NFD")}),"noFold")):(t=i((function(e){return e.toLowerCase()}),"doFold"),n=i((function(e){return e}),"noFold")),i(p,"adjustPos"),i(g,"searchStringForward"),i(d,"searchStringBackward"),i(m,"SearchCursor"),m.prototype={findNext:function(){return this.find(!1)},findPrevious:function(){return this.find(!0)},find:function(t){var n=this.doc.clipPos(t?this.pos.from:this.pos.to);if(this.afterEmptyMatch&&this.atOccurrence&&(n=r(n.line,n.ch),t?(n.ch--,n.ch<0&&(n.line--,n.ch=(this.doc.getLine(n.line)||"").length)):(n.ch++,n.ch>(this.doc.getLine(n.line)||"").length&&(n.ch=0,n.line++)),0!=e.cmpPos(n,this.doc.clipPos(n))))return this.atOccurrence=!1;var o=this.matches(t,n);if(this.afterEmptyMatch=o&&0==e.cmpPos(o.from,o.to),o)return this.pos=o,this.atOccurrence=!0,this.pos.match||!0;var i=r(t?this.doc.firstLine():this.doc.lastLine()+1,0);return this.pos={from:i,to:i},this.atOccurrence=!1},from:function(){if(this.atOccurrence)return this.pos.from},to:function(){if(this.atOccurrence)return this.pos.to},replace:function(t,n){if(this.atOccurrence){var o=e.splitLines(t);this.doc.replaceRange(o,this.pos.from,this.pos.to,n),this.pos.to=r(this.pos.from.line+o.length-1,o[o.length-1].length+(1==o.length?this.pos.from.ch:0))}}},e.defineExtension("getSearchCursor",(function(e,t,n){return new m(this.doc,e,t,n)})),e.defineDocExtension("getSearchCursor",(function(e,t,n){return new m(this,e,t,n)})),e.defineExtension("selectMatches",(function(t,n){for(var r=[],o=this.getSearchCursor(t,this.getCursor("from"),n);o.findNext()&&!(e.cmpPos(o.to(),this.getCursor("to"))>0);)r.push({anchor:o.from(),head:o.to()});r.length&&this.setSelections(r,0)}))}(r.a.exports);var c=a({__proto__:null,default:s.exports},[s.exports])}}]);