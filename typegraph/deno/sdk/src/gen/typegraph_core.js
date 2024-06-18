import { expandPath, pathExists, print, readFile, writeFile } from '../host/host.js';

const base64Compile = str => WebAssembly.compile(typeof Buffer !== 'undefined' ? Buffer.from(str, 'base64') : Uint8Array.from(atob(str), b => b.charCodeAt(0)));

class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

let dv = new DataView(new ArrayBuffer());
const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
let _fs;
async function fetchCompile (url) {
  if (isNode) {
    _fs = _fs || await import('fs/promises');
    return WebAssembly.compile(await _fs.readFile(url));
  }
  return fetch(url).then(WebAssembly.compileStreaming);
}

function getErrorPayload(e) {
  if (e && hasOwnProperty.call(e, 'payload')) return e.payload;
  if (e instanceof Error) throw e;
  return e;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

const instantiateCore = WebAssembly.instantiate;

function throwInvalidBool() {
  throw new TypeError('invalid variant discriminant for bool');
}

function toInt32(val) {
  return val >> 0;
}

function toUint32(val) {
  return val >>> 0;
}

const utf8Decoder = new TextDecoder();

const utf8Encoder = new TextEncoder();

let utf8EncodedLen = 0;
function utf8Encode(s, realloc, memory) {
  if (typeof s !== 'string') throw new TypeError('expected a string');
  if (s.length === 0) {
    utf8EncodedLen = 0;
    return 1;
  }
  let allocLen = 0;
  let ptr = 0;
  let writtenTotal = 0;
  while (s.length > 0) {
    ptr = realloc(ptr, allocLen, 1, allocLen += s.length * 2);
    const { read, written } = utf8Encoder.encodeInto(
    s,
    new Uint8Array(memory.buffer, ptr + writtenTotal, allocLen - writtenTotal),
    );
    writtenTotal += written;
    s = s.slice(read);
  }
  utf8EncodedLen = writtenTotal;
  return ptr;
}


let exports0;
let exports1;
let memory0;
let realloc0;

function trampoline0(arg0, arg1) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  print(result0);
}

function trampoline1(arg0, arg1, arg2, arg3, arg4) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  var len2 = arg3;
  var base2 = arg2;
  var result2 = [];
  for (let i = 0; i < len2; i++) {
    const base = base2 + i * 8;
    var ptr1 = dataView(memory0).getInt32(base + 0, true);
    var len1 = dataView(memory0).getInt32(base + 4, true);
    var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
    result2.push(result1);
  }
  let ret;
  try {
    ret = { tag: 'ok', val: expandPath(result0, result2)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  var variant6 = ret;
  switch (variant6.tag) {
    case 'ok': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg4 + 0, 0, true);
      var vec4 = e;
      var len4 = vec4.length;
      var result4 = realloc0(0, 0, 4, len4 * 8);
      for (let i = 0; i < vec4.length; i++) {
        const e = vec4[i];
        const base = result4 + i * 8;var ptr3 = utf8Encode(e, realloc0, memory0);
        var len3 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 4, len3, true);
        dataView(memory0).setInt32(base + 0, ptr3, true);
      }
      dataView(memory0).setInt32(arg4 + 8, len4, true);
      dataView(memory0).setInt32(arg4 + 4, result4, true);
      break;
    }
    case 'err': {
      const e = variant6.val;
      dataView(memory0).setInt8(arg4 + 0, 1, true);
      var ptr5 = utf8Encode(e, realloc0, memory0);
      var len5 = utf8EncodedLen;
      dataView(memory0).setInt32(arg4 + 8, len5, true);
      dataView(memory0).setInt32(arg4 + 4, ptr5, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
}

function trampoline2(arg0, arg1, arg2) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  let ret;
  try {
    ret = { tag: 'ok', val: pathExists(result0)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  var variant2 = ret;
  switch (variant2.tag) {
    case 'ok': {
      const e = variant2.val;
      dataView(memory0).setInt8(arg2 + 0, 0, true);
      dataView(memory0).setInt8(arg2 + 4, e ? 1 : 0, true);
      break;
    }
    case 'err': {
      const e = variant2.val;
      dataView(memory0).setInt8(arg2 + 0, 1, true);
      var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setInt32(arg2 + 8, len1, true);
      dataView(memory0).setInt32(arg2 + 4, ptr1, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
}

function trampoline3(arg0, arg1, arg2) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  let ret;
  try {
    ret = { tag: 'ok', val: readFile(result0)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  var variant3 = ret;
  switch (variant3.tag) {
    case 'ok': {
      const e = variant3.val;
      dataView(memory0).setInt8(arg2 + 0, 0, true);
      var val1 = e;
      var len1 = val1.byteLength;
      var ptr1 = realloc0(0, 0, 1, len1 * 1);
      var src1 = new Uint8Array(val1.buffer || val1, val1.byteOffset, len1 * 1);
      (new Uint8Array(memory0.buffer, ptr1, len1 * 1)).set(src1);
      dataView(memory0).setInt32(arg2 + 8, len1, true);
      dataView(memory0).setInt32(arg2 + 4, ptr1, true);
      break;
    }
    case 'err': {
      const e = variant3.val;
      dataView(memory0).setInt8(arg2 + 0, 1, true);
      var ptr2 = utf8Encode(e, realloc0, memory0);
      var len2 = utf8EncodedLen;
      dataView(memory0).setInt32(arg2 + 8, len2, true);
      dataView(memory0).setInt32(arg2 + 4, ptr2, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
}

function trampoline4(arg0, arg1, arg2, arg3, arg4) {
  var ptr0 = arg0;
  var len0 = arg1;
  var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
  var ptr1 = arg2;
  var len1 = arg3;
  var result1 = new Uint8Array(memory0.buffer.slice(ptr1, ptr1 + len1 * 1));
  let ret;
  try {
    ret = { tag: 'ok', val: writeFile(result0, result1)};
  } catch (e) {
    ret = { tag: 'err', val: getErrorPayload(e) };
  }
  var variant3 = ret;
  switch (variant3.tag) {
    case 'ok': {
      const e = variant3.val;
      dataView(memory0).setInt8(arg4 + 0, 0, true);
      break;
    }
    case 'err': {
      const e = variant3.val;
      dataView(memory0).setInt8(arg4 + 0, 1, true);
      var ptr2 = utf8Encode(e, realloc0, memory0);
      var len2 = utf8EncodedLen;
      dataView(memory0).setInt32(arg4 + 8, len2, true);
      dataView(memory0).setInt32(arg4 + 4, ptr2, true);
      break;
    }
    default: {
      throw new TypeError('invalid variant specified for result');
    }
  }
}
let exports2;
let postReturn0;
let postReturn1;
let postReturn2;
let postReturn3;
let postReturn4;
let postReturn5;
let postReturn6;

function initTypegraph(arg0) {
  var ptr0 = realloc0(0, 0, 4, 108);
  var {name: v1_0, dynamic: v1_1, path: v1_2, prefix: v1_3, cors: v1_4, rate: v1_5 } = arg0;
  var ptr2 = utf8Encode(v1_0, realloc0, memory0);
  var len2 = utf8EncodedLen;
  dataView(memory0).setInt32(ptr0 + 4, len2, true);
  dataView(memory0).setInt32(ptr0 + 0, ptr2, true);
  var variant3 = v1_1;
  if (variant3 === null || variant3=== undefined) {
    dataView(memory0).setInt8(ptr0 + 8, 0, true);
  } else {
    const e = variant3;
    dataView(memory0).setInt8(ptr0 + 8, 1, true);
    dataView(memory0).setInt8(ptr0 + 9, e ? 1 : 0, true);
  }
  var ptr4 = utf8Encode(v1_2, realloc0, memory0);
  var len4 = utf8EncodedLen;
  dataView(memory0).setInt32(ptr0 + 16, len4, true);
  dataView(memory0).setInt32(ptr0 + 12, ptr4, true);
  var variant6 = v1_3;
  if (variant6 === null || variant6=== undefined) {
    dataView(memory0).setInt8(ptr0 + 20, 0, true);
  } else {
    const e = variant6;
    dataView(memory0).setInt8(ptr0 + 20, 1, true);
    var ptr5 = utf8Encode(e, realloc0, memory0);
    var len5 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 28, len5, true);
    dataView(memory0).setInt32(ptr0 + 24, ptr5, true);
  }
  var {allowOrigin: v7_0, allowHeaders: v7_1, exposeHeaders: v7_2, allowMethods: v7_3, allowCredentials: v7_4, maxAgeSec: v7_5 } = v1_4;
  var vec9 = v7_0;
  var len9 = vec9.length;
  var result9 = realloc0(0, 0, 4, len9 * 8);
  for (let i = 0; i < vec9.length; i++) {
    const e = vec9[i];
    const base = result9 + i * 8;var ptr8 = utf8Encode(e, realloc0, memory0);
    var len8 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len8, true);
    dataView(memory0).setInt32(base + 0, ptr8, true);
  }
  dataView(memory0).setInt32(ptr0 + 36, len9, true);
  dataView(memory0).setInt32(ptr0 + 32, result9, true);
  var vec11 = v7_1;
  var len11 = vec11.length;
  var result11 = realloc0(0, 0, 4, len11 * 8);
  for (let i = 0; i < vec11.length; i++) {
    const e = vec11[i];
    const base = result11 + i * 8;var ptr10 = utf8Encode(e, realloc0, memory0);
    var len10 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len10, true);
    dataView(memory0).setInt32(base + 0, ptr10, true);
  }
  dataView(memory0).setInt32(ptr0 + 44, len11, true);
  dataView(memory0).setInt32(ptr0 + 40, result11, true);
  var vec13 = v7_2;
  var len13 = vec13.length;
  var result13 = realloc0(0, 0, 4, len13 * 8);
  for (let i = 0; i < vec13.length; i++) {
    const e = vec13[i];
    const base = result13 + i * 8;var ptr12 = utf8Encode(e, realloc0, memory0);
    var len12 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len12, true);
    dataView(memory0).setInt32(base + 0, ptr12, true);
  }
  dataView(memory0).setInt32(ptr0 + 52, len13, true);
  dataView(memory0).setInt32(ptr0 + 48, result13, true);
  var vec15 = v7_3;
  var len15 = vec15.length;
  var result15 = realloc0(0, 0, 4, len15 * 8);
  for (let i = 0; i < vec15.length; i++) {
    const e = vec15[i];
    const base = result15 + i * 8;var ptr14 = utf8Encode(e, realloc0, memory0);
    var len14 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len14, true);
    dataView(memory0).setInt32(base + 0, ptr14, true);
  }
  dataView(memory0).setInt32(ptr0 + 60, len15, true);
  dataView(memory0).setInt32(ptr0 + 56, result15, true);
  dataView(memory0).setInt8(ptr0 + 64, v7_4 ? 1 : 0, true);
  var variant16 = v7_5;
  if (variant16 === null || variant16=== undefined) {
    dataView(memory0).setInt8(ptr0 + 68, 0, true);
  } else {
    const e = variant16;
    dataView(memory0).setInt8(ptr0 + 68, 1, true);
    dataView(memory0).setInt32(ptr0 + 72, toUint32(e), true);
  }
  var variant20 = v1_5;
  if (variant20 === null || variant20=== undefined) {
    dataView(memory0).setInt8(ptr0 + 76, 0, true);
  } else {
    const e = variant20;
    dataView(memory0).setInt8(ptr0 + 76, 1, true);
    var {windowLimit: v17_0, windowSec: v17_1, queryLimit: v17_2, contextIdentifier: v17_3, localExcess: v17_4 } = e;
    dataView(memory0).setInt32(ptr0 + 80, toUint32(v17_0), true);
    dataView(memory0).setInt32(ptr0 + 84, toUint32(v17_1), true);
    dataView(memory0).setInt32(ptr0 + 88, toUint32(v17_2), true);
    var variant19 = v17_3;
    if (variant19 === null || variant19=== undefined) {
      dataView(memory0).setInt8(ptr0 + 92, 0, true);
    } else {
      const e = variant19;
      dataView(memory0).setInt8(ptr0 + 92, 1, true);
      var ptr18 = utf8Encode(e, realloc0, memory0);
      var len18 = utf8EncodedLen;
      dataView(memory0).setInt32(ptr0 + 100, len18, true);
      dataView(memory0).setInt32(ptr0 + 96, ptr18, true);
    }
    dataView(memory0).setInt32(ptr0 + 104, toUint32(v17_4), true);
  }
  const ret = exports1['metatype:typegraph/core#init-typegraph'](ptr0);
  let variant23;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant23= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      var len22 = dataView(memory0).getInt32(ret + 8, true);
      var base22 = dataView(memory0).getInt32(ret + 4, true);
      var result22 = [];
      for (let i = 0; i < len22; i++) {
        const base = base22 + i * 8;
        var ptr21 = dataView(memory0).getInt32(base + 0, true);
        var len21 = dataView(memory0).getInt32(base + 4, true);
        var result21 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr21, len21));
        result22.push(result21);
      }
      variant23= {
        tag: 'err',
        val: {
          stack: result22,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant23.tag === 'err') {
    throw new ComponentError(variant23.val);
  }
  return variant23.val;
}

function serializeTypegraph(arg0) {
  var {typegraphPath: v0_0, prefix: v0_1, artifactResolution: v0_2, codegen: v0_3, prismaMigration: v0_4, pretty: v0_5 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant3 = v0_1;
  let variant3_0;
  let variant3_1;
  let variant3_2;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
    variant3_2 = 0;
  } else {
    const e = variant3;
    var ptr2 = utf8Encode(e, realloc0, memory0);
    var len2 = utf8EncodedLen;
    variant3_0 = 1;
    variant3_1 = ptr2;
    variant3_2 = len2;
  }
  var {migrationsDir: v4_0, migrationActions: v4_1, defaultMigrationAction: v4_2 } = v0_4;
  var ptr5 = utf8Encode(v4_0, realloc0, memory0);
  var len5 = utf8EncodedLen;
  var vec9 = v4_1;
  var len9 = vec9.length;
  var result9 = realloc0(0, 0, 4, len9 * 12);
  for (let i = 0; i < vec9.length; i++) {
    const e = vec9[i];
    const base = result9 + i * 12;var [tuple6_0, tuple6_1] = e;
    var ptr7 = utf8Encode(tuple6_0, realloc0, memory0);
    var len7 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len7, true);
    dataView(memory0).setInt32(base + 0, ptr7, true);
    var {apply: v8_0, create: v8_1, reset: v8_2 } = tuple6_1;
    dataView(memory0).setInt8(base + 8, v8_0 ? 1 : 0, true);
    dataView(memory0).setInt8(base + 9, v8_1 ? 1 : 0, true);
    dataView(memory0).setInt8(base + 10, v8_2 ? 1 : 0, true);
  }
  var {apply: v10_0, create: v10_1, reset: v10_2 } = v4_2;
  const ret = exports1['metatype:typegraph/core#serialize-typegraph'](ptr1, len1, variant3_0, variant3_1, variant3_2, v0_2 ? 1 : 0, v0_3 ? 1 : 0, ptr5, len5, result9, len9, v10_0 ? 1 : 0, v10_1 ? 1 : 0, v10_2 ? 1 : 0, v0_5 ? 1 : 0);
  let variant17;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr11 = dataView(memory0).getInt32(ret + 4, true);
      var len11 = dataView(memory0).getInt32(ret + 8, true);
      var result11 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr11, len11));
      var len14 = dataView(memory0).getInt32(ret + 16, true);
      var base14 = dataView(memory0).getInt32(ret + 12, true);
      var result14 = [];
      for (let i = 0; i < len14; i++) {
        const base = base14 + i * 20;
        var ptr12 = dataView(memory0).getInt32(base + 0, true);
        var len12 = dataView(memory0).getInt32(base + 4, true);
        var result12 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr12, len12));
        var ptr13 = dataView(memory0).getInt32(base + 8, true);
        var len13 = dataView(memory0).getInt32(base + 12, true);
        var result13 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr13, len13));
        result14.push({
          path: result12,
          hash: result13,
          size: dataView(memory0).getInt32(base + 16, true) >>> 0,
        });
      }
      variant17= {
        tag: 'ok',
        val: [result11, result14]
      };
      break;
    }
    case 1: {
      var len16 = dataView(memory0).getInt32(ret + 8, true);
      var base16 = dataView(memory0).getInt32(ret + 4, true);
      var result16 = [];
      for (let i = 0; i < len16; i++) {
        const base = base16 + i * 8;
        var ptr15 = dataView(memory0).getInt32(base + 0, true);
        var len15 = dataView(memory0).getInt32(base + 4, true);
        var result15 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr15, len15));
        result16.push(result15);
      }
      variant17= {
        tag: 'err',
        val: {
          stack: result16,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn1(ret);
  if (variant17.tag === 'err') {
    throw new ComponentError(variant17.val);
  }
  return variant17.val;
}

function withInjection(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/core#with-injection'](toUint32(arg0), ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function refb(arg0, arg1) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var vec4 = arg1;
  var len4 = vec4.length;
  var result4 = realloc0(0, 0, 4, len4 * 16);
  for (let i = 0; i < vec4.length; i++) {
    const e = vec4[i];
    const base = result4 + i * 16;var [tuple1_0, tuple1_1] = e;
    var ptr2 = utf8Encode(tuple1_0, realloc0, memory0);
    var len2 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len2, true);
    dataView(memory0).setInt32(base + 0, ptr2, true);
    var ptr3 = utf8Encode(tuple1_1, realloc0, memory0);
    var len3 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 12, len3, true);
    dataView(memory0).setInt32(base + 8, ptr3, true);
  }
  const ret = exports1['metatype:typegraph/core#refb'](ptr0, len0, result4, len4);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function integerb(arg0, arg1) {
  var ptr0 = realloc0(0, 0, 4, 80);
  var {min: v1_0, max: v1_1, exclusiveMinimum: v1_2, exclusiveMaximum: v1_3, multipleOf: v1_4, enumeration: v1_5 } = arg0;
  var variant2 = v1_0;
  if (variant2 === null || variant2=== undefined) {
    dataView(memory0).setInt8(ptr0 + 0, 0, true);
  } else {
    const e = variant2;
    dataView(memory0).setInt8(ptr0 + 0, 1, true);
    dataView(memory0).setInt32(ptr0 + 4, toInt32(e), true);
  }
  var variant3 = v1_1;
  if (variant3 === null || variant3=== undefined) {
    dataView(memory0).setInt8(ptr0 + 8, 0, true);
  } else {
    const e = variant3;
    dataView(memory0).setInt8(ptr0 + 8, 1, true);
    dataView(memory0).setInt32(ptr0 + 12, toInt32(e), true);
  }
  var variant4 = v1_2;
  if (variant4 === null || variant4=== undefined) {
    dataView(memory0).setInt8(ptr0 + 16, 0, true);
  } else {
    const e = variant4;
    dataView(memory0).setInt8(ptr0 + 16, 1, true);
    dataView(memory0).setInt32(ptr0 + 20, toInt32(e), true);
  }
  var variant5 = v1_3;
  if (variant5 === null || variant5=== undefined) {
    dataView(memory0).setInt8(ptr0 + 24, 0, true);
  } else {
    const e = variant5;
    dataView(memory0).setInt8(ptr0 + 24, 1, true);
    dataView(memory0).setInt32(ptr0 + 28, toInt32(e), true);
  }
  var variant6 = v1_4;
  if (variant6 === null || variant6=== undefined) {
    dataView(memory0).setInt8(ptr0 + 32, 0, true);
  } else {
    const e = variant6;
    dataView(memory0).setInt8(ptr0 + 32, 1, true);
    dataView(memory0).setInt32(ptr0 + 36, toInt32(e), true);
  }
  var variant8 = v1_5;
  if (variant8 === null || variant8=== undefined) {
    dataView(memory0).setInt8(ptr0 + 40, 0, true);
  } else {
    const e = variant8;
    dataView(memory0).setInt8(ptr0 + 40, 1, true);
    var val7 = e;
    var len7 = val7.length;
    var ptr7 = realloc0(0, 0, 4, len7 * 4);
    var src7 = new Uint8Array(val7.buffer, val7.byteOffset, len7 * 4);
    (new Uint8Array(memory0.buffer, ptr7, len7 * 4)).set(src7);
    dataView(memory0).setInt32(ptr0 + 48, len7, true);
    dataView(memory0).setInt32(ptr0 + 44, ptr7, true);
  }
  var {name: v9_0, runtimeConfig: v9_1, asId: v9_2 } = arg1;
  var variant11 = v9_0;
  if (variant11 === null || variant11=== undefined) {
    dataView(memory0).setInt8(ptr0 + 52, 0, true);
  } else {
    const e = variant11;
    dataView(memory0).setInt8(ptr0 + 52, 1, true);
    var ptr10 = utf8Encode(e, realloc0, memory0);
    var len10 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 60, len10, true);
    dataView(memory0).setInt32(ptr0 + 56, ptr10, true);
  }
  var variant16 = v9_1;
  if (variant16 === null || variant16=== undefined) {
    dataView(memory0).setInt8(ptr0 + 64, 0, true);
  } else {
    const e = variant16;
    dataView(memory0).setInt8(ptr0 + 64, 1, true);
    var vec15 = e;
    var len15 = vec15.length;
    var result15 = realloc0(0, 0, 4, len15 * 16);
    for (let i = 0; i < vec15.length; i++) {
      const e = vec15[i];
      const base = result15 + i * 16;var [tuple12_0, tuple12_1] = e;
      var ptr13 = utf8Encode(tuple12_0, realloc0, memory0);
      var len13 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len13, true);
      dataView(memory0).setInt32(base + 0, ptr13, true);
      var ptr14 = utf8Encode(tuple12_1, realloc0, memory0);
      var len14 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len14, true);
      dataView(memory0).setInt32(base + 8, ptr14, true);
    }
    dataView(memory0).setInt32(ptr0 + 72, len15, true);
    dataView(memory0).setInt32(ptr0 + 68, result15, true);
  }
  dataView(memory0).setInt8(ptr0 + 76, v9_2 ? 1 : 0, true);
  const ret = exports1['metatype:typegraph/core#integerb'](ptr0);
  let variant19;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant19= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len18 = dataView(memory0).getInt32(ret + 8, true);
      var base18 = dataView(memory0).getInt32(ret + 4, true);
      var result18 = [];
      for (let i = 0; i < len18; i++) {
        const base = base18 + i * 8;
        var ptr17 = dataView(memory0).getInt32(base + 0, true);
        var len17 = dataView(memory0).getInt32(base + 4, true);
        var result17 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr17, len17));
        result18.push(result17);
      }
      variant19= {
        tag: 'err',
        val: {
          stack: result18,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant19.tag === 'err') {
    throw new ComponentError(variant19.val);
  }
  return variant19.val;
}

