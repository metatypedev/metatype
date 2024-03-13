// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod stubs;
mod types;
mod utils;

use crate::interlude::*;
use crate::utils::*;
use crate::*;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkRustGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::MdkGeneratorConfigBase,
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
}

pub struct Generator {
    config: MdkRustGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: MdkRustGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate(&())?;
        Ok(Self { config })
    }
}

impl crate::Plugin for Generator {
    fn bill_of_inputs(&self) -> HashMap<String, GeneratorInputOrder> {
        [(
            Self::INPUT_TG.to_string(),
            GeneratorInputOrder::TypegraphDesc {
                name: self.config.base.typegraph.clone(),
            },
        )]
        .into_iter()
        .collect()
    }

    fn generate(
        &self,
        inputs: HashMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput> {
        // return Ok(GeneratorOutput(Default::default()))
        let GeneratorInputResolved::TypegraphDesc { raw: tg } = inputs
            .get(Self::INPUT_TG)
            .context("missing generator input")?;
        let mut ty_descs = nodes_to_desc(&tg.types)?;
        let mut mod_rs = GenDestBuf {
            buf: Default::default(),
        };
        gen_static(&mut mod_rs, &GenStaticOptions {});
        let mut ty_memo = Default::default();
        let gen_opts = types::GenTypesOptions {
            derive_debug: true,
            derive_serde: true,
        };
        // remove the root type which we don't want to generate types for
        // TODO: gql types || function wrappers for exposed functions
        let root = ty_descs.remove(&0).context("no root object found")?;
        for ty in ty_descs.values() {
            _ = types::gen_types(ty, &mut mod_rs, &mut ty_memo, &gen_opts)?;
        }
        if let Some(stubbed_rts) = &self.config.stubbed_runtimes {
            let stubbed_funs = get_stubbed_funcs(&tg, stubbed_rts)?;
            let gen_stub_opts = stubs::GenStubOptions {};
            for fun in &stubbed_funs {
                _ = stubs::gen_stub(fun, &mut mod_rs, &mut ty_memo, &gen_stub_opts)
            }
        }
        Ok(GeneratorOutput(
            [(self.config.base.path.join("mod.rs"), String::new())]
                .into_iter()
                .collect(),
        ))
    }
}

pub struct GenStaticOptions {}

pub fn gen_static(dest: &mut GenDestBuf, opts: &GenStaticOptions) -> anyhow::Result<Arc<str>> {
    use std::fmt::Write;

    dest.buf.write_str(include_str!("static/lib.rs"))?;
    Ok("Ctx".into())
}
