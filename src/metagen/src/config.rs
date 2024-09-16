// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//!  Sample yaml:
//!  ```yaml
//!  generators: # this section only required when we support external generators
//!     - mdk_rust
//!     - mdk_ts
//!     - xgraph_ts
//!     - name: my_custom
//!       wasm_module: wasm.io/custom_gen
//!  targets:
//!     default:
//!         # config for any configured generatour under this name
//!         generator: mdk_rust
//!         typegraph: console
//!         path: ./mats/gen
//!         annotate_debug: true
//! ```
use crate::interlude::*;

#[derive(Deserialize, Debug, Clone)]
pub struct Config {
    pub targets: HashMap<String, Target>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Target(pub Vec<GeneratorConfig>);

#[derive(Deserialize, Debug, Clone)]
pub struct GeneratorConfig {
    #[serde(rename = "generator")]
    pub generator_name: String,
    #[serde(flatten)]
    pub other: serde_json::Value,
}

/// If both name and path are set, name is used to disambiguate
/// from multiple typegrpahs loaded from file at path.
#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkGeneratorConfigBase {
    #[garde(length(min = 1))]
    #[serde(rename = "typegraph")]
    #[garde(custom(|_, _| either_typegraph_name_or_path(self)))]
    pub typegraph_name: Option<String>,
    #[garde(skip)]
    pub typegraph_path: Option<PathBuf>,
    #[garde(skip)]
    pub path: PathBuf,
    // TODO validation??
    #[garde(skip)]
    pub template_dir: Option<PathBuf>,
}

fn either_typegraph_name_or_path(config: &MdkGeneratorConfigBase) -> garde::Result {
    if config.typegraph_name.is_none() && config.typegraph_path.is_none() {
        Err(garde::Error::new(
            "either typegraph or typegraph_path must be set",
        ))
    } else {
        Ok(())
    }
}