function floatb(arg0, arg1) {
  var ptr0 = realloc0(0, 0, 8, 128);
  var {min: v1_0, max: v1_1, exclusiveMinimum: v1_2, exclusiveMaximum: v1_3, multipleOf: v1_4, enumeration: v1_5 } = arg0;
  var variant2 = v1_0;
  if (variant2 === null || variant2=== undefined) {
    dataView(memory0).setInt8(ptr0 + 0, 0, true);
  } else {
    const e = variant2;
    dataView(memory0).setInt8(ptr0 + 0, 1, true);
    dataView(memory0).setFloat64(ptr0 + 8, +e, true);
  }
  var variant3 = v1_1;
  if (variant3 === null || variant3=== undefined) {
    dataView(memory0).setInt8(ptr0 + 16, 0, true);
  } else {
    const e = variant3;
    dataView(memory0).setInt8(ptr0 + 16, 1, true);
    dataView(memory0).setFloat64(ptr0 + 24, +e, true);
  }
  var variant4 = v1_2;
  if (variant4 === null || variant4=== undefined) {
    dataView(memory0).setInt8(ptr0 + 32, 0, true);
  } else {
    const e = variant4;
    dataView(memory0).setInt8(ptr0 + 32, 1, true);
    dataView(memory0).setFloat64(ptr0 + 40, +e, true);
  }
  var variant5 = v1_3;
  if (variant5 === null || variant5=== undefined) {
    dataView(memory0).setInt8(ptr0 + 48, 0, true);
  } else {
    const e = variant5;
    dataView(memory0).setInt8(ptr0 + 48, 1, true);
    dataView(memory0).setFloat64(ptr0 + 56, +e, true);
  }
  var variant6 = v1_4;
  if (variant6 === null || variant6=== undefined) {
    dataView(memory0).setInt8(ptr0 + 64, 0, true);
  } else {
    const e = variant6;
    dataView(memory0).setInt8(ptr0 + 64, 1, true);
    dataView(memory0).setFloat64(ptr0 + 72, +e, true);
  }
  var variant8 = v1_5;
  if (variant8 === null || variant8=== undefined) {
    dataView(memory0).setInt8(ptr0 + 80, 0, true);
  } else {
    const e = variant8;
    dataView(memory0).setInt8(ptr0 + 80, 1, true);
    var val7 = e;
    var len7 = val7.length;
    var ptr7 = realloc0(0, 0, 8, len7 * 8);
    var src7 = new Uint8Array(val7.buffer, val7.byteOffset, len7 * 8);
    (new Uint8Array(memory0.buffer, ptr7, len7 * 8)).set(src7);
    dataView(memory0).setInt32(ptr0 + 88, len7, true);
    dataView(memory0).setInt32(ptr0 + 84, ptr7, true);
  }
  var {name: v9_0, runtimeConfig: v9_1, asId: v9_2 } = arg1;
  var variant11 = v9_0;
  if (variant11 === null || variant11=== undefined) {
    dataView(memory0).setInt8(ptr0 + 96, 0, true);
  } else {
    const e = variant11;
    dataView(memory0).setInt8(ptr0 + 96, 1, true);
    var ptr10 = utf8Encode(e, realloc0, memory0);
    var len10 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 104, len10, true);
    dataView(memory0).setInt32(ptr0 + 100, ptr10, true);
  }
  var variant16 = v9_1;
  if (variant16 === null || variant16=== undefined) {
    dataView(memory0).setInt8(ptr0 + 108, 0, true);
  } else {
    const e = variant16;
    dataView(memory0).setInt8(ptr0 + 108, 1, true);
    var vec15 = e;
    var len15 = vec15.length;
    var result15 = realloc0(0, 0, 4, len15 * 16);
    for (let i = 0; i < vec15.length; i++) {
      const e = vec15[i];
      const base = result15 + i * 16;var [tuple12_0, tuple12_1] = e;
      var ptr13 = utf8Encode(tuple12_0, realloc0, memory0);
      var len13 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len13, true);
      dataView(memory0).setInt32(base + 0, ptr13, true);
      var ptr14 = utf8Encode(tuple12_1, realloc0, memory0);
      var len14 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len14, true);
      dataView(memory0).setInt32(base + 8, ptr14, true);
    }
    dataView(memory0).setInt32(ptr0 + 116, len15, true);
    dataView(memory0).setInt32(ptr0 + 112, result15, true);
  }
  dataView(memory0).setInt8(ptr0 + 120, v9_2 ? 1 : 0, true);
  const ret = exports1['metatype:typegraph/core#floatb'](ptr0);
  let variant19;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant19= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len18 = dataView(memory0).getInt32(ret + 8, true);
      var base18 = dataView(memory0).getInt32(ret + 4, true);
      var result18 = [];
      for (let i = 0; i < len18; i++) {
        const base = base18 + i * 8;
        var ptr17 = dataView(memory0).getInt32(base + 0, true);
        var len17 = dataView(memory0).getInt32(base + 4, true);
        var result17 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr17, len17));
        result18.push(result17);
      }
      variant19= {
        tag: 'err',
        val: {
          stack: result18,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant19.tag === 'err') {
    throw new ComponentError(variant19.val);
  }
  return variant19.val;
}

