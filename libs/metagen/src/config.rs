// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

//!  Sample yaml:
//!  generators: # this section only required when we support external generators
//!     - mdk_rust
//!     - mdk_ts
//!     - xgraph_ts
//!     - name: my_custom
//!       wasm_module: wasm.io/custom_gen
//!  targets:
//!     default:
//!         mdk_rust: # config for any configured generatour under this name
//!             typegraph: console
//!             path: ./mats/gen
//!             annotate_debug: true
use crate::interlude::*;

#[derive(Deserialize, Debug)]
pub struct Config {
    pub targets: HashMap<String, Target>,
}

#[derive(Deserialize, Debug)]
pub struct Target(pub HashMap<String, serde_json::Value>);

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkGeneratorConfigBase {
    #[garde(length(min = 1))]
    pub typegraph: String,
    #[garde(skip)]
    pub path: PathBuf,
}
