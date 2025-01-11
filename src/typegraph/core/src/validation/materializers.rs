// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::runtimes::deno::PredefinedFunctionMatData;

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
                use PredefinedFunctionMatData as P;
                match predef {
                    P::Identity => {
                        if !type_utils::is_equal(func.inp.into(), func.out.into())? {
                            return Err(errors::invalid_output_type_predefined(
                                "identity",
                                &TypeId(func.inp).repr()?,
                                &TypeId(func.out).repr()?,
                            ));
                        }
                    }
                    P::True | P::False => {
                        if let Ok(xdef) = TypeId(func.out).as_xdef() {
                            let TypeDef::Boolean(_) = xdef.type_def else {
                                return Err(errors::invalid_output_type_predefined(
                                    match predef {
                                        P::True => "true",
                                        P::False => "false",
                                        _ => unreachable!(),
                                    },
                                    "bool",
                                    &TypeId(func.out).repr()?,
                                ));
                            };
                        }
                    }
                    P::Allow
                    | P::Deny
                    | P::Pass
                    | P::ContextCheck { .. }
                    | P::InternalPolicy { .. } => {
                        if let Ok(xdef) = TypeId(func.out).as_xdef() {
                            let TypeDef::String(_) = xdef.type_def else {
                                return Err(errors::invalid_output_type_predefined(
                                    match predef {
                                        P::Allow => "allow",
                                        P::Deny => "deny",
                                        P::Pass => "pass",
                                        P::ContextCheck { .. } => "context_check",
                                        P::InternalPolicy { .. } => "internal_policy",
                                        _ => unreachable!(),
                                    },
                                    "string",
                                    &TypeId(func.out).repr()?,
                                ));
                            };
                        }
                    }
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
}