function booleanb(arg0) {
  var {name: v0_0, runtimeConfig: v0_1, asId: v0_2 } = arg0;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var ptr1 = utf8Encode(e, realloc0, memory0);
    var len1 = utf8EncodedLen;
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant7 = v0_1;
  let variant7_0;
  let variant7_1;
  let variant7_2;
  if (variant7 === null || variant7=== undefined) {
    variant7_0 = 0;
    variant7_1 = 0;
    variant7_2 = 0;
  } else {
    const e = variant7;
    var vec6 = e;
    var len6 = vec6.length;
    var result6 = realloc0(0, 0, 4, len6 * 16);
    for (let i = 0; i < vec6.length; i++) {
      const e = vec6[i];
      const base = result6 + i * 16;var [tuple3_0, tuple3_1] = e;
      var ptr4 = utf8Encode(tuple3_0, realloc0, memory0);
      var len4 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len4, true);
      dataView(memory0).setInt32(base + 0, ptr4, true);
      var ptr5 = utf8Encode(tuple3_1, realloc0, memory0);
      var len5 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len5, true);
      dataView(memory0).setInt32(base + 8, ptr5, true);
    }
    variant7_0 = 1;
    variant7_1 = result6;
    variant7_2 = len6;
  }
  const ret = exports1['metatype:typegraph/core#booleanb'](variant2_0, variant2_1, variant2_2, variant7_0, variant7_1, variant7_2, v0_2 ? 1 : 0);
  let variant10;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant10= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len9 = dataView(memory0).getInt32(ret + 8, true);
      var base9 = dataView(memory0).getInt32(ret + 4, true);
      var result9 = [];
      for (let i = 0; i < len9; i++) {
        const base = base9 + i * 8;
        var ptr8 = dataView(memory0).getInt32(base + 0, true);
        var len8 = dataView(memory0).getInt32(base + 4, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        result9.push(result8);
      }
      variant10= {
        tag: 'err',
        val: {
          stack: result9,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant10.tag === 'err') {
    throw new ComponentError(variant10.val);
  }
  return variant10.val;
}

function stringb(arg0, arg1) {
  var ptr0 = realloc0(0, 0, 4, 80);
  var {min: v1_0, max: v1_1, format: v1_2, pattern: v1_3, enumeration: v1_4 } = arg0;
  var variant2 = v1_0;
  if (variant2 === null || variant2=== undefined) {
    dataView(memory0).setInt8(ptr0 + 0, 0, true);
  } else {
    const e = variant2;
    dataView(memory0).setInt8(ptr0 + 0, 1, true);
    dataView(memory0).setInt32(ptr0 + 4, toUint32(e), true);
  }
  var variant3 = v1_1;
  if (variant3 === null || variant3=== undefined) {
    dataView(memory0).setInt8(ptr0 + 8, 0, true);
  } else {
    const e = variant3;
    dataView(memory0).setInt8(ptr0 + 8, 1, true);
    dataView(memory0).setInt32(ptr0 + 12, toUint32(e), true);
  }
  var variant5 = v1_2;
  if (variant5 === null || variant5=== undefined) {
    dataView(memory0).setInt8(ptr0 + 16, 0, true);
  } else {
    const e = variant5;
    dataView(memory0).setInt8(ptr0 + 16, 1, true);
    var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 24, len4, true);
    dataView(memory0).setInt32(ptr0 + 20, ptr4, true);
  }
  var variant7 = v1_3;
  if (variant7 === null || variant7=== undefined) {
    dataView(memory0).setInt8(ptr0 + 28, 0, true);
  } else {
    const e = variant7;
    dataView(memory0).setInt8(ptr0 + 28, 1, true);
    var ptr6 = utf8Encode(e, realloc0, memory0);
    var len6 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 36, len6, true);
    dataView(memory0).setInt32(ptr0 + 32, ptr6, true);
  }
  var variant10 = v1_4;
  if (variant10 === null || variant10=== undefined) {
    dataView(memory0).setInt8(ptr0 + 40, 0, true);
  } else {
    const e = variant10;
    dataView(memory0).setInt8(ptr0 + 40, 1, true);
    var vec9 = e;
    var len9 = vec9.length;
    var result9 = realloc0(0, 0, 4, len9 * 8);
    for (let i = 0; i < vec9.length; i++) {
      const e = vec9[i];
      const base = result9 + i * 8;var ptr8 = utf8Encode(e, realloc0, memory0);
      var len8 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len8, true);
      dataView(memory0).setInt32(base + 0, ptr8, true);
    }
    dataView(memory0).setInt32(ptr0 + 48, len9, true);
    dataView(memory0).setInt32(ptr0 + 44, result9, true);
  }
  var {name: v11_0, runtimeConfig: v11_1, asId: v11_2 } = arg1;
  var variant13 = v11_0;
  if (variant13 === null || variant13=== undefined) {
    dataView(memory0).setInt8(ptr0 + 52, 0, true);
  } else {
    const e = variant13;
    dataView(memory0).setInt8(ptr0 + 52, 1, true);
    var ptr12 = utf8Encode(e, realloc0, memory0);
    var len12 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 60, len12, true);
    dataView(memory0).setInt32(ptr0 + 56, ptr12, true);
  }
  var variant18 = v11_1;
  if (variant18 === null || variant18=== undefined) {
    dataView(memory0).setInt8(ptr0 + 64, 0, true);
  } else {
    const e = variant18;
    dataView(memory0).setInt8(ptr0 + 64, 1, true);
    var vec17 = e;
    var len17 = vec17.length;
    var result17 = realloc0(0, 0, 4, len17 * 16);
    for (let i = 0; i < vec17.length; i++) {
      const e = vec17[i];
      const base = result17 + i * 16;var [tuple14_0, tuple14_1] = e;
      var ptr15 = utf8Encode(tuple14_0, realloc0, memory0);
      var len15 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len15, true);
      dataView(memory0).setInt32(base + 0, ptr15, true);
      var ptr16 = utf8Encode(tuple14_1, realloc0, memory0);
      var len16 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len16, true);
      dataView(memory0).setInt32(base + 8, ptr16, true);
    }
    dataView(memory0).setInt32(ptr0 + 72, len17, true);
    dataView(memory0).setInt32(ptr0 + 68, result17, true);
  }
  dataView(memory0).setInt8(ptr0 + 76, v11_2 ? 1 : 0, true);
  const ret = exports1['metatype:typegraph/core#stringb'](ptr0);
  let variant21;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant21= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len20 = dataView(memory0).getInt32(ret + 8, true);
      var base20 = dataView(memory0).getInt32(ret + 4, true);
      var result20 = [];
      for (let i = 0; i < len20; i++) {
        const base = base20 + i * 8;
        var ptr19 = dataView(memory0).getInt32(base + 0, true);
        var len19 = dataView(memory0).getInt32(base + 4, true);
        var result19 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr19, len19));
        result20.push(result19);
      }
      variant21= {
        tag: 'err',
        val: {
          stack: result20,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant21.tag === 'err') {
    throw new ComponentError(variant21.val);
  }
  return variant21.val;
}

function fileb(arg0, arg1) {
  var {min: v0_0, max: v0_1, allow: v0_2 } = arg0;
  var variant1 = v0_0;
  let variant1_0;
  let variant1_1;
  if (variant1 === null || variant1=== undefined) {
    variant1_0 = 0;
    variant1_1 = 0;
  } else {
    const e = variant1;
    variant1_0 = 1;
    variant1_1 = toUint32(e);
  }
  var variant2 = v0_1;
  let variant2_0;
  let variant2_1;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
  } else {
    const e = variant2;
    variant2_0 = 1;
    variant2_1 = toUint32(e);
  }
  var variant5 = v0_2;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var vec4 = e;
    var len4 = vec4.length;
    var result4 = realloc0(0, 0, 4, len4 * 8);
    for (let i = 0; i < vec4.length; i++) {
      const e = vec4[i];
      const base = result4 + i * 8;var ptr3 = utf8Encode(e, realloc0, memory0);
      var len3 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len3, true);
      dataView(memory0).setInt32(base + 0, ptr3, true);
    }
    variant5_0 = 1;
    variant5_1 = result4;
    variant5_2 = len4;
  }
  var {name: v6_0, runtimeConfig: v6_1, asId: v6_2 } = arg1;
  var variant8 = v6_0;
  let variant8_0;
  let variant8_1;
  let variant8_2;
  if (variant8 === null || variant8=== undefined) {
    variant8_0 = 0;
    variant8_1 = 0;
    variant8_2 = 0;
  } else {
    const e = variant8;
    var ptr7 = utf8Encode(e, realloc0, memory0);
    var len7 = utf8EncodedLen;
    variant8_0 = 1;
    variant8_1 = ptr7;
    variant8_2 = len7;
  }
  var variant13 = v6_1;
  let variant13_0;
  let variant13_1;
  let variant13_2;
  if (variant13 === null || variant13=== undefined) {
    variant13_0 = 0;
    variant13_1 = 0;
    variant13_2 = 0;
  } else {
    const e = variant13;
    var vec12 = e;
    var len12 = vec12.length;
    var result12 = realloc0(0, 0, 4, len12 * 16);
    for (let i = 0; i < vec12.length; i++) {
      const e = vec12[i];
      const base = result12 + i * 16;var [tuple9_0, tuple9_1] = e;
      var ptr10 = utf8Encode(tuple9_0, realloc0, memory0);
      var len10 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len10, true);
      dataView(memory0).setInt32(base + 0, ptr10, true);
      var ptr11 = utf8Encode(tuple9_1, realloc0, memory0);
      var len11 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len11, true);
      dataView(memory0).setInt32(base + 8, ptr11, true);
    }
    variant13_0 = 1;
    variant13_1 = result12;
    variant13_2 = len12;
  }
  const ret = exports1['metatype:typegraph/core#fileb'](variant1_0, variant1_1, variant2_0, variant2_1, variant5_0, variant5_1, variant5_2, variant8_0, variant8_1, variant8_2, variant13_0, variant13_1, variant13_2, v6_2 ? 1 : 0);
  let variant16;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant16= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len15 = dataView(memory0).getInt32(ret + 8, true);
      var base15 = dataView(memory0).getInt32(ret + 4, true);
      var result15 = [];
      for (let i = 0; i < len15; i++) {
        const base = base15 + i * 8;
        var ptr14 = dataView(memory0).getInt32(base + 0, true);
        var len14 = dataView(memory0).getInt32(base + 4, true);
        var result14 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr14, len14));
        result15.push(result14);
      }
      variant16= {
        tag: 'err',
        val: {
          stack: result15,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant16.tag === 'err') {
    throw new ComponentError(variant16.val);
  }
  return variant16.val;
}

function listb(arg0, arg1) {
  var {of: v0_0, min: v0_1, max: v0_2, uniqueItems: v0_3 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  if (variant1 === null || variant1=== undefined) {
    variant1_0 = 0;
    variant1_1 = 0;
  } else {
    const e = variant1;
    variant1_0 = 1;
    variant1_1 = toUint32(e);
  }
  var variant2 = v0_2;
  let variant2_0;
  let variant2_1;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
  } else {
    const e = variant2;
    variant2_0 = 1;
    variant2_1 = toUint32(e);
  }
  var variant3 = v0_3;
  let variant3_0;
  let variant3_1;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
  } else {
    const e = variant3;
    variant3_0 = 1;
    variant3_1 = e ? 1 : 0;
  }
  var {name: v4_0, runtimeConfig: v4_1, asId: v4_2 } = arg1;
  var variant6 = v4_0;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var ptr5 = utf8Encode(e, realloc0, memory0);
    var len5 = utf8EncodedLen;
    variant6_0 = 1;
    variant6_1 = ptr5;
    variant6_2 = len5;
  }
  var variant11 = v4_1;
  let variant11_0;
  let variant11_1;
  let variant11_2;
  if (variant11 === null || variant11=== undefined) {
    variant11_0 = 0;
    variant11_1 = 0;
    variant11_2 = 0;
  } else {
    const e = variant11;
    var vec10 = e;
    var len10 = vec10.length;
    var result10 = realloc0(0, 0, 4, len10 * 16);
    for (let i = 0; i < vec10.length; i++) {
      const e = vec10[i];
      const base = result10 + i * 16;var [tuple7_0, tuple7_1] = e;
      var ptr8 = utf8Encode(tuple7_0, realloc0, memory0);
      var len8 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len8, true);
      dataView(memory0).setInt32(base + 0, ptr8, true);
      var ptr9 = utf8Encode(tuple7_1, realloc0, memory0);
      var len9 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len9, true);
      dataView(memory0).setInt32(base + 8, ptr9, true);
    }
    variant11_0 = 1;
    variant11_1 = result10;
    variant11_2 = len10;
  }
  const ret = exports1['metatype:typegraph/core#listb'](toUint32(v0_0), variant1_0, variant1_1, variant2_0, variant2_1, variant3_0, variant3_1, variant6_0, variant6_1, variant6_2, variant11_0, variant11_1, variant11_2, v4_2 ? 1 : 0);
  let variant14;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant14= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len13 = dataView(memory0).getInt32(ret + 8, true);
      var base13 = dataView(memory0).getInt32(ret + 4, true);
      var result13 = [];
      for (let i = 0; i < len13; i++) {
        const base = base13 + i * 8;
        var ptr12 = dataView(memory0).getInt32(base + 0, true);
        var len12 = dataView(memory0).getInt32(base + 4, true);
        var result12 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr12, len12));
        result13.push(result12);
      }
      variant14= {
        tag: 'err',
        val: {
          stack: result13,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant14.tag === 'err') {
    throw new ComponentError(variant14.val);
  }
  return variant14.val;
}

function optionalb(arg0, arg1) {
  var {of: v0_0, defaultItem: v0_1 } = arg0;
  var variant2 = v0_1;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var ptr1 = utf8Encode(e, realloc0, memory0);
    var len1 = utf8EncodedLen;
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var {name: v3_0, runtimeConfig: v3_1, asId: v3_2 } = arg1;
  var variant5 = v3_0;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    variant5_0 = 1;
    variant5_1 = ptr4;
    variant5_2 = len4;
  }
  var variant10 = v3_1;
  let variant10_0;
  let variant10_1;
  let variant10_2;
  if (variant10 === null || variant10=== undefined) {
    variant10_0 = 0;
    variant10_1 = 0;
    variant10_2 = 0;
  } else {
    const e = variant10;
    var vec9 = e;
    var len9 = vec9.length;
    var result9 = realloc0(0, 0, 4, len9 * 16);
    for (let i = 0; i < vec9.length; i++) {
      const e = vec9[i];
      const base = result9 + i * 16;var [tuple6_0, tuple6_1] = e;
      var ptr7 = utf8Encode(tuple6_0, realloc0, memory0);
      var len7 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len7, true);
      dataView(memory0).setInt32(base + 0, ptr7, true);
      var ptr8 = utf8Encode(tuple6_1, realloc0, memory0);
      var len8 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len8, true);
      dataView(memory0).setInt32(base + 8, ptr8, true);
    }
    variant10_0 = 1;
    variant10_1 = result9;
    variant10_2 = len9;
  }
  const ret = exports1['metatype:typegraph/core#optionalb'](toUint32(v0_0), variant2_0, variant2_1, variant2_2, variant5_0, variant5_1, variant5_2, variant10_0, variant10_1, variant10_2, v3_2 ? 1 : 0);
  let variant13;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant13= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len12 = dataView(memory0).getInt32(ret + 8, true);
      var base12 = dataView(memory0).getInt32(ret + 4, true);
      var result12 = [];
      for (let i = 0; i < len12; i++) {
        const base = base12 + i * 8;
        var ptr11 = dataView(memory0).getInt32(base + 0, true);
        var len11 = dataView(memory0).getInt32(base + 4, true);
        var result11 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr11, len11));
        result12.push(result11);
      }
      variant13= {
        tag: 'err',
        val: {
          stack: result12,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant13.tag === 'err') {
    throw new ComponentError(variant13.val);
  }
  return variant13.val;
}

