// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeFun;
use crate::types::TypeId;

use super::TypeGen;

pub struct QueryUniqueWhereExpr {
    model_id: TypeId,
}

impl QueryUniqueWhereExpr {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for QueryUniqueWhereExpr {
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let model = self.model_id.as_struct().unwrap();

        for (key, type_id) in model.iter_props() {
            let attrs = type_id.attrs()?;
            let is_id = attrs
                .concrete_type
                .as_type()?
                .get_base()
                .ok_or_else(|| "expected a concrete type".to_string())?
                .as_id;
            let is_unique = type_id.as_type()?.get_base().map_or(false, |base| {
                base.runtime_config
                    .iter()
                    .flatten()
                    .find_map(|(k, v)| (k == "unique").then(|| v.clone()))
                    .map_or(false, |v| v == "true")
            });

            if attrs.concrete_type.is_func()? || (!is_id && !is_unique) {
                continue;
            }
            let inner = attrs.concrete_type.resolve_quant()?;
            builder.propx(key, t::optional(inner))?;
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let name = self.model_id.type_name().unwrap().unwrap();
        format!("QueryUnique{}WhereInput", name)
    }
}
