# > *deno*

A fork of the [deno cli](https://github.com/denoland/deno) inteded for running it in process.

Based off commit: `8d9fef3b8955eadfd4820455b422b5bec1cdad0a `

Heavily modified modules:
- crate::args 
    - removed all CLI flag logic
    - removed `node_modules` and `vendor` support
- crate::npm
    - removed `package.json` support
- crate::cache
    - removed linting and formatting support

Removed functionality:
- Type checking
- Vendoring
- `node_modules` support
