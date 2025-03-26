/// <reference types="./runtime.d.ts" />

//! This file provides the import point for types and values defined in:
// - ./00_runtime.js: which is preloaded by the custom deno runtime
// - ./runtime.d.ts: which types the objects from the preload

/**
 * @type {import('./runtime.d.ts').MetaNS}
 */
export const Meta = globalThis.____Meta;