function unionb(arg0, arg1) {
  var {variants: v0_0 } = arg0;
  var val1 = v0_0;
  var len1 = val1.length;
  var ptr1 = realloc0(0, 0, 4, len1 * 4);
  var src1 = new Uint8Array(val1.buffer, val1.byteOffset, len1 * 4);
  (new Uint8Array(memory0.buffer, ptr1, len1 * 4)).set(src1);
  var {name: v2_0, runtimeConfig: v2_1, asId: v2_2 } = arg1;
  var variant4 = v2_0;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var ptr3 = utf8Encode(e, realloc0, memory0);
    var len3 = utf8EncodedLen;
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant9 = v2_1;
  let variant9_0;
  let variant9_1;
  let variant9_2;
  if (variant9 === null || variant9=== undefined) {
    variant9_0 = 0;
    variant9_1 = 0;
    variant9_2 = 0;
  } else {
    const e = variant9;
    var vec8 = e;
    var len8 = vec8.length;
    var result8 = realloc0(0, 0, 4, len8 * 16);
    for (let i = 0; i < vec8.length; i++) {
      const e = vec8[i];
      const base = result8 + i * 16;var [tuple5_0, tuple5_1] = e;
      var ptr6 = utf8Encode(tuple5_0, realloc0, memory0);
      var len6 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len6, true);
      dataView(memory0).setInt32(base + 0, ptr6, true);
      var ptr7 = utf8Encode(tuple5_1, realloc0, memory0);
      var len7 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len7, true);
      dataView(memory0).setInt32(base + 8, ptr7, true);
    }
    variant9_0 = 1;
    variant9_1 = result8;
    variant9_2 = len8;
  }
  const ret = exports1['metatype:typegraph/core#unionb'](ptr1, len1, variant4_0, variant4_1, variant4_2, variant9_0, variant9_1, variant9_2, v2_2 ? 1 : 0);
  let variant12;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant12= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len11 = dataView(memory0).getInt32(ret + 8, true);
      var base11 = dataView(memory0).getInt32(ret + 4, true);
      var result11 = [];
      for (let i = 0; i < len11; i++) {
        const base = base11 + i * 8;
        var ptr10 = dataView(memory0).getInt32(base + 0, true);
        var len10 = dataView(memory0).getInt32(base + 4, true);
        var result10 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr10, len10));
        result11.push(result10);
      }
      variant12= {
        tag: 'err',
        val: {
          stack: result11,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant12.tag === 'err') {
    throw new ComponentError(variant12.val);
  }
  return variant12.val;
}

function eitherb(arg0, arg1) {
  var {variants: v0_0 } = arg0;
  var val1 = v0_0;
  var len1 = val1.length;
  var ptr1 = realloc0(0, 0, 4, len1 * 4);
  var src1 = new Uint8Array(val1.buffer, val1.byteOffset, len1 * 4);
  (new Uint8Array(memory0.buffer, ptr1, len1 * 4)).set(src1);
  var {name: v2_0, runtimeConfig: v2_1, asId: v2_2 } = arg1;
  var variant4 = v2_0;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var ptr3 = utf8Encode(e, realloc0, memory0);
    var len3 = utf8EncodedLen;
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  var variant9 = v2_1;
  let variant9_0;
  let variant9_1;
  let variant9_2;
  if (variant9 === null || variant9=== undefined) {
    variant9_0 = 0;
    variant9_1 = 0;
    variant9_2 = 0;
  } else {
    const e = variant9;
    var vec8 = e;
    var len8 = vec8.length;
    var result8 = realloc0(0, 0, 4, len8 * 16);
    for (let i = 0; i < vec8.length; i++) {
      const e = vec8[i];
      const base = result8 + i * 16;var [tuple5_0, tuple5_1] = e;
      var ptr6 = utf8Encode(tuple5_0, realloc0, memory0);
      var len6 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len6, true);
      dataView(memory0).setInt32(base + 0, ptr6, true);
      var ptr7 = utf8Encode(tuple5_1, realloc0, memory0);
      var len7 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len7, true);
      dataView(memory0).setInt32(base + 8, ptr7, true);
    }
    variant9_0 = 1;
    variant9_1 = result8;
    variant9_2 = len8;
  }
  const ret = exports1['metatype:typegraph/core#eitherb'](ptr1, len1, variant4_0, variant4_1, variant4_2, variant9_0, variant9_1, variant9_2, v2_2 ? 1 : 0);
  let variant12;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant12= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len11 = dataView(memory0).getInt32(ret + 8, true);
      var base11 = dataView(memory0).getInt32(ret + 4, true);
      var result11 = [];
      for (let i = 0; i < len11; i++) {
        const base = base11 + i * 8;
        var ptr10 = dataView(memory0).getInt32(base + 0, true);
        var len10 = dataView(memory0).getInt32(base + 4, true);
        var result10 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr10, len10));
        result11.push(result10);
      }
      variant12= {
        tag: 'err',
        val: {
          stack: result11,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant12.tag === 'err') {
    throw new ComponentError(variant12.val);
  }
  return variant12.val;
}

function structb(arg0, arg1) {
  var ptr0 = realloc0(0, 0, 4, 68);
  var {props: v1_0, additionalProps: v1_1, min: v1_2, max: v1_3, enumeration: v1_4 } = arg0;
  var vec4 = v1_0;
  var len4 = vec4.length;
  var result4 = realloc0(0, 0, 4, len4 * 12);
  for (let i = 0; i < vec4.length; i++) {
    const e = vec4[i];
    const base = result4 + i * 12;var [tuple2_0, tuple2_1] = e;
    var ptr3 = utf8Encode(tuple2_0, realloc0, memory0);
    var len3 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len3, true);
    dataView(memory0).setInt32(base + 0, ptr3, true);
    dataView(memory0).setInt32(base + 8, toUint32(tuple2_1), true);
  }
  dataView(memory0).setInt32(ptr0 + 4, len4, true);
  dataView(memory0).setInt32(ptr0 + 0, result4, true);
  dataView(memory0).setInt8(ptr0 + 8, v1_1 ? 1 : 0, true);
  var variant5 = v1_2;
  if (variant5 === null || variant5=== undefined) {
    dataView(memory0).setInt8(ptr0 + 12, 0, true);
  } else {
    const e = variant5;
    dataView(memory0).setInt8(ptr0 + 12, 1, true);
    dataView(memory0).setInt32(ptr0 + 16, toUint32(e), true);
  }
  var variant6 = v1_3;
  if (variant6 === null || variant6=== undefined) {
    dataView(memory0).setInt8(ptr0 + 20, 0, true);
  } else {
    const e = variant6;
    dataView(memory0).setInt8(ptr0 + 20, 1, true);
    dataView(memory0).setInt32(ptr0 + 24, toUint32(e), true);
  }
  var variant9 = v1_4;
  if (variant9 === null || variant9=== undefined) {
    dataView(memory0).setInt8(ptr0 + 28, 0, true);
  } else {
    const e = variant9;
    dataView(memory0).setInt8(ptr0 + 28, 1, true);
    var vec8 = e;
    var len8 = vec8.length;
    var result8 = realloc0(0, 0, 4, len8 * 8);
    for (let i = 0; i < vec8.length; i++) {
      const e = vec8[i];
      const base = result8 + i * 8;var ptr7 = utf8Encode(e, realloc0, memory0);
      var len7 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len7, true);
      dataView(memory0).setInt32(base + 0, ptr7, true);
    }
    dataView(memory0).setInt32(ptr0 + 36, len8, true);
    dataView(memory0).setInt32(ptr0 + 32, result8, true);
  }
  var {name: v10_0, runtimeConfig: v10_1, asId: v10_2 } = arg1;
  var variant12 = v10_0;
  if (variant12 === null || variant12=== undefined) {
    dataView(memory0).setInt8(ptr0 + 40, 0, true);
  } else {
    const e = variant12;
    dataView(memory0).setInt8(ptr0 + 40, 1, true);
    var ptr11 = utf8Encode(e, realloc0, memory0);
    var len11 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 48, len11, true);
    dataView(memory0).setInt32(ptr0 + 44, ptr11, true);
  }
  var variant17 = v10_1;
  if (variant17 === null || variant17=== undefined) {
    dataView(memory0).setInt8(ptr0 + 52, 0, true);
  } else {
    const e = variant17;
    dataView(memory0).setInt8(ptr0 + 52, 1, true);
    var vec16 = e;
    var len16 = vec16.length;
    var result16 = realloc0(0, 0, 4, len16 * 16);
    for (let i = 0; i < vec16.length; i++) {
      const e = vec16[i];
      const base = result16 + i * 16;var [tuple13_0, tuple13_1] = e;
      var ptr14 = utf8Encode(tuple13_0, realloc0, memory0);
      var len14 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len14, true);
      dataView(memory0).setInt32(base + 0, ptr14, true);
      var ptr15 = utf8Encode(tuple13_1, realloc0, memory0);
      var len15 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len15, true);
      dataView(memory0).setInt32(base + 8, ptr15, true);
    }
    dataView(memory0).setInt32(ptr0 + 60, len16, true);
    dataView(memory0).setInt32(ptr0 + 56, result16, true);
  }
  dataView(memory0).setInt8(ptr0 + 64, v10_2 ? 1 : 0, true);
  const ret = exports1['metatype:typegraph/core#structb'](ptr0);
  let variant20;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant20= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len19 = dataView(memory0).getInt32(ret + 8, true);
      var base19 = dataView(memory0).getInt32(ret + 4, true);
      var result19 = [];
      for (let i = 0; i < len19; i++) {
        const base = base19 + i * 8;
        var ptr18 = dataView(memory0).getInt32(base + 0, true);
        var len18 = dataView(memory0).getInt32(base + 4, true);
        var result18 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr18, len18));
        result19.push(result18);
      }
      variant20= {
        tag: 'err',
        val: {
          stack: result19,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant20.tag === 'err') {
    throw new ComponentError(variant20.val);
  }
  return variant20.val;
}

