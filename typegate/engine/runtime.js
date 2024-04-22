/// <reference types="./runtime.d.ts" />

//! This file provides the import point for types and values defined in:
// - ./00_runtime.js: which is preloaded by the custom deno runtime
// - ./runtime.d.ts: which types the objects from the preload
//
// The preload directly adds the Meta object the global scope but we can hide
// that implementation detail and users will "import" `Meta` from this file instead.
// Or at least that is what will appear to be happening to in the type system.
