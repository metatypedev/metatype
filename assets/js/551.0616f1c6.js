"use strict";
exports.id = 551;
exports.ids = [551];
exports.modules = {

/***/ 84551:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GiscusWidget: () => (/* binding */ p)
/* harmony export */ });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const H = globalThis, V = H.ShadowRoot && (H.ShadyCSS === void 0 || H.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, q = Symbol(), J = /* @__PURE__ */ new WeakMap();
let ot = class {
  constructor(t, e, s) {
    if (this._$cssResult$ = !0, s !== q)
      throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (V && t === void 0) {
      const s = e !== void 0 && e.length === 1;
      s && (t = J.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && J.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const ut = (i) => new ot(typeof i == "string" ? i : i + "", void 0, q), $t = (i, ...t) => {
  const e = i.length === 1 ? i[0] : t.reduce((s, r, o) => s + ((n) => {
    if (n._$cssResult$ === !0)
      return n.cssText;
    if (typeof n == "number")
      return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + i[o + 1], i[0]);
  return new ot(e, i, q);
}, _t = (i, t) => {
  if (V)
    i.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else
    for (const e of t) {
      const s = document.createElement("style"), r = H.litNonce;
      r !== void 0 && s.setAttribute("nonce", r), s.textContent = e.cssText, i.appendChild(s);
    }
}, F = V ? (i) => i : (i) => i instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const s of t.cssRules)
    e += s.cssText;
  return ut(e);
})(i) : i;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: gt, defineProperty: ft, getOwnPropertyDescriptor: mt, getOwnPropertyNames: At, getOwnPropertySymbols: yt, getPrototypeOf: St } = Object, A = globalThis, Q = A.trustedTypes, vt = Q ? Q.emptyScript : "", Y = A.reactiveElementPolyfillSupport, U = (i, t) => i, L = { toAttribute(i, t) {
  switch (t) {
    case Boolean:
      i = i ? vt : null;
      break;
    case Object:
    case Array:
      i = i == null ? i : JSON.stringify(i);
  }
  return i;
}, fromAttribute(i, t) {
  let e = i;
  switch (t) {
    case Boolean:
      e = i !== null;
      break;
    case Number:
      e = i === null ? null : Number(i);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(i);
      } catch {
        e = null;
      }
  }
  return e;
} }, K = (i, t) => !gt(i, t), Z = { attribute: !0, type: String, converter: L, reflect: !1, hasChanged: K };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), A.litPropertyMetadata ?? (A.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
class E extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = Z) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.elementProperties.set(t, e), !e.noAccessor) {
      const s = Symbol(), r = this.getPropertyDescriptor(t, s, e);
      r !== void 0 && ft(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, e, s) {
    const { get: r, set: o } = mt(this.prototype, t) ?? { get() {
      return this[e];
    }, set(n) {
      this[e] = n;
    } };
    return { get() {
      return r == null ? void 0 : r.call(this);
    }, set(n) {
      const a = r == null ? void 0 : r.call(this);
      o.call(this, n), this.requestUpdate(t, a, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? Z;
  }
  static _$Ei() {
    if (this.hasOwnProperty(U("elementProperties")))
      return;
    const t = St(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(U("finalized")))
      return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(U("properties"))) {
      const e = this.properties, s = [...At(e), ...yt(e)];
      for (const r of s)
        this.createProperty(r, e[r]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0)
        for (const [s, r] of e)
          this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s] of this.elementProperties) {
      const r = this._$Eu(e, s);
      r !== void 0 && this._$Eh.set(r, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const r of s)
        e.unshift(F(r));
    } else
      t !== void 0 && e.push(F(t));
    return e;
  }
  static _$Eu(t, e) {
    const s = e.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s of e.keys())
      this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return _t(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostConnected) == null ? void 0 : s.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var s;
      return (s = e.hostDisconnected) == null ? void 0 : s.call(e);
    });
  }
  attributeChangedCallback(t, e, s) {
    this._$AK(t, s);
  }
  _$EC(t, e) {
    var o;
    const s = this.constructor.elementProperties.get(t), r = this.constructor._$Eu(t, s);
    if (r !== void 0 && s.reflect === !0) {
      const n = (((o = s.converter) == null ? void 0 : o.toAttribute) !== void 0 ? s.converter : L).toAttribute(e, s.type);
      this._$Em = t, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o;
    const s = this.constructor, r = s._$Eh.get(t);
    if (r !== void 0 && this._$Em !== r) {
      const n = s.getPropertyOptions(r), a = typeof n.converter == "function" ? { fromAttribute: n.converter } : ((o = n.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? n.converter : L;
      this._$Em = r, this[r] = a.fromAttribute(e, n.type), this._$Em = null;
    }
  }
  requestUpdate(t, e, s) {
    if (t !== void 0) {
      if (s ?? (s = this.constructor.getPropertyOptions(t)), !(s.hasChanged ?? K)(this[t], e))
        return;
      this.P(t, e, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$ET());
  }
  P(t, e, s) {
    this._$AL.has(t) || this._$AL.set(t, e), s.reflect === !0 && this._$Em !== t && (this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Set())).add(t);
  }
  async _$ET() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending)
      return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, n] of this._$Ep)
          this[o] = n;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0)
        for (const [o, n] of r)
          n.wrapped !== !0 || this._$AL.has(o) || this[o] === void 0 || this.P(o, this[o], n);
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (s = this._$EO) == null || s.forEach((r) => {
        var o;
        return (o = r.hostUpdate) == null ? void 0 : o.call(r);
      }), this.update(e)) : this._$EU();
    } catch (r) {
      throw t = !1, this._$EU(), r;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((s) => {
      var r;
      return (r = s.hostUpdated) == null ? void 0 : r.call(s);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EU() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Ej && (this._$Ej = this._$Ej.forEach((e) => this._$EC(e, this[e]))), this._$EU();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
}
E.elementStyles = [], E.shadowRootOptions = { mode: "open" }, E[U("elementProperties")] = /* @__PURE__ */ new Map(), E[U("finalized")] = /* @__PURE__ */ new Map(), Y == null || Y({ ReactiveElement: E }), (A.reactiveElementVersions ?? (A.reactiveElementVersions = [])).push("2.0.4");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const P = globalThis, k = P.trustedTypes, X = k ? k.createPolicy("lit-html", { createHTML: (i) => i }) : void 0, ht = "$lit$", m = `lit$${(Math.random() + "").slice(9)}$`, at = "?" + m, Et = `<${at}>`, v = document, N = () => v.createComment(""), R = (i) => i === null || typeof i != "object" && typeof i != "function", ct = Array.isArray, bt = (i) => ct(i) || typeof (i == null ? void 0 : i[Symbol.iterator]) == "function", j = `[ 	
\f\r]`, w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, tt = /-->/g, et = />/g, y = RegExp(`>|${j}(?:([^\\s"'>=/]+)(${j}*=${j}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), st = /'/g, it = /"/g, lt = /^(?:script|style|textarea|title)$/i, Ct = (i) => (t, ...e) => ({ _$litType$: i, strings: t, values: e }), wt = Ct(1), b = Symbol.for("lit-noChange"), l = Symbol.for("lit-nothing"), rt = /* @__PURE__ */ new WeakMap(), S = v.createTreeWalker(v, 129);
function dt(i, t) {
  if (!Array.isArray(i) || !i.hasOwnProperty("raw"))
    throw Error("invalid template strings array");
  return X !== void 0 ? X.createHTML(t) : t;
}
const Ut = (i, t) => {
  const e = i.length - 1, s = [];
  let r, o = t === 2 ? "<svg>" : "", n = w;
  for (let a = 0; a < e; a++) {
    const h = i[a];
    let d, u, c = -1, g = 0;
    for (; g < h.length && (n.lastIndex = g, u = n.exec(h), u !== null); )
      g = n.lastIndex, n === w ? u[1] === "!--" ? n = tt : u[1] !== void 0 ? n = et : u[2] !== void 0 ? (lt.test(u[2]) && (r = RegExp("</" + u[2], "g")), n = y) : u[3] !== void 0 && (n = y) : n === y ? u[0] === ">" ? (n = r ?? w, c = -1) : u[1] === void 0 ? c = -2 : (c = n.lastIndex - u[2].length, d = u[1], n = u[3] === void 0 ? y : u[3] === '"' ? it : st) : n === it || n === st ? n = y : n === tt || n === et ? n = w : (n = y, r = void 0);
    const f = n === y && i[a + 1].startsWith("/>") ? " " : "";
    o += n === w ? h + Et : c >= 0 ? (s.push(d), h.slice(0, c) + ht + h.slice(c) + m + f) : h + m + (c === -2 ? a : f);
  }
  return [dt(i, o + (i[e] || "<?>") + (t === 2 ? "</svg>" : "")), s];
};
class I {
  constructor({ strings: t, _$litType$: e }, s) {
    let r;
    this.parts = [];
    let o = 0, n = 0;
    const a = t.length - 1, h = this.parts, [d, u] = Ut(t, e);
    if (this.el = I.createElement(d, s), S.currentNode = this.el.content, e === 2) {
      const c = this.el.content.firstChild;
      c.replaceWith(...c.childNodes);
    }
    for (; (r = S.nextNode()) !== null && h.length < a; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes())
          for (const c of r.getAttributeNames())
            if (c.endsWith(ht)) {
              const g = u[n++], f = r.getAttribute(c).split(m), x = /([.?@])?(.*)/.exec(g);
              h.push({ type: 1, index: o, name: x[2], strings: f, ctor: x[1] === "." ? Tt : x[1] === "?" ? Ot : x[1] === "@" ? Nt : z }), r.removeAttribute(c);
            } else
              c.startsWith(m) && (h.push({ type: 6, index: o }), r.removeAttribute(c));
        if (lt.test(r.tagName)) {
          const c = r.textContent.split(m), g = c.length - 1;
          if (g > 0) {
            r.textContent = k ? k.emptyScript : "";
            for (let f = 0; f < g; f++)
              r.append(c[f], N()), S.nextNode(), h.push({ type: 2, index: ++o });
            r.append(c[g], N());
          }
        }
      } else if (r.nodeType === 8)
        if (r.data === at)
          h.push({ type: 2, index: o });
        else {
          let c = -1;
          for (; (c = r.data.indexOf(m, c + 1)) !== -1; )
            h.push({ type: 7, index: o }), c += m.length - 1;
        }
      o++;
    }
  }
  static createElement(t, e) {
    const s = v.createElement("template");
    return s.innerHTML = t, s;
  }
}
function C(i, t, e = i, s) {
  var n, a;
  if (t === b)
    return t;
  let r = s !== void 0 ? (n = e._$Co) == null ? void 0 : n[s] : e._$Cl;
  const o = R(t) ? void 0 : t._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== o && ((a = r == null ? void 0 : r._$AO) == null || a.call(r, !1), o === void 0 ? r = void 0 : (r = new o(i), r._$AT(i, e, s)), s !== void 0 ? (e._$Co ?? (e._$Co = []))[s] = r : e._$Cl = r), r !== void 0 && (t = C(i, r._$AS(i, t.values), r, s)), t;
}
let Pt = class {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: s } = this._$AD, r = ((t == null ? void 0 : t.creationScope) ?? v).importNode(e, !0);
    S.currentNode = r;
    let o = S.nextNode(), n = 0, a = 0, h = s[0];
    for (; h !== void 0; ) {
      if (n === h.index) {
        let d;
        h.type === 2 ? d = new M(o, o.nextSibling, this, t) : h.type === 1 ? d = new h.ctor(o, h.name, h.strings, this, t) : h.type === 6 && (d = new Rt(o, this, t)), this._$AV.push(d), h = s[++a];
      }
      n !== (h == null ? void 0 : h.index) && (o = S.nextNode(), n++);
    }
    return S.currentNode = v, r;
  }
  p(t) {
    let e = 0;
    for (const s of this._$AV)
      s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, e), e += s.strings.length - 2) : s._$AI(t[e])), e++;
  }
};
class M {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, s, r) {
    this.type = 2, this._$AH = l, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = C(this, t, e), R(t) ? t === l || t == null || t === "" ? (this._$AH !== l && this._$AR(), this._$AH = l) : t !== this._$AH && t !== b && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : bt(t) ? this.k(t) : this._(t);
  }
  S(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.S(t));
  }
  _(t) {
    this._$AH !== l && R(this._$AH) ? this._$AA.nextSibling.data = t : this.T(v.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: s } = t, r = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = I.createElement(dt(s.h, s.h[0]), this.options)), s);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === r)
      this._$AH.p(e);
    else {
      const n = new Pt(r, this), a = n.u(this.options);
      n.p(e), this.T(a), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = rt.get(t.strings);
    return e === void 0 && rt.set(t.strings, e = new I(t)), e;
  }
  k(t) {
    ct(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s, r = 0;
    for (const o of t)
      r === e.length ? e.push(s = new M(this.S(N()), this.S(N()), this, this.options)) : s = e[r], s._$AI(o), r++;
    r < e.length && (this._$AR(s && s._$AB.nextSibling, r), e.length = r);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, e); t && t !== this._$AB; ) {
      const r = t.nextSibling;
      t.remove(), t = r;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class z {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s, r, o) {
    this.type = 1, this._$AH = l, this._$AN = void 0, this.element = t, this.name = e, this._$AM = r, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = l;
  }
  _$AI(t, e = this, s, r) {
    const o = this.strings;
    let n = !1;
    if (o === void 0)
      t = C(this, t, e, 0), n = !R(t) || t !== this._$AH && t !== b, n && (this._$AH = t);
    else {
      const a = t;
      let h, d;
      for (t = o[0], h = 0; h < o.length - 1; h++)
        d = C(this, a[s + h], e, h), d === b && (d = this._$AH[h]), n || (n = !R(d) || d !== this._$AH[h]), d === l ? t = l : t !== l && (t += (d ?? "") + o[h + 1]), this._$AH[h] = d;
    }
    n && !r && this.j(t);
  }
  j(t) {
    t === l ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Tt extends z {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === l ? void 0 : t;
  }
}
class Ot extends z {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== l);
  }
}
class Nt extends z {
  constructor(t, e, s, r, o) {
    super(t, e, s, r, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = C(this, t, e, 0) ?? l) === b)
      return;
    const s = this._$AH, r = t === l && s !== l || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, o = t !== l && (s === l || r);
    r && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Rt {
  constructor(t, e, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    C(this, t);
  }
}
const B = P.litHtmlPolyfillSupport;
B == null || B(I, M), (P.litHtmlVersions ?? (P.litHtmlVersions = [])).push("3.1.2");
const It = (i, t, e) => {
  const s = (e == null ? void 0 : e.renderBefore) ?? t;
  let r = s._$litPart$;
  if (r === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    s._$litPart$ = r = new M(t.insertBefore(N(), o), o, void 0, e ?? {});
  }
  return r._$AI(i), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
let T = class extends E {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = It(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return b;
  }
};
var nt;
T._$litElement$ = !0, T.finalized = !0, (nt = globalThis.litElementHydrateSupport) == null || nt.call(globalThis, { LitElement: T });
const G = globalThis.litElementPolyfillSupport;
G == null || G({ LitElement: T });
(globalThis.litElementVersions ?? (globalThis.litElementVersions = [])).push("4.0.4");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Mt = (i) => (t, e) => {
  e !== void 0 ? e.addInitializer(() => {
    customElements.define(i, t);
  }) : customElements.define(i, t);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const xt = { attribute: !0, type: String, converter: L, reflect: !1, hasChanged: K }, Ht = (i = xt, t, e) => {
  const { kind: s, metadata: r } = e;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), o.set(e.name, i), s === "accessor") {
    const { name: n } = e;
    return { set(a) {
      const h = t.get.call(this);
      t.set.call(this, a), this.requestUpdate(n, h, i);
    }, init(a) {
      return a !== void 0 && this.P(n, void 0, i), a;
    } };
  }
  if (s === "setter") {
    const { name: n } = e;
    return function(a) {
      const h = this[n];
      t.call(this, a), this.requestUpdate(n, h, i);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function _(i) {
  return (t, e) => typeof e == "object" ? Ht(i, t, e) : ((s, r, o) => {
    const n = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, n ? { ...s, wrapped: !0 } : s), n ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(i, t, e);
}
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Lt = (i) => i.strings === void 0;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const kt = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 }, Dt = (i) => (...t) => ({ _$litDirective$: i, values: t });
let zt = class {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, s) {
    this._$Ct = t, this._$AM = e, this._$Ci = s;
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const O = (i, t) => {
  var s;
  const e = i._$AN;
  if (e === void 0)
    return !1;
  for (const r of e)
    (s = r._$AO) == null || s.call(r, t, !1), O(r, t);
  return !0;
}, D = (i) => {
  let t, e;
  do {
    if ((t = i._$AM) === void 0)
      break;
    e = t._$AN, e.delete(i), i = t;
  } while ((e == null ? void 0 : e.size) === 0);
}, pt = (i) => {
  for (let t; t = i._$AM; i = t) {
    let e = t._$AN;
    if (e === void 0)
      t._$AN = e = /* @__PURE__ */ new Set();
    else if (e.has(i))
      break;
    e.add(i), Bt(t);
  }
};
function Yt(i) {
  this._$AN !== void 0 ? (D(this), this._$AM = i, pt(this)) : this._$AM = i;
}
function jt(i, t = !1, e = 0) {
  const s = this._$AH, r = this._$AN;
  if (r !== void 0 && r.size !== 0)
    if (t)
      if (Array.isArray(s))
        for (let o = e; o < s.length; o++)
          O(s[o], !1), D(s[o]);
      else
        s != null && (O(s, !1), D(s));
    else
      O(this, i);
}
const Bt = (i) => {
  i.type == kt.CHILD && (i._$AP ?? (i._$AP = jt), i._$AQ ?? (i._$AQ = Yt));
};
class Gt extends zt {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(t, e, s) {
    super._$AT(t, e, s), pt(this), this.isConnected = t._$AU;
  }
  _$AO(t, e = !0) {
    var s, r;
    t !== this.isConnected && (this.isConnected = t, t ? (s = this.reconnected) == null || s.call(this) : (r = this.disconnected) == null || r.call(this)), e && (O(this, t), D(this));
  }
  setValue(t) {
    if (Lt(this._$Ct))
      this._$Ct._$AI(t, this);
    else {
      const e = [...this._$Ct._$AH];
      e[this._$Ci] = t, this._$Ct._$AI(e, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
}
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Wt = () => new Vt();
class Vt {
}
const W = /* @__PURE__ */ new WeakMap(), qt = Dt(class extends Gt {
  render(i) {
    return l;
  }
  update(i, [t]) {
    var s;
    const e = t !== this.Y;
    return e && this.Y !== void 0 && this.rt(void 0), (e || this.lt !== this.ct) && (this.Y = t, this.ht = (s = i.options) == null ? void 0 : s.host, this.rt(this.ct = i.element)), l;
  }
  rt(i) {
    if (typeof this.Y == "function") {
      const t = this.ht ?? globalThis;
      let e = W.get(t);
      e === void 0 && (e = /* @__PURE__ */ new WeakMap(), W.set(t, e)), e.get(this.Y) !== void 0 && this.Y.call(this.ht, void 0), e.set(this.Y, i), i !== void 0 && this.Y.call(this.ht, i);
    } else
      this.Y.value = i;
  }
  get lt() {
    var i, t;
    return typeof this.Y == "function" ? (i = W.get(this.ht ?? globalThis)) == null ? void 0 : i.get(this.Y) : (t = this.Y) == null ? void 0 : t.value;
  }
  disconnected() {
    this.lt === this.ct && this.rt(void 0);
  }
  reconnected() {
    this.rt(this.ct);
  }
});
var Kt = Object.defineProperty, Jt = Object.getOwnPropertyDescriptor, $ = (i, t, e, s) => {
  for (var r = s > 1 ? void 0 : s ? Jt(t, e) : t, o = i.length - 1, n; o >= 0; o--)
    (n = i[o]) && (r = (s ? n(t, e, r) : n(r)) || r);
  return s && r && Kt(t, e, r), r;
};
function Ft(i) {
  return customElements.get(i) ? (t) => t : Mt(i);
}
let p = class extends T {
  constructor() {
    super(), this.GISCUS_SESSION_KEY = "giscus-session", this.GISCUS_DEFAULT_HOST = "https://giscus.app", this.ERROR_SUGGESTION = "Please consider reporting this error at https://github.com/giscus/giscus/issues/new.", this.__session = "", this._iframeRef = Wt(), this.messageEventHandler = this.handleMessageEvent.bind(this), this.hasLoaded = !1, this.host = this.GISCUS_DEFAULT_HOST, this.strict = "0", this.reactionsEnabled = "1", this.emitMetadata = "0", this.inputPosition = "bottom", this.theme = "light", this.lang = "en", this.loading = "eager", this.setupSession(), window.addEventListener("message", this.messageEventHandler);
  }
  get iframeRef() {
    var i;
    return (i = this._iframeRef) == null ? void 0 : i.value;
  }
  get _host() {
    try {
      return new URL(this.host), this.host;
    } catch {
      return this.GISCUS_DEFAULT_HOST;
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("message", this.messageEventHandler);
  }
  _formatError(i) {
    return `[giscus] An error occurred. Error message: "${i}".`;
  }
  setupSession() {
    const i = location.href, t = new URL(i), e = localStorage.getItem(this.GISCUS_SESSION_KEY), s = t.searchParams.get("giscus") ?? "";
    if (this.__session = "", s) {
      localStorage.setItem(this.GISCUS_SESSION_KEY, JSON.stringify(s)), this.__session = s, t.searchParams.delete("giscus"), t.hash = "", history.replaceState(void 0, document.title, t.toString());
      return;
    }
    if (e)
      try {
        this.__session = JSON.parse(e);
      } catch (r) {
        localStorage.removeItem(this.GISCUS_SESSION_KEY), console.warn(
          `${this._formatError(
            r == null ? void 0 : r.message
          )} Session has been cleared.`
        );
      }
  }
  signOut() {
    localStorage.removeItem(this.GISCUS_SESSION_KEY), this.__session = "", this.update(/* @__PURE__ */ new Map());
  }
  handleMessageEvent(i) {
    if (i.origin !== this._host)
      return;
    const { data: t } = i;
    if (!(typeof t == "object" && t.giscus))
      return;
    if (this.iframeRef && t.giscus.resizeHeight && (this.iframeRef.style.height = `${t.giscus.resizeHeight}px`), t.giscus.signOut) {
      console.info("[giscus] User has logged out. Session has been cleared."), this.signOut();
      return;
    }
    if (!t.giscus.error)
      return;
    const e = t.giscus.error;
    if (e.includes("Bad credentials") || e.includes("Invalid state value") || e.includes("State has expired")) {
      if (localStorage.getItem(this.GISCUS_SESSION_KEY) !== null) {
        console.warn(`${this._formatError(e)} Session has been cleared.`), this.signOut();
        return;
      }
      console.error(
        `${this._formatError(e)} No session is stored initially. ${this.ERROR_SUGGESTION}`
      );
    }
    if (e.includes("Discussion not found")) {
      console.warn(
        `[giscus] ${e}. A new discussion will be created if a comment/reaction is submitted.`
      );
      return;
    }
    console.error(`${this._formatError(e)} ${this.ERROR_SUGGESTION}`);
  }
  sendMessage(i) {
    var t;
    !((t = this.iframeRef) != null && t.contentWindow) || !this.hasLoaded || this.iframeRef.contentWindow.postMessage({ giscus: i }, this._host);
  }
  updateConfig() {
    const i = {
      setConfig: {
        repo: this.repo,
        repoId: this.repoId,
        category: this.category,
        categoryId: this.categoryId,
        term: this.getTerm(),
        number: +this.getNumber(),
        strict: this.strict === "1",
        reactionsEnabled: this.reactionsEnabled === "1",
        emitMetadata: this.emitMetadata === "1",
        inputPosition: this.inputPosition,
        theme: this.theme,
        lang: this.lang
      }
    };
    this.sendMessage(i);
  }
  firstUpdated() {
    var i;
    (i = this.iframeRef) == null || i.addEventListener("load", () => {
      var t;
      (t = this.iframeRef) == null || t.classList.remove("loading"), this.hasLoaded = !0, this.updateConfig();
    });
  }
  requestUpdate(i, t, e) {
    if (!this.hasUpdated || i === "host") {
      super.requestUpdate(i, t, e);
      return;
    }
    this.updateConfig();
  }
  getMetaContent(i, t = !1) {
    const e = t ? `meta[property='og:${i}'],` : "", s = document.querySelector(
      e + `meta[name='${i}']`
    );
    return s ? s.content : "";
  }
  _getCleanedUrl() {
    const i = new URL(location.href);
    return i.searchParams.delete("giscus"), i.hash = "", i;
  }
  getTerm() {
    switch (this.mapping) {
      case "url":
        return this._getCleanedUrl().toString();
      case "title":
        return document.title;
      case "og:title":
        return this.getMetaContent("title", !0);
      case "specific":
        return this.term ?? "";
      case "number":
        return "";
      case "pathname":
      default:
        return location.pathname.length < 2 ? "index" : location.pathname.substring(1).replace(/\.\w+$/, "");
    }
  }
  getNumber() {
    return this.mapping === "number" ? this.term ?? "" : "";
  }
  getIframeSrc() {
    const i = this._getCleanedUrl().toString(), t = `${i}${this.id ? "#" + this.id : ""}`, e = this.getMetaContent("description", !0), s = this.getMetaContent("giscus:backlink") || i, r = {
      origin: t,
      session: this.__session,
      repo: this.repo,
      repoId: this.repoId ?? "",
      category: this.category ?? "",
      categoryId: this.categoryId ?? "",
      term: this.getTerm(),
      number: this.getNumber(),
      strict: this.strict,
      reactionsEnabled: this.reactionsEnabled,
      emitMetadata: this.emitMetadata,
      inputPosition: this.inputPosition,
      theme: this.theme,
      description: e,
      backLink: s
    }, o = this._host, n = this.lang ? `/${this.lang}` : "", a = new URLSearchParams(r);
    return `${o}${n}/widget?${a.toString()}`;
  }
  render() {
    return wt`
      <iframe
        title="Comments"
        scrolling="no"
        class="loading"
        ${qt(this._iframeRef)}
        src=${this.getIframeSrc()}
        loading=${this.loading}
        allow="clipboard-write"
        part="iframe"
      ></iframe>
    `;
  }
};
p.styles = $t`
    :host,
    iframe {
      width: 100%;
      border: none;
      min-height: 150px;
      color-scheme: light dark;
    }

    iframe.loading {
      opacity: 0;
    }
  `;
$([
  _({ reflect: !0 })
], p.prototype, "host", 2);
$([
  _({ reflect: !0 })
], p.prototype, "repo", 2);
$([
  _({ reflect: !0 })
], p.prototype, "repoId", 2);
$([
  _({ reflect: !0 })
], p.prototype, "category", 2);
$([
  _({ reflect: !0 })
], p.prototype, "categoryId", 2);
$([
  _({ reflect: !0 })
], p.prototype, "mapping", 2);
$([
  _({ reflect: !0 })
], p.prototype, "term", 2);
$([
  _({ reflect: !0 })
], p.prototype, "strict", 2);
$([
  _({ reflect: !0 })
], p.prototype, "reactionsEnabled", 2);
$([
  _({ reflect: !0 })
], p.prototype, "emitMetadata", 2);
$([
  _({ reflect: !0 })
], p.prototype, "inputPosition", 2);
$([
  _({ reflect: !0 })
], p.prototype, "theme", 2);
$([
  _({ reflect: !0 })
], p.prototype, "lang", 2);
$([
  _({ reflect: !0 })
], p.prototype, "loading", 2);
p = $([
  Ft("giscus-widget")
], p);



/***/ })

};
;