// Copyright Metatype under the Elastic License 2.0.

// deno-lint-ignore-file no-unused-vars
import { Static, Type } from "typebox";

// we will use this jsonschema jit compiler: https://github.com/sinclairzx81/typebox
// and the types format will become a superset of the jsonschema https://json-schema.org/understanding-json-schema/reference/index.html
// & https://json-schema.org/understanding-json-schema/structuring.html
// especially we will use json pointer to encode the typegraph https://json-schema.org/understanding-json-schema/structuring.html#json-pointer
// it will allow to extend some type later using wasi "typechecking" https://github.com/chiefbiiko/json-schm-wasm
// for now but we will add directely the following new jsonschema "type"
// - optional
// - func

const tg = {
  "types": [
    // each type should be jsonschema compatible type with extension
  ],
  "materializers": [
    // ... as today
  ],
  "runtimes": [
    // ... as today
  ],
  "policies": [
    // ... as today
  ],
  "meta": {
    // ... as today
  },
};
