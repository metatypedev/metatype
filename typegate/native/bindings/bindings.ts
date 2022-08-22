// Auto-generated with deno_bindgen
import { CachePolicy, prepare } from "https://deno.land/x/plug@0.5.2/plug.ts"

function encode(v: string | Uint8Array): Uint8Array {
  if (typeof v !== "string") return v
  return new TextEncoder().encode(v)
}

function decode(v: Uint8Array): string {
  return new TextDecoder().decode(v)
}

function readPointer(v: any): Uint8Array {
  const ptr = new Deno.UnsafePointerView(v as bigint)
  const lengthBe = new Uint8Array(4)
  const view = new DataView(lengthBe.buffer)
  ptr.copyInto(lengthBe, 0)
  const buf = new Uint8Array(view.getUint32(0))
  ptr.copyInto(buf, 4)
  return buf
}

const url = new URL("../../../target/debug", import.meta.url)
let uri = url.toString()
if (!uri.endsWith("/")) uri += "/"

let darwin: string | { aarch64: string; x86_64: string } = uri
  + "libnative.dylib"

if (url.protocol !== "file:") {
  // Assume that remote assets follow naming scheme
  // for each macOS artifact.
  darwin = {
    aarch64: uri + "libnative_arm64.dylib",
    x86_64: uri + "libnative.dylib",
  }
}

const opts = {
  name: "native",
  urls: {
    darwin,
    windows: uri + "native.dll",
    linux: uri + "libnative.so",
  },
  policy: CachePolicy.NONE,
}
const _lib = await prepare(opts, {
  init: { parameters: [], result: "void", nonblocking: false },
  prisma_introspection: {
    parameters: ["pointer", "usize"],
    result: "pointer",
    nonblocking: true,
  },
  prisma_query: {
    parameters: ["pointer", "usize"],
    result: "pointer",
    nonblocking: true,
  },
  prisma_register_engine: {
    parameters: ["pointer", "usize"],
    result: "pointer",
    nonblocking: true,
  },
  prisma_unregister_engine: {
    parameters: ["pointer", "usize"],
    result: "pointer",
    nonblocking: true,
  },
})
export type PrismaIntrospectionInp = {
  datamodel: string
}
export type PrismaIntrospectionOut = {
  introspection: string
}
export type PrismaQueryInp = {
  key: string
  query: any
  datamodel: string
}
export type PrismaQueryOut = {
  res: string
}
export type PrismaRegisterEngineInp = {
  datamodel: string
  typegraph: string
}
export type PrismaRegisterEngineOut = {
  engine_id: string
}
export type PrismaUnregisterEngineInp = {
  key: string
}
export type PrismaUnregisterEngineOut = {
  key: string
}
export function init() {
  let rawResult = _lib.symbols.init()
  const result = rawResult
  return result
}
export function prisma_introspection(a0: PrismaIntrospectionInp) {
  const a0_buf = encode(JSON.stringify(a0))
  let rawResult = _lib.symbols.prisma_introspection(a0_buf, a0_buf.byteLength)
  const result = rawResult.then(readPointer)
  return result.then(r => JSON.parse(decode(r))) as Promise<
    PrismaIntrospectionOut
  >
}
export function prisma_query(a0: PrismaQueryInp) {
  const a0_buf = encode(JSON.stringify(a0))
  let rawResult = _lib.symbols.prisma_query(a0_buf, a0_buf.byteLength)
  const result = rawResult.then(readPointer)
  return result.then(r => JSON.parse(decode(r))) as Promise<PrismaQueryOut>
}
export function prisma_register_engine(a0: PrismaRegisterEngineInp) {
  const a0_buf = encode(JSON.stringify(a0))
  let rawResult = _lib.symbols.prisma_register_engine(a0_buf, a0_buf.byteLength)
  const result = rawResult.then(readPointer)
  return result.then(r => JSON.parse(decode(r))) as Promise<
    PrismaRegisterEngineOut
  >
}
export function prisma_unregister_engine(a0: PrismaUnregisterEngineInp) {
  const a0_buf = encode(JSON.stringify(a0))
  let rawResult = _lib.symbols.prisma_unregister_engine(
    a0_buf,
    a0_buf.byteLength,
  )
  const result = rawResult.then(readPointer)
  return result.then(r => JSON.parse(decode(r))) as Promise<
    PrismaUnregisterEngineOut
  >
}
