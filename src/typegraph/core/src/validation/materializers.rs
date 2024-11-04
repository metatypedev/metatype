// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::{DenoMaterializer, MaterializerData, Runtime};
use crate::types::{AsTypeDefEx as _, TypeDef, TypeId};
use crate::wit::core::TypeFunc;
use crate::Result;
use crate::{global_store::Store, runtimes::Materializer};

use super::errors;
use super::types::utils as type_utils;

impl Materializer {
    pub fn validate(&self, func: &TypeFunc) -> Result<()> {
        let runtime = Store::get_runtime(self.runtime_id)?;
        match (runtime, &self.data) {
            (Runtime::Deno, MaterializerData::Deno(mat_data)) => {
                Self::validate_deno_mat(mat_data, func)
            }
            // TODO
            // _ => Err(errors::invalid_runtime_type("", "")),
            _ => Ok(()), // TODO validate path components??
        }
    }

    fn validate_deno_mat(mat_data: &DenoMaterializer, func: &TypeFunc) -> Result<()> {
        match mat_data {
            DenoMaterializer::Predefined(predef) => {
                match predef.name.as_str() {
                    "identity" => {
                        if !type_utils::is_equal(func.inp.into(), func.out.into())? {
                            return Err(errors::invalid_output_type_predefined(
                                &predef.name,
                                &TypeId(func.inp).repr()?,
                                &TypeId(func.out).repr()?,
                            ));
                        }
                    }

                    "true" | "false" => {
                        if let Ok(xdef) = TypeId(func.out).as_xdef() {
                            let TypeDef::Boolean(_) = xdef.type_def else {
                                return Err(errors::invalid_output_type_predefined(
                                    &predef.name,
                                    "bool",
                                    &TypeId(func.out).repr()?,
                                ));
                            };
                        }
                    }
                    _ => {
                        return Err(errors::unknown_predefined_function(&predef.name));
                    }
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
}