function extendStruct(arg0, arg1) {
  var vec2 = arg1;
  var len2 = vec2.length;
  var result2 = realloc0(0, 0, 4, len2 * 12);
  for (let i = 0; i < vec2.length; i++) {
    const e = vec2[i];
    const base = result2 + i * 12;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc0, memory0);
    var len1 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len1, true);
    dataView(memory0).setInt32(base + 0, ptr1, true);
    dataView(memory0).setInt32(base + 8, toUint32(tuple0_1), true);
  }
  const ret = exports1['metatype:typegraph/core#extend-struct'](toUint32(arg0), result2, len2);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant5= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function getTypeRepr(arg0) {
  const ret = exports1['metatype:typegraph/core#get-type-repr'](toUint32(arg0));
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr0 = dataView(memory0).getInt32(ret + 4, true);
      var len0 = dataView(memory0).getInt32(ret + 8, true);
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      variant3= {
        tag: 'ok',
        val: result0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function funcb(arg0) {
  var {inp: v0_0, parameterTransform: v0_1, out: v0_2, mat: v0_3, rateCalls: v0_4, rateWeight: v0_5 } = arg0;
  var variant3 = v0_1;
  let variant3_0;
  let variant3_1;
  let variant3_2;
  let variant3_3;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
    variant3_2 = 0;
    variant3_3 = 0;
  } else {
    const e = variant3;
    var {resolverInput: v1_0, transformTree: v1_1 } = e;
    var ptr2 = utf8Encode(v1_1, realloc0, memory0);
    var len2 = utf8EncodedLen;
    variant3_0 = 1;
    variant3_1 = toUint32(v1_0);
    variant3_2 = ptr2;
    variant3_3 = len2;
  }
  var variant4 = v0_5;
  let variant4_0;
  let variant4_1;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
  } else {
    const e = variant4;
    variant4_0 = 1;
    variant4_1 = toUint32(e);
  }
  const ret = exports1['metatype:typegraph/core#funcb'](toUint32(v0_0), variant3_0, variant3_1, variant3_2, variant3_3, toUint32(v0_2), toUint32(v0_3), v0_4 ? 1 : 0, variant4_0, variant4_1);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function getTransformData(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/core#get-transform-data'](toUint32(arg0), ptr0, len0);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr1 = dataView(memory0).getInt32(ret + 12, true);
      var len1 = dataView(memory0).getInt32(ret + 16, true);
      var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
      variant4= {
        tag: 'ok',
        val: {
          queryInput: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          parameterTransform: {
            resolverInput: dataView(memory0).getInt32(ret + 8, true) >>> 0,
            transformTree: result1,
          },
        }
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn3(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function registerPolicy(arg0) {
  var {name: v0_0, materializer: v0_1 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/core#register-policy'](ptr1, len1, toUint32(v0_1));
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function withPolicy(arg0, arg1) {
  var vec6 = arg1;
  var len6 = vec6.length;
  var result6 = realloc0(0, 0, 4, len6 * 36);
  for (let i = 0; i < vec6.length; i++) {
    const e = vec6[i];
    const base = result6 + i * 36;var variant5 = e;
    switch (variant5.tag) {
      case 'simple': {
        const e = variant5.val;
        dataView(memory0).setInt8(base + 0, 0, true);
        dataView(memory0).setInt32(base + 4, toUint32(e), true);
        break;
      }
      case 'per-effect': {
        const e = variant5.val;
        dataView(memory0).setInt8(base + 0, 1, true);
        var {read: v0_0, create: v0_1, update: v0_2, delete: v0_3 } = e;
        var variant1 = v0_0;
        if (variant1 === null || variant1=== undefined) {
          dataView(memory0).setInt8(base + 4, 0, true);
        } else {
          const e = variant1;
          dataView(memory0).setInt8(base + 4, 1, true);
          dataView(memory0).setInt32(base + 8, toUint32(e), true);
        }
        var variant2 = v0_1;
        if (variant2 === null || variant2=== undefined) {
          dataView(memory0).setInt8(base + 12, 0, true);
        } else {
          const e = variant2;
          dataView(memory0).setInt8(base + 12, 1, true);
          dataView(memory0).setInt32(base + 16, toUint32(e), true);
        }
        var variant3 = v0_2;
        if (variant3 === null || variant3=== undefined) {
          dataView(memory0).setInt8(base + 20, 0, true);
        } else {
          const e = variant3;
          dataView(memory0).setInt8(base + 20, 1, true);
          dataView(memory0).setInt32(base + 24, toUint32(e), true);
        }
        var variant4 = v0_3;
        if (variant4 === null || variant4=== undefined) {
          dataView(memory0).setInt8(base + 28, 0, true);
        } else {
          const e = variant4;
          dataView(memory0).setInt8(base + 28, 1, true);
          dataView(memory0).setInt32(base + 32, toUint32(e), true);
        }
        break;
      }
      default: {
        throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`PolicySpec\``);
      }
    }
  }
  const ret = exports1['metatype:typegraph/core#with-policy'](toUint32(arg0), result6, len6);
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant9= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len8 = dataView(memory0).getInt32(ret + 8, true);
      var base8 = dataView(memory0).getInt32(ret + 4, true);
      var result8 = [];
      for (let i = 0; i < len8; i++) {
        const base = base8 + i * 8;
        var ptr7 = dataView(memory0).getInt32(base + 0, true);
        var len7 = dataView(memory0).getInt32(base + 4, true);
        var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
        result8.push(result7);
      }
      variant9= {
        tag: 'err',
        val: {
          stack: result8,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant9.tag === 'err') {
    throw new ComponentError(variant9.val);
  }
  return variant9.val;
}

function getPublicPolicy() {
  const ret = exports1['metatype:typegraph/core#get-public-policy']();
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr0 = dataView(memory0).getInt32(ret + 8, true);
      var len0 = dataView(memory0).getInt32(ret + 12, true);
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      variant3= {
        tag: 'ok',
        val: [dataView(memory0).getInt32(ret + 4, true) >>> 0, result0]
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn4(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function getInternalPolicy() {
  const ret = exports1['metatype:typegraph/core#get-internal-policy']();
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr0 = dataView(memory0).getInt32(ret + 8, true);
      var len0 = dataView(memory0).getInt32(ret + 12, true);
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      variant3= {
        tag: 'ok',
        val: [dataView(memory0).getInt32(ret + 4, true) >>> 0, result0]
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn4(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function registerContextPolicy(arg0, arg1) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var variant3 = arg1;
  let variant3_0;
  let variant3_1;
  let variant3_2;
  switch (variant3.tag) {
    case 'not-null': {
      variant3_0 = 0;
      variant3_1 = 0;
      variant3_2 = 0;
      break;
    }
    case 'value': {
      const e = variant3.val;
      var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      variant3_0 = 1;
      variant3_1 = ptr1;
      variant3_2 = len1;
      break;
    }
    case 'pattern': {
      const e = variant3.val;
      var ptr2 = utf8Encode(e, realloc0, memory0);
      var len2 = utf8EncodedLen;
      variant3_0 = 2;
      variant3_1 = ptr2;
      variant3_2 = len2;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant3.tag)}\` (received \`${variant3}\`) specified for \`ContextCheck\``);
    }
  }
  const ret = exports1['metatype:typegraph/core#register-context-policy'](ptr0, len0, variant3_0, variant3_1, variant3_2);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr4 = dataView(memory0).getInt32(ret + 8, true);
      var len4 = dataView(memory0).getInt32(ret + 12, true);
      var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
      variant7= {
        tag: 'ok',
        val: [dataView(memory0).getInt32(ret + 4, true) >>> 0, result4]
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn4(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function renameType(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/core#rename-type'](toUint32(arg0), ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function expose(arg0, arg1) {
  var vec2 = arg0;
  var len2 = vec2.length;
  var result2 = realloc0(0, 0, 4, len2 * 12);
  for (let i = 0; i < vec2.length; i++) {
    const e = vec2[i];
    const base = result2 + i * 12;var [tuple0_0, tuple0_1] = e;
    var ptr1 = utf8Encode(tuple0_0, realloc0, memory0);
    var len1 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len1, true);
    dataView(memory0).setInt32(base + 0, ptr1, true);
    dataView(memory0).setInt32(base + 8, toUint32(tuple0_1), true);
  }
  var variant10 = arg1;
  let variant10_0;
  let variant10_1;
  let variant10_2;
  if (variant10 === null || variant10=== undefined) {
    variant10_0 = 0;
    variant10_1 = 0;
    variant10_2 = 0;
  } else {
    const e = variant10;
    var vec9 = e;
    var len9 = vec9.length;
    var result9 = realloc0(0, 0, 4, len9 * 36);
    for (let i = 0; i < vec9.length; i++) {
      const e = vec9[i];
      const base = result9 + i * 36;var variant8 = e;
      switch (variant8.tag) {
        case 'simple': {
          const e = variant8.val;
          dataView(memory0).setInt8(base + 0, 0, true);
          dataView(memory0).setInt32(base + 4, toUint32(e), true);
          break;
        }
        case 'per-effect': {
          const e = variant8.val;
          dataView(memory0).setInt8(base + 0, 1, true);
          var {read: v3_0, create: v3_1, update: v3_2, delete: v3_3 } = e;
          var variant4 = v3_0;
          if (variant4 === null || variant4=== undefined) {
            dataView(memory0).setInt8(base + 4, 0, true);
          } else {
            const e = variant4;
            dataView(memory0).setInt8(base + 4, 1, true);
            dataView(memory0).setInt32(base + 8, toUint32(e), true);
          }
          var variant5 = v3_1;
          if (variant5 === null || variant5=== undefined) {
            dataView(memory0).setInt8(base + 12, 0, true);
          } else {
            const e = variant5;
            dataView(memory0).setInt8(base + 12, 1, true);
            dataView(memory0).setInt32(base + 16, toUint32(e), true);
          }
          var variant6 = v3_2;
          if (variant6 === null || variant6=== undefined) {
            dataView(memory0).setInt8(base + 20, 0, true);
          } else {
            const e = variant6;
            dataView(memory0).setInt8(base + 20, 1, true);
            dataView(memory0).setInt32(base + 24, toUint32(e), true);
          }
          var variant7 = v3_3;
          if (variant7 === null || variant7=== undefined) {
            dataView(memory0).setInt8(base + 28, 0, true);
          } else {
            const e = variant7;
            dataView(memory0).setInt8(base + 28, 1, true);
            dataView(memory0).setInt32(base + 32, toUint32(e), true);
          }
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant8.tag)}\` (received \`${variant8}\`) specified for \`PolicySpec\``);
        }
      }
    }
    variant10_0 = 1;
    variant10_1 = result9;
    variant10_2 = len9;
  }
  const ret = exports1['metatype:typegraph/core#expose'](result2, len2, variant10_0, variant10_1, variant10_2);
  let variant13;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant13= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      var len12 = dataView(memory0).getInt32(ret + 8, true);
      var base12 = dataView(memory0).getInt32(ret + 4, true);
      var result12 = [];
      for (let i = 0; i < len12; i++) {
        const base = base12 + i * 8;
        var ptr11 = dataView(memory0).getInt32(base + 0, true);
        var len11 = dataView(memory0).getInt32(base + 4, true);
        var result11 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr11, len11));
        result12.push(result11);
      }
      variant13= {
        tag: 'err',
        val: {
          stack: result12,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant13.tag === 'err') {
    throw new ComponentError(variant13.val);
  }
  return variant13.val;
}

function setSeed(arg0) {
  var variant0 = arg0;
  let variant0_0;
  let variant0_1;
  if (variant0 === null || variant0=== undefined) {
    variant0_0 = 0;
    variant0_1 = 0;
  } else {
    const e = variant0;
    variant0_0 = 1;
    variant0_1 = toUint32(e);
  }
  const ret = exports1['metatype:typegraph/core#set-seed'](variant0_0, variant0_1);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function getDenoRuntime() {
  const ret = exports1['metatype:typegraph/runtimes#get-deno-runtime']();
  return ret >>> 0;
}

function registerDenoFunc(arg0, arg1) {
  var {code: v0_0, secrets: v0_1 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var vec3 = v0_1;
  var len3 = vec3.length;
  var result3 = realloc0(0, 0, 4, len3 * 8);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 8;var ptr2 = utf8Encode(e, realloc0, memory0);
    var len2 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len2, true);
    dataView(memory0).setInt32(base + 0, ptr2, true);
  }
  var variant4 = arg1;
  let variant4_0;
  let variant4_1;
  switch (variant4.tag) {
    case 'read': {
      variant4_0 = 0;
      variant4_1 = 0;
      break;
    }
    case 'create': {
      const e = variant4.val;
      variant4_0 = 1;
      variant4_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant4.val;
      variant4_0 = 2;
      variant4_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant4.val;
      variant4_0 = 3;
      variant4_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`Effect\``);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#register-deno-func'](ptr1, len1, result3, len3, variant4_0, variant4_1);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function registerDenoStatic(arg0, arg1) {
  var {value: v0_0 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#register-deno-static'](ptr1, len1, toUint32(arg1));
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function getPredefinedDenoFunc(arg0) {
  var {name: v0_0 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#get-predefined-deno-func'](ptr1, len1);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function importDenoFunction(arg0, arg1) {
  var {funcName: v0_0, module: v0_1, deps: v0_2, secrets: v0_3 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(v0_1, realloc0, memory0);
  var len2 = utf8EncodedLen;
  var vec4 = v0_2;
  var len4 = vec4.length;
  var result4 = realloc0(0, 0, 4, len4 * 8);
  for (let i = 0; i < vec4.length; i++) {
    const e = vec4[i];
    const base = result4 + i * 8;var ptr3 = utf8Encode(e, realloc0, memory0);
    var len3 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len3, true);
    dataView(memory0).setInt32(base + 0, ptr3, true);
  }
  var vec6 = v0_3;
  var len6 = vec6.length;
  var result6 = realloc0(0, 0, 4, len6 * 8);
  for (let i = 0; i < vec6.length; i++) {
    const e = vec6[i];
    const base = result6 + i * 8;var ptr5 = utf8Encode(e, realloc0, memory0);
    var len5 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len5, true);
    dataView(memory0).setInt32(base + 0, ptr5, true);
  }
  var variant7 = arg1;
  let variant7_0;
  let variant7_1;
  switch (variant7.tag) {
    case 'read': {
      variant7_0 = 0;
      variant7_1 = 0;
      break;
    }
    case 'create': {
      const e = variant7.val;
      variant7_0 = 1;
      variant7_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant7.val;
      variant7_0 = 2;
      variant7_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant7.val;
      variant7_0 = 3;
      variant7_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`Effect\``);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#import-deno-function'](ptr1, len1, ptr2, len2, result4, len4, result6, len6, variant7_0, variant7_1);
  let variant10;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant10= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len9 = dataView(memory0).getInt32(ret + 8, true);
      var base9 = dataView(memory0).getInt32(ret + 4, true);
      var result9 = [];
      for (let i = 0; i < len9; i++) {
        const base = base9 + i * 8;
        var ptr8 = dataView(memory0).getInt32(base + 0, true);
        var len8 = dataView(memory0).getInt32(base + 4, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        result9.push(result8);
      }
      variant10= {
        tag: 'err',
        val: {
          stack: result9,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant10.tag === 'err') {
    throw new ComponentError(variant10.val);
  }
  return variant10.val;
}

function registerGraphqlRuntime(arg0) {
  var {endpoint: v0_0 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#register-graphql-runtime'](ptr1, len1);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function graphqlQuery(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {path: v2_0 } = arg1;
  var variant5 = v2_0;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var vec4 = e;
    var len4 = vec4.length;
    var result4 = realloc0(0, 0, 4, len4 * 8);
    for (let i = 0; i < vec4.length; i++) {
      const e = vec4[i];
      const base = result4 + i * 8;var ptr3 = utf8Encode(e, realloc0, memory0);
      var len3 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len3, true);
      dataView(memory0).setInt32(base + 0, ptr3, true);
    }
    variant5_0 = 1;
    variant5_1 = result4;
    variant5_2 = len4;
  }
  const ret = exports1['metatype:typegraph/runtimes#graphql-query'](toUint32(v0_0), variant1_0, variant1_1, variant5_0, variant5_1, variant5_2);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function graphqlMutation(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {path: v2_0 } = arg1;
  var variant5 = v2_0;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var vec4 = e;
    var len4 = vec4.length;
    var result4 = realloc0(0, 0, 4, len4 * 8);
    for (let i = 0; i < vec4.length; i++) {
      const e = vec4[i];
      const base = result4 + i * 8;var ptr3 = utf8Encode(e, realloc0, memory0);
      var len3 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len3, true);
      dataView(memory0).setInt32(base + 0, ptr3, true);
    }
    variant5_0 = 1;
    variant5_1 = result4;
    variant5_2 = len4;
  }
  const ret = exports1['metatype:typegraph/runtimes#graphql-mutation'](toUint32(v0_0), variant1_0, variant1_1, variant5_0, variant5_1, variant5_2);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function registerHttpRuntime(arg0) {
  var {endpoint: v0_0, certSecret: v0_1, basicAuthSecret: v0_2 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant3 = v0_1;
  let variant3_0;
  let variant3_1;
  let variant3_2;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
    variant3_2 = 0;
  } else {
    const e = variant3;
    var ptr2 = utf8Encode(e, realloc0, memory0);
    var len2 = utf8EncodedLen;
    variant3_0 = 1;
    variant3_1 = ptr2;
    variant3_2 = len2;
  }
  var variant5 = v0_2;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    variant5_0 = 1;
    variant5_1 = ptr4;
    variant5_2 = len4;
  }
  const ret = exports1['metatype:typegraph/runtimes#register-http-runtime'](ptr1, len1, variant3_0, variant3_1, variant3_2, variant5_0, variant5_1, variant5_2);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function httpRequest(arg0, arg1) {
  var ptr0 = realloc0(0, 0, 4, 92);
  var {runtime: v1_0, effect: v1_1 } = arg0;
  dataView(memory0).setInt32(ptr0 + 0, toUint32(v1_0), true);
  var variant2 = v1_1;
  switch (variant2.tag) {
    case 'read': {
      dataView(memory0).setInt8(ptr0 + 4, 0, true);
      break;
    }
    case 'create': {
      const e = variant2.val;
      dataView(memory0).setInt8(ptr0 + 4, 1, true);
      dataView(memory0).setInt8(ptr0 + 5, e ? 1 : 0, true);
      break;
    }
    case 'update': {
      const e = variant2.val;
      dataView(memory0).setInt8(ptr0 + 4, 2, true);
      dataView(memory0).setInt8(ptr0 + 5, e ? 1 : 0, true);
      break;
    }
    case 'delete': {
      const e = variant2.val;
      dataView(memory0).setInt8(ptr0 + 4, 3, true);
      dataView(memory0).setInt8(ptr0 + 5, e ? 1 : 0, true);
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant2.tag)}\` (received \`${variant2}\`) specified for \`Effect\``);
    }
  }
  var {method: v3_0, path: v3_1, contentType: v3_2, headerPrefix: v3_3, queryFields: v3_4, renameFields: v3_5, bodyFields: v3_6, authTokenField: v3_7 } = arg1;
  var val4 = v3_0;
  let enum4;
  switch (val4) {
    case 'get': {
      enum4 = 0;
      break;
    }
    case 'post': {
      enum4 = 1;
      break;
    }
    case 'put': {
      enum4 = 2;
      break;
    }
    case 'patch': {
      enum4 = 3;
      break;
    }
    case 'delete': {
      enum4 = 4;
      break;
    }
    default: {
      if ((v3_0) instanceof Error) {
        console.error(v3_0);
      }
      
      throw new TypeError(`"${val4}" is not one of the cases of http-method`);
    }
  }
  dataView(memory0).setInt8(ptr0 + 8, enum4, true);
  var ptr5 = utf8Encode(v3_1, realloc0, memory0);
  var len5 = utf8EncodedLen;
  dataView(memory0).setInt32(ptr0 + 16, len5, true);
  dataView(memory0).setInt32(ptr0 + 12, ptr5, true);
  var variant7 = v3_2;
  if (variant7 === null || variant7=== undefined) {
    dataView(memory0).setInt8(ptr0 + 20, 0, true);
  } else {
    const e = variant7;
    dataView(memory0).setInt8(ptr0 + 20, 1, true);
    var ptr6 = utf8Encode(e, realloc0, memory0);
    var len6 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 28, len6, true);
    dataView(memory0).setInt32(ptr0 + 24, ptr6, true);
  }
  var variant9 = v3_3;
  if (variant9 === null || variant9=== undefined) {
    dataView(memory0).setInt8(ptr0 + 32, 0, true);
  } else {
    const e = variant9;
    dataView(memory0).setInt8(ptr0 + 32, 1, true);
    var ptr8 = utf8Encode(e, realloc0, memory0);
    var len8 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 40, len8, true);
    dataView(memory0).setInt32(ptr0 + 36, ptr8, true);
  }
  var variant12 = v3_4;
  if (variant12 === null || variant12=== undefined) {
    dataView(memory0).setInt8(ptr0 + 44, 0, true);
  } else {
    const e = variant12;
    dataView(memory0).setInt8(ptr0 + 44, 1, true);
    var vec11 = e;
    var len11 = vec11.length;
    var result11 = realloc0(0, 0, 4, len11 * 8);
    for (let i = 0; i < vec11.length; i++) {
      const e = vec11[i];
      const base = result11 + i * 8;var ptr10 = utf8Encode(e, realloc0, memory0);
      var len10 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len10, true);
      dataView(memory0).setInt32(base + 0, ptr10, true);
    }
    dataView(memory0).setInt32(ptr0 + 52, len11, true);
    dataView(memory0).setInt32(ptr0 + 48, result11, true);
  }
  var variant17 = v3_5;
  if (variant17 === null || variant17=== undefined) {
    dataView(memory0).setInt8(ptr0 + 56, 0, true);
  } else {
    const e = variant17;
    dataView(memory0).setInt8(ptr0 + 56, 1, true);
    var vec16 = e;
    var len16 = vec16.length;
    var result16 = realloc0(0, 0, 4, len16 * 16);
    for (let i = 0; i < vec16.length; i++) {
      const e = vec16[i];
      const base = result16 + i * 16;var [tuple13_0, tuple13_1] = e;
      var ptr14 = utf8Encode(tuple13_0, realloc0, memory0);
      var len14 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len14, true);
      dataView(memory0).setInt32(base + 0, ptr14, true);
      var ptr15 = utf8Encode(tuple13_1, realloc0, memory0);
      var len15 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len15, true);
      dataView(memory0).setInt32(base + 8, ptr15, true);
    }
    dataView(memory0).setInt32(ptr0 + 64, len16, true);
    dataView(memory0).setInt32(ptr0 + 60, result16, true);
  }
  var variant20 = v3_6;
  if (variant20 === null || variant20=== undefined) {
    dataView(memory0).setInt8(ptr0 + 68, 0, true);
  } else {
    const e = variant20;
    dataView(memory0).setInt8(ptr0 + 68, 1, true);
    var vec19 = e;
    var len19 = vec19.length;
    var result19 = realloc0(0, 0, 4, len19 * 8);
    for (let i = 0; i < vec19.length; i++) {
      const e = vec19[i];
      const base = result19 + i * 8;var ptr18 = utf8Encode(e, realloc0, memory0);
      var len18 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len18, true);
      dataView(memory0).setInt32(base + 0, ptr18, true);
    }
    dataView(memory0).setInt32(ptr0 + 76, len19, true);
    dataView(memory0).setInt32(ptr0 + 72, result19, true);
  }
  var variant22 = v3_7;
  if (variant22 === null || variant22=== undefined) {
    dataView(memory0).setInt8(ptr0 + 80, 0, true);
  } else {
    const e = variant22;
    dataView(memory0).setInt8(ptr0 + 80, 1, true);
    var ptr21 = utf8Encode(e, realloc0, memory0);
    var len21 = utf8EncodedLen;
    dataView(memory0).setInt32(ptr0 + 88, len21, true);
    dataView(memory0).setInt32(ptr0 + 84, ptr21, true);
  }
  const ret = exports1['metatype:typegraph/runtimes#http-request'](ptr0);
  let variant25;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant25= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len24 = dataView(memory0).getInt32(ret + 8, true);
      var base24 = dataView(memory0).getInt32(ret + 4, true);
      var result24 = [];
      for (let i = 0; i < len24; i++) {
        const base = base24 + i * 8;
        var ptr23 = dataView(memory0).getInt32(base + 0, true);
        var len23 = dataView(memory0).getInt32(base + 4, true);
        var result23 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr23, len23));
        result24.push(result23);
      }
      variant25= {
        tag: 'err',
        val: {
          stack: result24,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant25.tag === 'err') {
    throw new ComponentError(variant25.val);
  }
  return variant25.val;
}

function registerPythonRuntime() {
  const ret = exports1['metatype:typegraph/runtimes#register-python-runtime']();
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function fromPythonLambda(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {runtime: v2_0, fn: v2_1 } = arg1;
  var ptr3 = utf8Encode(v2_1, realloc0, memory0);
  var len3 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#from-python-lambda'](toUint32(v0_0), variant1_0, variant1_1, toUint32(v2_0), ptr3, len3);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant6= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var base5 = dataView(memory0).getInt32(ret + 4, true);
      var result5 = [];
      for (let i = 0; i < len5; i++) {
        const base = base5 + i * 8;
        var ptr4 = dataView(memory0).getInt32(base + 0, true);
        var len4 = dataView(memory0).getInt32(base + 4, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        result5.push(result4);
      }
      variant6= {
        tag: 'err',
        val: {
          stack: result5,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function fromPythonDef(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {runtime: v2_0, name: v2_1, fn: v2_2 } = arg1;
  var ptr3 = utf8Encode(v2_1, realloc0, memory0);
  var len3 = utf8EncodedLen;
  var ptr4 = utf8Encode(v2_2, realloc0, memory0);
  var len4 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#from-python-def'](toUint32(v0_0), variant1_0, variant1_1, toUint32(v2_0), ptr3, len3, ptr4, len4);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function fromPythonModule(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {runtime: v2_0, file: v2_1, deps: v2_2 } = arg1;
  var ptr3 = utf8Encode(v2_1, realloc0, memory0);
  var len3 = utf8EncodedLen;
  var vec5 = v2_2;
  var len5 = vec5.length;
  var result5 = realloc0(0, 0, 4, len5 * 8);
  for (let i = 0; i < vec5.length; i++) {
    const e = vec5[i];
    const base = result5 + i * 8;var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len4, true);
    dataView(memory0).setInt32(base + 0, ptr4, true);
  }
  const ret = exports1['metatype:typegraph/runtimes#from-python-module'](toUint32(v0_0), variant1_0, variant1_1, toUint32(v2_0), ptr3, len3, result5, len5);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function fromPythonImport(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {module: v2_0, funcName: v2_1, secrets: v2_2 } = arg1;
  var ptr3 = utf8Encode(v2_1, realloc0, memory0);
  var len3 = utf8EncodedLen;
  var vec5 = v2_2;
  var len5 = vec5.length;
  var result5 = realloc0(0, 0, 4, len5 * 8);
  for (let i = 0; i < vec5.length; i++) {
    const e = vec5[i];
    const base = result5 + i * 8;var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len4, true);
    dataView(memory0).setInt32(base + 0, ptr4, true);
  }
  const ret = exports1['metatype:typegraph/runtimes#from-python-import'](toUint32(v0_0), variant1_0, variant1_1, toUint32(v2_0), ptr3, len3, result5, len5);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function registerRandomRuntime(arg0) {
  var {seed: v0_0, reset: v0_1 } = arg0;
  var variant1 = v0_0;
  let variant1_0;
  let variant1_1;
  if (variant1 === null || variant1=== undefined) {
    variant1_0 = 0;
    variant1_1 = 0;
  } else {
    const e = variant1;
    variant1_0 = 1;
    variant1_1 = toUint32(e);
  }
  var variant3 = v0_1;
  let variant3_0;
  let variant3_1;
  let variant3_2;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
    variant3_2 = 0;
  } else {
    const e = variant3;
    var ptr2 = utf8Encode(e, realloc0, memory0);
    var len2 = utf8EncodedLen;
    variant3_0 = 1;
    variant3_1 = ptr2;
    variant3_2 = len2;
  }
  const ret = exports1['metatype:typegraph/runtimes#register-random-runtime'](variant1_0, variant1_1, variant3_0, variant3_1, variant3_2);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant6= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var base5 = dataView(memory0).getInt32(ret + 4, true);
      var result5 = [];
      for (let i = 0; i < len5; i++) {
        const base = base5 + i * 8;
        var ptr4 = dataView(memory0).getInt32(base + 0, true);
        var len4 = dataView(memory0).getInt32(base + 4, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        result5.push(result4);
      }
      variant6= {
        tag: 'err',
        val: {
          stack: result5,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function createRandomMat(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {runtime: v2_0 } = arg1;
  const ret = exports1['metatype:typegraph/runtimes#create-random-mat'](toUint32(v0_0), variant1_0, variant1_1, toUint32(v2_0));
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant5= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function registerWasmReflectedRuntime(arg0) {
  var {wasmArtifact: v0_0 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#register-wasm-reflected-runtime'](ptr1, len1);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function fromWasmReflectedFunc(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {funcName: v2_0 } = arg1;
  var ptr3 = utf8Encode(v2_0, realloc0, memory0);
  var len3 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#from-wasm-reflected-func'](toUint32(v0_0), variant1_0, variant1_1, ptr3, len3);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant6= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var base5 = dataView(memory0).getInt32(ret + 4, true);
      var result5 = [];
      for (let i = 0; i < len5; i++) {
        const base = base5 + i * 8;
        var ptr4 = dataView(memory0).getInt32(base + 0, true);
        var len4 = dataView(memory0).getInt32(base + 4, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        result5.push(result4);
      }
      variant6= {
        tag: 'err',
        val: {
          stack: result5,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function registerWasmWireRuntime(arg0) {
  var {wasmArtifact: v0_0 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#register-wasm-wire-runtime'](ptr1, len1);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function fromWasmWireHandler(arg0, arg1) {
  var {runtime: v0_0, effect: v0_1 } = arg0;
  var variant1 = v0_1;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  var {funcName: v2_0 } = arg1;
  var ptr3 = utf8Encode(v2_0, realloc0, memory0);
  var len3 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#from-wasm-wire-handler'](toUint32(v0_0), variant1_0, variant1_1, ptr3, len3);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant6= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var base5 = dataView(memory0).getInt32(ret + 4, true);
      var result5 = [];
      for (let i = 0; i < len5; i++) {
        const base = base5 + i * 8;
        var ptr4 = dataView(memory0).getInt32(base + 0, true);
        var len4 = dataView(memory0).getInt32(base + 4, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        result5.push(result4);
      }
      variant6= {
        tag: 'err',
        val: {
          stack: result5,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function registerPrismaRuntime(arg0) {
  var {name: v0_0, connectionStringSecret: v0_1 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(v0_1, realloc0, memory0);
  var len2 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/runtimes#register-prisma-runtime'](ptr1, len1, ptr2, len2);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant5= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function prismaFindUnique(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-find-unique'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaFindMany(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-find-many'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaFindFirst(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-find-first'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaAggregate(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-aggregate'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaCount(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-count'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaGroupBy(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-group-by'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaCreateOne(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-create-one'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaCreateMany(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-create-many'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaUpdateOne(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-update-one'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaUpdateMany(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-update-many'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaUpsertOne(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-upsert-one'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaDeleteOne(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-delete-one'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaDeleteMany(arg0, arg1) {
  const ret = exports1['metatype:typegraph/runtimes#prisma-delete-many'](toUint32(arg0), toUint32(arg1));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function prismaExecute(arg0, arg1, arg2, arg3) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var variant1 = arg3;
  let variant1_0;
  let variant1_1;
  switch (variant1.tag) {
    case 'read': {
      variant1_0 = 0;
      variant1_1 = 0;
      break;
    }
    case 'create': {
      const e = variant1.val;
      variant1_0 = 1;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'update': {
      const e = variant1.val;
      variant1_0 = 2;
      variant1_1 = e ? 1 : 0;
      break;
    }
    case 'delete': {
      const e = variant1.val;
      variant1_0 = 3;
      variant1_1 = e ? 1 : 0;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant1.tag)}\` (received \`${variant1}\`) specified for \`Effect\``);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#prisma-execute'](toUint32(arg0), ptr0, len0, toUint32(arg2), variant1_0, variant1_1);
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function prismaQueryRaw(arg0, arg1, arg2, arg3) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var variant1 = arg2;
  let variant1_0;
  let variant1_1;
  if (variant1 === null || variant1=== undefined) {
    variant1_0 = 0;
    variant1_1 = 0;
  } else {
    const e = variant1;
    variant1_0 = 1;
    variant1_1 = toUint32(e);
  }
  const ret = exports1['metatype:typegraph/runtimes#prisma-query-raw'](toUint32(arg0), ptr0, len0, variant1_0, variant1_1, toUint32(arg3));
  let variant4;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant4= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var base3 = dataView(memory0).getInt32(ret + 4, true);
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 8;
        var ptr2 = dataView(memory0).getInt32(base + 0, true);
        var len2 = dataView(memory0).getInt32(base + 4, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        result3.push(result2);
      }
      variant4= {
        tag: 'err',
        val: {
          stack: result3,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant4.tag === 'err') {
    throw new ComponentError(variant4.val);
  }
  return variant4.val;
}

function prismaLink(arg0) {
  var {targetType: v0_0, relationshipName: v0_1, foreignKey: v0_2, targetField: v0_3, unique: v0_4 } = arg0;
  var variant2 = v0_1;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var ptr1 = utf8Encode(e, realloc0, memory0);
    var len1 = utf8EncodedLen;
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant3 = v0_2;
  let variant3_0;
  let variant3_1;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
  } else {
    const e = variant3;
    variant3_0 = 1;
    variant3_1 = e ? 1 : 0;
  }
  var variant5 = v0_3;
  let variant5_0;
  let variant5_1;
  let variant5_2;
  if (variant5 === null || variant5=== undefined) {
    variant5_0 = 0;
    variant5_1 = 0;
    variant5_2 = 0;
  } else {
    const e = variant5;
    var ptr4 = utf8Encode(e, realloc0, memory0);
    var len4 = utf8EncodedLen;
    variant5_0 = 1;
    variant5_1 = ptr4;
    variant5_2 = len4;
  }
  var variant6 = v0_4;
  let variant6_0;
  let variant6_1;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
  } else {
    const e = variant6;
    variant6_0 = 1;
    variant6_1 = e ? 1 : 0;
  }
  const ret = exports1['metatype:typegraph/runtimes#prisma-link'](toUint32(v0_0), variant2_0, variant2_1, variant2_2, variant3_0, variant3_1, variant5_0, variant5_1, variant5_2, variant6_0, variant6_1);
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant9= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len8 = dataView(memory0).getInt32(ret + 8, true);
      var base8 = dataView(memory0).getInt32(ret + 4, true);
      var result8 = [];
      for (let i = 0; i < len8; i++) {
        const base = base8 + i * 8;
        var ptr7 = dataView(memory0).getInt32(base + 0, true);
        var len7 = dataView(memory0).getInt32(base + 4, true);
        var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
        result8.push(result7);
      }
      variant9= {
        tag: 'err',
        val: {
          stack: result8,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant9.tag === 'err') {
    throw new ComponentError(variant9.val);
  }
  return variant9.val;
}

function prismaMigration(arg0) {
  var val0 = arg0;
  let enum0;
  switch (val0) {
    case 'diff': {
      enum0 = 0;
      break;
    }
    case 'create': {
      enum0 = 1;
      break;
    }
    case 'apply': {
      enum0 = 2;
      break;
    }
    case 'deploy': {
      enum0 = 3;
      break;
    }
    case 'reset': {
      enum0 = 4;
      break;
    }
    default: {
      if ((arg0) instanceof Error) {
        console.error(arg0);
      }
      
      throw new TypeError(`"${val0}" is not one of the cases of prisma-migration-operation`);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#prisma-migration'](enum0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function registerTemporalRuntime(arg0) {
  var {name: v0_0, hostSecret: v0_1, namespaceSecret: v0_2 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(v0_1, realloc0, memory0);
  var len2 = utf8EncodedLen;
  var variant4 = v0_2;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var ptr3 = utf8Encode(e, realloc0, memory0);
    var len3 = utf8EncodedLen;
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  const ret = exports1['metatype:typegraph/runtimes#register-temporal-runtime'](ptr1, len1, ptr2, len2, variant4_0, variant4_1, variant4_2);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function generateTemporalOperation(arg0, arg1) {
  var {matArg: v0_0, funcArg: v0_1, funcOut: v0_2, operation: v0_3 } = arg1;
  var variant2 = v0_0;
  let variant2_0;
  let variant2_1;
  let variant2_2;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
    variant2_2 = 0;
  } else {
    const e = variant2;
    var ptr1 = utf8Encode(e, realloc0, memory0);
    var len1 = utf8EncodedLen;
    variant2_0 = 1;
    variant2_1 = ptr1;
    variant2_2 = len1;
  }
  var variant3 = v0_1;
  let variant3_0;
  let variant3_1;
  if (variant3 === null || variant3=== undefined) {
    variant3_0 = 0;
    variant3_1 = 0;
  } else {
    const e = variant3;
    variant3_0 = 1;
    variant3_1 = toUint32(e);
  }
  var variant4 = v0_2;
  let variant4_0;
  let variant4_1;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
  } else {
    const e = variant4;
    variant4_0 = 1;
    variant4_1 = toUint32(e);
  }
  var variant5 = v0_3;
  let variant5_0;
  switch (variant5.tag) {
    case 'start-workflow': {
      variant5_0 = 0;
      break;
    }
    case 'signal-workflow': {
      variant5_0 = 1;
      break;
    }
    case 'query-workflow': {
      variant5_0 = 2;
      break;
    }
    case 'describe-workflow': {
      variant5_0 = 3;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`TemporalOperationType\``);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#generate-temporal-operation'](toUint32(arg0), variant2_0, variant2_1, variant2_2, variant3_0, variant3_1, variant4_0, variant4_1, variant5_0);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: {
          inp: dataView(memory0).getInt32(ret + 4, true) >>> 0,
          out: dataView(memory0).getInt32(ret + 8, true) >>> 0,
          mat: dataView(memory0).getInt32(ret + 12, true) >>> 0,
        }
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function registerTypegateMaterializer(arg0) {
  var val0 = arg0;
  let enum0;
  switch (val0) {
    case 'list-typegraphs': {
      enum0 = 0;
      break;
    }
    case 'find-typegraph': {
      enum0 = 1;
      break;
    }
    case 'add-typegraph': {
      enum0 = 2;
      break;
    }
    case 'remove-typegraphs': {
      enum0 = 3;
      break;
    }
    case 'get-serialized-typegraph': {
      enum0 = 4;
      break;
    }
    case 'get-arg-info-by-path': {
      enum0 = 5;
      break;
    }
    case 'find-available-operations': {
      enum0 = 6;
      break;
    }
    case 'find-prisma-models': {
      enum0 = 7;
      break;
    }
    case 'raw-prisma-read': {
      enum0 = 8;
      break;
    }
    case 'raw-prisma-create': {
      enum0 = 9;
      break;
    }
    case 'raw-prisma-update': {
      enum0 = 10;
      break;
    }
    case 'raw-prisma-delete': {
      enum0 = 11;
      break;
    }
    case 'query-prisma-model': {
      enum0 = 12;
      break;
    }
    default: {
      if ((arg0) instanceof Error) {
        console.error(arg0);
      }
      
      throw new TypeError(`"${val0}" is not one of the cases of typegate-operation`);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#register-typegate-materializer'](enum0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function registerTypegraphMaterializer(arg0) {
  var val0 = arg0;
  let enum0;
  switch (val0) {
    case 'resolver': {
      enum0 = 0;
      break;
    }
    case 'get-type': {
      enum0 = 1;
      break;
    }
    case 'get-schema': {
      enum0 = 2;
      break;
    }
    default: {
      if ((arg0) instanceof Error) {
        console.error(arg0);
      }
      
      throw new TypeError(`"${val0}" is not one of the cases of typegraph-operation`);
    }
  }
  const ret = exports1['metatype:typegraph/runtimes#register-typegraph-materializer'](enum0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function genReduceb(arg0, arg1) {
  var {paths: v0_0 } = arg1;
  var vec7 = v0_0;
  var len7 = vec7.length;
  var result7 = realloc0(0, 0, 4, len7 * 24);
  for (let i = 0; i < vec7.length; i++) {
    const e = vec7[i];
    const base = result7 + i * 24;var {path: v1_0, value: v1_1 } = e;
    var vec3 = v1_0;
    var len3 = vec3.length;
    var result3 = realloc0(0, 0, 4, len3 * 8);
    for (let i = 0; i < vec3.length; i++) {
      const e = vec3[i];
      const base = result3 + i * 8;var ptr2 = utf8Encode(e, realloc0, memory0);
      var len2 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len2, true);
      dataView(memory0).setInt32(base + 0, ptr2, true);
    }
    dataView(memory0).setInt32(base + 4, len3, true);
    dataView(memory0).setInt32(base + 0, result3, true);
    var {inherit: v4_0, payload: v4_1 } = v1_1;
    dataView(memory0).setInt8(base + 8, v4_0 ? 1 : 0, true);
    var variant6 = v4_1;
    if (variant6 === null || variant6=== undefined) {
      dataView(memory0).setInt8(base + 12, 0, true);
    } else {
      const e = variant6;
      dataView(memory0).setInt8(base + 12, 1, true);
      var ptr5 = utf8Encode(e, realloc0, memory0);
      var len5 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 20, len5, true);
      dataView(memory0).setInt32(base + 16, ptr5, true);
    }
  }
  const ret = exports1['metatype:typegraph/utils#gen-reduceb'](toUint32(arg0), result7, len7);
  let variant10;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant10= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len9 = dataView(memory0).getInt32(ret + 8, true);
      var base9 = dataView(memory0).getInt32(ret + 4, true);
      var result9 = [];
      for (let i = 0; i < len9; i++) {
        const base = base9 + i * 8;
        var ptr8 = dataView(memory0).getInt32(base + 0, true);
        var len8 = dataView(memory0).getInt32(base + 4, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        result9.push(result8);
      }
      variant10= {
        tag: 'err',
        val: {
          stack: result9,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant10.tag === 'err') {
    throw new ComponentError(variant10.val);
  }
  return variant10.val;
}

function addGraphqlEndpoint(arg0) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#add-graphql-endpoint'](ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function addAuth(arg0) {
  var {name: v0_0, protocol: v0_1, authData: v0_2 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant2 = v0_1;
  let variant2_0;
  switch (variant2.tag) {
    case 'oauth2': {
      variant2_0 = 0;
      break;
    }
    case 'jwt': {
      variant2_0 = 1;
      break;
    }
    case 'basic': {
      variant2_0 = 2;
      break;
    }
    default: {
      throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant2.tag)}\` (received \`${variant2}\`) specified for \`AuthProtocol\``);
    }
  }
  var vec6 = v0_2;
  var len6 = vec6.length;
  var result6 = realloc0(0, 0, 4, len6 * 16);
  for (let i = 0; i < vec6.length; i++) {
    const e = vec6[i];
    const base = result6 + i * 16;var [tuple3_0, tuple3_1] = e;
    var ptr4 = utf8Encode(tuple3_0, realloc0, memory0);
    var len4 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len4, true);
    dataView(memory0).setInt32(base + 0, ptr4, true);
    var ptr5 = utf8Encode(tuple3_1, realloc0, memory0);
    var len5 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 12, len5, true);
    dataView(memory0).setInt32(base + 8, ptr5, true);
  }
  const ret = exports1['metatype:typegraph/utils#add-auth'](ptr1, len1, variant2_0, result6, len6);
  let variant9;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant9= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len8 = dataView(memory0).getInt32(ret + 8, true);
      var base8 = dataView(memory0).getInt32(ret + 4, true);
      var result8 = [];
      for (let i = 0; i < len8; i++) {
        const base = base8 + i * 8;
        var ptr7 = dataView(memory0).getInt32(base + 0, true);
        var len7 = dataView(memory0).getInt32(base + 4, true);
        var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
        result8.push(result7);
      }
      variant9= {
        tag: 'err',
        val: {
          stack: result8,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant9.tag === 'err') {
    throw new ComponentError(variant9.val);
  }
  return variant9.val;
}

function addRawAuth(arg0) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#add-raw-auth'](ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function oauth2(arg0, arg1) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var ptr1 = utf8Encode(arg1, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#oauth2'](ptr0, len0, ptr1, len1);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr2 = dataView(memory0).getInt32(ret + 4, true);
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
      variant5= {
        tag: 'ok',
        val: result2
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function oauth2WithoutProfiler(arg0, arg1) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var ptr1 = utf8Encode(arg1, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#oauth2-without-profiler'](ptr0, len0, ptr1, len1);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr2 = dataView(memory0).getInt32(ret + 4, true);
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
      variant5= {
        tag: 'ok',
        val: result2
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function oauth2WithExtendedProfiler(arg0, arg1, arg2) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var ptr1 = utf8Encode(arg1, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(arg2, realloc0, memory0);
  var len2 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#oauth2-with-extended-profiler'](ptr0, len0, ptr1, len1, ptr2, len2);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr3 = dataView(memory0).getInt32(ret + 4, true);
      var len3 = dataView(memory0).getInt32(ret + 8, true);
      var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
      variant6= {
        tag: 'ok',
        val: result3
      };
      break;
    }
    case 1: {
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var base5 = dataView(memory0).getInt32(ret + 4, true);
      var result5 = [];
      for (let i = 0; i < len5; i++) {
        const base = base5 + i * 8;
        var ptr4 = dataView(memory0).getInt32(base + 0, true);
        var len4 = dataView(memory0).getInt32(base + 4, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        result5.push(result4);
      }
      variant6= {
        tag: 'err',
        val: {
          stack: result5,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function oauth2WithCustomProfiler(arg0, arg1, arg2) {
  var ptr0 = utf8Encode(arg0, realloc0, memory0);
  var len0 = utf8EncodedLen;
  var ptr1 = utf8Encode(arg1, realloc0, memory0);
  var len1 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#oauth2-with-custom-profiler'](ptr0, len0, ptr1, len1, toUint32(arg2));
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr2 = dataView(memory0).getInt32(ret + 4, true);
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
      variant5= {
        tag: 'ok',
        val: result2
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function gqlDeployQuery(arg0) {
  var {tg: v0_0, secrets: v0_1 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant6 = v0_1;
  let variant6_0;
  let variant6_1;
  let variant6_2;
  if (variant6 === null || variant6=== undefined) {
    variant6_0 = 0;
    variant6_1 = 0;
    variant6_2 = 0;
  } else {
    const e = variant6;
    var vec5 = e;
    var len5 = vec5.length;
    var result5 = realloc0(0, 0, 4, len5 * 16);
    for (let i = 0; i < vec5.length; i++) {
      const e = vec5[i];
      const base = result5 + i * 16;var [tuple2_0, tuple2_1] = e;
      var ptr3 = utf8Encode(tuple2_0, realloc0, memory0);
      var len3 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len3, true);
      dataView(memory0).setInt32(base + 0, ptr3, true);
      var ptr4 = utf8Encode(tuple2_1, realloc0, memory0);
      var len4 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 12, len4, true);
      dataView(memory0).setInt32(base + 8, ptr4, true);
    }
    variant6_0 = 1;
    variant6_1 = result5;
    variant6_2 = len5;
  }
  const ret = exports1['metatype:typegraph/utils#gql-deploy-query'](ptr1, len1, variant6_0, variant6_1, variant6_2);
  let variant10;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr7 = dataView(memory0).getInt32(ret + 4, true);
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
      variant10= {
        tag: 'ok',
        val: result7
      };
      break;
    }
    case 1: {
      var len9 = dataView(memory0).getInt32(ret + 8, true);
      var base9 = dataView(memory0).getInt32(ret + 4, true);
      var result9 = [];
      for (let i = 0; i < len9; i++) {
        const base = base9 + i * 8;
        var ptr8 = dataView(memory0).getInt32(base + 0, true);
        var len8 = dataView(memory0).getInt32(base + 4, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        result9.push(result8);
      }
      variant10= {
        tag: 'err',
        val: {
          stack: result9,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant10.tag === 'err') {
    throw new ComponentError(variant10.val);
  }
  return variant10.val;
}

function gqlRemoveQuery(arg0) {
  var vec1 = arg0;
  var len1 = vec1.length;
  var result1 = realloc0(0, 0, 4, len1 * 8);
  for (let i = 0; i < vec1.length; i++) {
    const e = vec1[i];
    const base = result1 + i * 8;var ptr0 = utf8Encode(e, realloc0, memory0);
    var len0 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len0, true);
    dataView(memory0).setInt32(base + 0, ptr0, true);
  }
  const ret = exports1['metatype:typegraph/utils#gql-remove-query'](result1, len1);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var ptr2 = dataView(memory0).getInt32(ret + 4, true);
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
      variant5= {
        tag: 'ok',
        val: result2
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn2(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function removeInjections(arg0) {
  const ret = exports1['metatype:typegraph/utils#remove-injections'](toUint32(arg0));
  let variant2;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant2= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len1 = dataView(memory0).getInt32(ret + 8, true);
      var base1 = dataView(memory0).getInt32(ret + 4, true);
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      variant2= {
        tag: 'err',
        val: {
          stack: result1,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant2.tag === 'err') {
    throw new ComponentError(variant2.val);
  }
  return variant2.val;
}

function metagenExec(arg0) {
  var {workspacePath: v0_0, targetName: v0_1, configJson: v0_2, tgJson: v0_3 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(v0_1, realloc0, memory0);
  var len2 = utf8EncodedLen;
  var ptr3 = utf8Encode(v0_2, realloc0, memory0);
  var len3 = utf8EncodedLen;
  var ptr4 = utf8Encode(v0_3, realloc0, memory0);
  var len4 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#metagen-exec'](ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
  let variant10;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      var len8 = dataView(memory0).getInt32(ret + 8, true);
      var base8 = dataView(memory0).getInt32(ret + 4, true);
      var result8 = [];
      for (let i = 0; i < len8; i++) {
        const base = base8 + i * 20;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        var ptr6 = dataView(memory0).getInt32(base + 8, true);
        var len6 = dataView(memory0).getInt32(base + 12, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        var bool7 = dataView(memory0).getUint8(base + 16, true);
        result8.push({
          path: result5,
          content: result6,
          overwrite: bool7 == 0 ? false : (bool7 == 1 ? true : throwInvalidBool()),
        });
      }
      variant10= {
        tag: 'ok',
        val: result8
      };
      break;
    }
    case 1: {
      var ptr9 = dataView(memory0).getInt32(ret + 4, true);
      var len9 = dataView(memory0).getInt32(ret + 8, true);
      var result9 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr9, len9));
      variant10= {
        tag: 'err',
        val: result9
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn5(ret);
  if (variant10.tag === 'err') {
    throw new ComponentError(variant10.val);
  }
  return variant10.val;
}

function metagenWriteFiles(arg0, arg1) {
  var vec3 = arg0;
  var len3 = vec3.length;
  var result3 = realloc0(0, 0, 4, len3 * 20);
  for (let i = 0; i < vec3.length; i++) {
    const e = vec3[i];
    const base = result3 + i * 20;var {path: v0_0, content: v0_1, overwrite: v0_2 } = e;
    var ptr1 = utf8Encode(v0_0, realloc0, memory0);
    var len1 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 4, len1, true);
    dataView(memory0).setInt32(base + 0, ptr1, true);
    var ptr2 = utf8Encode(v0_1, realloc0, memory0);
    var len2 = utf8EncodedLen;
    dataView(memory0).setInt32(base + 12, len2, true);
    dataView(memory0).setInt32(base + 8, ptr2, true);
    dataView(memory0).setInt8(base + 16, v0_2 ? 1 : 0, true);
  }
  var ptr4 = utf8Encode(arg1, realloc0, memory0);
  var len4 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/utils#metagen-write-files'](result3, len3, ptr4, len4);
  let variant6;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant6= {
        tag: 'ok',
        val: undefined
      };
      break;
    }
    case 1: {
      var ptr5 = dataView(memory0).getInt32(ret + 4, true);
      var len5 = dataView(memory0).getInt32(ret + 8, true);
      var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
      variant6= {
        tag: 'err',
        val: result5
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn6(ret);
  if (variant6.tag === 'err') {
    throw new ComponentError(variant6.val);
  }
  return variant6.val;
}

function registerS3Runtime(arg0) {
  var {hostSecret: v0_0, regionSecret: v0_1, accessKeySecret: v0_2, secretKeySecret: v0_3, pathStyleSecret: v0_4 } = arg0;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var ptr2 = utf8Encode(v0_1, realloc0, memory0);
  var len2 = utf8EncodedLen;
  var ptr3 = utf8Encode(v0_2, realloc0, memory0);
  var len3 = utf8EncodedLen;
  var ptr4 = utf8Encode(v0_3, realloc0, memory0);
  var len4 = utf8EncodedLen;
  var ptr5 = utf8Encode(v0_4, realloc0, memory0);
  var len5 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/aws#register-s3-runtime'](ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
  let variant8;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant8= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len7 = dataView(memory0).getInt32(ret + 8, true);
      var base7 = dataView(memory0).getInt32(ret + 4, true);
      var result7 = [];
      for (let i = 0; i < len7; i++) {
        const base = base7 + i * 8;
        var ptr6 = dataView(memory0).getInt32(base + 0, true);
        var len6 = dataView(memory0).getInt32(base + 4, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        result7.push(result6);
      }
      variant8= {
        tag: 'err',
        val: {
          stack: result7,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant8.tag === 'err') {
    throw new ComponentError(variant8.val);
  }
  return variant8.val;
}

function s3PresignGet(arg0, arg1) {
  var {bucket: v0_0, expirySecs: v0_1 } = arg1;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant2 = v0_1;
  let variant2_0;
  let variant2_1;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
  } else {
    const e = variant2;
    variant2_0 = 1;
    variant2_1 = toUint32(e);
  }
  const ret = exports1['metatype:typegraph/aws#s3-presign-get'](toUint32(arg0), ptr1, len1, variant2_0, variant2_1);
  let variant5;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant5= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len4 = dataView(memory0).getInt32(ret + 8, true);
      var base4 = dataView(memory0).getInt32(ret + 4, true);
      var result4 = [];
      for (let i = 0; i < len4; i++) {
        const base = base4 + i * 8;
        var ptr3 = dataView(memory0).getInt32(base + 0, true);
        var len3 = dataView(memory0).getInt32(base + 4, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        result4.push(result3);
      }
      variant5= {
        tag: 'err',
        val: {
          stack: result4,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant5.tag === 'err') {
    throw new ComponentError(variant5.val);
  }
  return variant5.val;
}

function s3PresignPut(arg0, arg1) {
  var {bucket: v0_0, expirySecs: v0_1, contentType: v0_2 } = arg1;
  var ptr1 = utf8Encode(v0_0, realloc0, memory0);
  var len1 = utf8EncodedLen;
  var variant2 = v0_1;
  let variant2_0;
  let variant2_1;
  if (variant2 === null || variant2=== undefined) {
    variant2_0 = 0;
    variant2_1 = 0;
  } else {
    const e = variant2;
    variant2_0 = 1;
    variant2_1 = toUint32(e);
  }
  var variant4 = v0_2;
  let variant4_0;
  let variant4_1;
  let variant4_2;
  if (variant4 === null || variant4=== undefined) {
    variant4_0 = 0;
    variant4_1 = 0;
    variant4_2 = 0;
  } else {
    const e = variant4;
    var ptr3 = utf8Encode(e, realloc0, memory0);
    var len3 = utf8EncodedLen;
    variant4_0 = 1;
    variant4_1 = ptr3;
    variant4_2 = len3;
  }
  const ret = exports1['metatype:typegraph/aws#s3-presign-put'](toUint32(arg0), ptr1, len1, variant2_0, variant2_1, variant4_0, variant4_1, variant4_2);
  let variant7;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant7= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len6 = dataView(memory0).getInt32(ret + 8, true);
      var base6 = dataView(memory0).getInt32(ret + 4, true);
      var result6 = [];
      for (let i = 0; i < len6; i++) {
        const base = base6 + i * 8;
        var ptr5 = dataView(memory0).getInt32(base + 0, true);
        var len5 = dataView(memory0).getInt32(base + 4, true);
        var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
        result6.push(result5);
      }
      variant7= {
        tag: 'err',
        val: {
          stack: result6,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant7.tag === 'err') {
    throw new ComponentError(variant7.val);
  }
  return variant7.val;
}

function s3List(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/aws#s3-list'](toUint32(arg0), ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function s3Upload(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/aws#s3-upload'](toUint32(arg0), ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

function s3UploadAll(arg0, arg1) {
  var ptr0 = utf8Encode(arg1, realloc0, memory0);
  var len0 = utf8EncodedLen;
  const ret = exports1['metatype:typegraph/aws#s3-upload-all'](toUint32(arg0), ptr0, len0);
  let variant3;
  switch (dataView(memory0).getUint8(ret + 0, true)) {
    case 0: {
      variant3= {
        tag: 'ok',
        val: dataView(memory0).getInt32(ret + 4, true) >>> 0
      };
      break;
    }
    case 1: {
      var len2 = dataView(memory0).getInt32(ret + 8, true);
      var base2 = dataView(memory0).getInt32(ret + 4, true);
      var result2 = [];
      for (let i = 0; i < len2; i++) {
        const base = base2 + i * 8;
        var ptr1 = dataView(memory0).getInt32(base + 0, true);
        var len1 = dataView(memory0).getInt32(base + 4, true);
        var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
        result2.push(result1);
      }
      variant3= {
        tag: 'err',
        val: {
          stack: result2,
        }
      };
      break;
    }
    default: {
      throw new TypeError('invalid variant discriminant for expected');
    }
  }
  postReturn0(ret);
  if (variant3.tag === 'err') {
    throw new ComponentError(variant3.val);
  }
  return variant3.val;
}

const $init = (async() => {
  const module0 = fetchCompile(new URL('./typegraph_core.core.wasm', import.meta.url));
  const module1 = base64Compile('AGFzbQEAAAABFANgAn9/AGAFf39/f38AYAN/f38AAwYFAAECAgEEBQFwAQUFByAGATAAAAExAAEBMgACATMAAwE0AAQIJGltcG9ydHMBAApNBQsAIAAgAUEAEQAACxEAIAAgASACIAMgBEEBEQEACw0AIAAgASACQQIRAgALDQAgACABIAJBAxECAAsRACAAIAEgAiADIARBBBEBAAsALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjIwOC4xAPsBBG5hbWUAExJ3aXQtY29tcG9uZW50OnNoaW0B3gEFACZpbmRpcmVjdC1tZXRhdHlwZTp0eXBlZ3JhcGgvaG9zdC1wcmludAEsaW5kaXJlY3QtbWV0YXR5cGU6dHlwZWdyYXBoL2hvc3QtZXhwYW5kLXBhdGgCLGluZGlyZWN0LW1ldGF0eXBlOnR5cGVncmFwaC9ob3N0LXBhdGgtZXhpc3RzAyppbmRpcmVjdC1tZXRhdHlwZTp0eXBlZ3JhcGgvaG9zdC1yZWFkLWZpbGUEK2luZGlyZWN0LW1ldGF0eXBlOnR5cGVncmFwaC9ob3N0LXdyaXRlLWZpbGU');
  const module2 = base64Compile('AGFzbQEAAAABFANgAn9/AGAFf39/f38AYAN/f38AAikGAAEwAAAAATEAAQABMgACAAEzAAIAATQAAQAIJGltcG9ydHMBcAEFBQkLAQBBAAsFAAECAwQALwlwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQENd2l0LWNvbXBvbmVudAcwLjIwOC4xABwEbmFtZQAVFHdpdC1jb21wb25lbnQ6Zml4dXBz');
  ({ exports: exports0 } = await instantiateCore(await module1));
  ({ exports: exports1 } = await instantiateCore(await module0, {
    'metatype:typegraph/host': {
      'expand-path': exports0['1'],
      'path-exists': exports0['2'],
      print: exports0['0'],
      'read-file': exports0['3'],
      'write-file': exports0['4'],
    },
  }));
  memory0 = exports1.memory;
  realloc0 = exports1.cabi_realloc;
  ({ exports: exports2 } = await instantiateCore(await module2, {
    '': {
      $imports: exports0.$imports,
      '0': trampoline0,
      '1': trampoline1,
      '2': trampoline2,
      '3': trampoline3,
      '4': trampoline4,
    },
  }));
  postReturn0 = exports1['cabi_post_metatype:typegraph/aws#register-s3-runtime'];
  postReturn1 = exports1['cabi_post_metatype:typegraph/core#serialize-typegraph'];
  postReturn2 = exports1['cabi_post_metatype:typegraph/core#get-type-repr'];
  postReturn3 = exports1['cabi_post_metatype:typegraph/core#get-transform-data'];
  postReturn4 = exports1['cabi_post_metatype:typegraph/core#get-internal-policy'];
  postReturn5 = exports1['cabi_post_metatype:typegraph/utils#metagen-exec'];
  postReturn6 = exports1['cabi_post_metatype:typegraph/utils#metagen-write-files'];
})();

await $init;
const aws = {
  registerS3Runtime: registerS3Runtime,
  s3List: s3List,
  s3PresignGet: s3PresignGet,
  s3PresignPut: s3PresignPut,
  s3Upload: s3Upload,
  s3UploadAll: s3UploadAll,
  
};
const core = {
  booleanb: booleanb,
  eitherb: eitherb,
  expose: expose,
  extendStruct: extendStruct,
  fileb: fileb,
  floatb: floatb,
  funcb: funcb,
  getInternalPolicy: getInternalPolicy,
  getPublicPolicy: getPublicPolicy,
  getTransformData: getTransformData,
  getTypeRepr: getTypeRepr,
  initTypegraph: initTypegraph,
  integerb: integerb,
  listb: listb,
  optionalb: optionalb,
  refb: refb,
  registerContextPolicy: registerContextPolicy,
  registerPolicy: registerPolicy,
  renameType: renameType,
  serializeTypegraph: serializeTypegraph,
  setSeed: setSeed,
  stringb: stringb,
  structb: structb,
  unionb: unionb,
  withInjection: withInjection,
  withPolicy: withPolicy,
  
};
const runtimes = {
  createRandomMat: createRandomMat,
  fromPythonDef: fromPythonDef,
  fromPythonImport: fromPythonImport,
  fromPythonLambda: fromPythonLambda,
  fromPythonModule: fromPythonModule,
  fromWasmReflectedFunc: fromWasmReflectedFunc,
  fromWasmWireHandler: fromWasmWireHandler,
  generateTemporalOperation: generateTemporalOperation,
  getDenoRuntime: getDenoRuntime,
  getPredefinedDenoFunc: getPredefinedDenoFunc,
  graphqlMutation: graphqlMutation,
  graphqlQuery: graphqlQuery,
  httpRequest: httpRequest,
  importDenoFunction: importDenoFunction,
  prismaAggregate: prismaAggregate,
  prismaCount: prismaCount,
  prismaCreateMany: prismaCreateMany,
  prismaCreateOne: prismaCreateOne,
  prismaDeleteMany: prismaDeleteMany,
  prismaDeleteOne: prismaDeleteOne,
  prismaExecute: prismaExecute,
  prismaFindFirst: prismaFindFirst,
  prismaFindMany: prismaFindMany,
  prismaFindUnique: prismaFindUnique,
  prismaGroupBy: prismaGroupBy,
  prismaLink: prismaLink,
  prismaMigration: prismaMigration,
  prismaQueryRaw: prismaQueryRaw,
  prismaUpdateMany: prismaUpdateMany,
  prismaUpdateOne: prismaUpdateOne,
  prismaUpsertOne: prismaUpsertOne,
  registerDenoFunc: registerDenoFunc,
  registerDenoStatic: registerDenoStatic,
  registerGraphqlRuntime: registerGraphqlRuntime,
  registerHttpRuntime: registerHttpRuntime,
  registerPrismaRuntime: registerPrismaRuntime,
  registerPythonRuntime: registerPythonRuntime,
  registerRandomRuntime: registerRandomRuntime,
  registerTemporalRuntime: registerTemporalRuntime,
  registerTypegateMaterializer: registerTypegateMaterializer,
  registerTypegraphMaterializer: registerTypegraphMaterializer,
  registerWasmReflectedRuntime: registerWasmReflectedRuntime,
  registerWasmWireRuntime: registerWasmWireRuntime,
  
};
const utils = {
  addAuth: addAuth,
  addGraphqlEndpoint: addGraphqlEndpoint,
  addRawAuth: addRawAuth,
  genReduceb: genReduceb,
  gqlDeployQuery: gqlDeployQuery,
  gqlRemoveQuery: gqlRemoveQuery,
  metagenExec: metagenExec,
  metagenWriteFiles: metagenWriteFiles,
  oauth2: oauth2,
  oauth2WithCustomProfiler: oauth2WithCustomProfiler,
  oauth2WithExtendedProfiler: oauth2WithExtendedProfiler,
  oauth2WithoutProfiler: oauth2WithoutProfiler,
  removeInjections: removeInjections,
  
};

export { aws, core, runtimes, utils, aws as 'metatype:typegraph/aws', core as 'metatype:typegraph/core', runtimes as 'metatype:typegraph/runtimes', utils as 'metatype:typegraph/utils',  }