// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::runtimes::{DenoMaterializer, MaterializerData, Runtime};
use crate::types::Type;
use crate::wit::core::TypeFunc;
use crate::Result;
use crate::{global_store::Store, runtimes::Materializer};

use super::errors;
use super::types::utils as type_utils;

impl Materializer {
    pub fn validate(&self, s: &Store, func: &TypeFunc) -> Result<()> {
        let runtime = s.get_runtime(self.runtime_id)?;
        match (runtime, &self.data) {
            (Runtime::Deno, MaterializerData::Deno(mat_data)) => {
                Self::validate_deno_mat(s, mat_data, func)
            }
            // TODO
            // _ => Err(errors::invalid_runtime_type("", "")),
            _ => Ok(()), // TODO validate path components??
        }
    }

    fn validate_deno_mat(s: &Store, mat_data: &DenoMaterializer, func: &TypeFunc) -> Result<()> {
        match mat_data {
            DenoMaterializer::Predefined(predef) => {
                match predef.name.as_str() {
                    "identity" => {
                        if !type_utils::is_equal(s, func.inp.into(), func.out.into())? {
                            return Err(errors::invalid_output_type_predefined(
                                &predef.name,
                                &s.get_type_repr(func.inp.into())?,
                                &s.get_type_repr(func.out.into())?,
                            ));
                        }
                    }

                    "true" | "false" => {
                        if let Ok(out_id) = s.resolve_proxy(func.out.into()) {
                            let out_type = s.get_type(out_id)?;
                            let Type::Boolean(_) = out_type else {
                                return Err(errors::invalid_output_type_predefined(
                                    &predef.name,
                                    "bool",
                                    &s.get_type_repr(func.out.into())?,
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
