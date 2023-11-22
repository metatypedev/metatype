// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let model = context.model(self.model_id)?;
        let model = model.borrow();
        let mut builder = t::struct_();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Scalar(prop) => {
                    if &model.id_field == k || prop.unique {
                        builder.propx(k, t::optional(prop.type_id))?;
                    }
                }
                Property::Model(_) => {}
                Property::Unmanaged(_) => {}
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let name = self.model_id.name().unwrap().unwrap();
        format!("QueryUnique{}WhereInput", name)
    }
}
