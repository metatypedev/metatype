// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::{errors::Result, types::TypeId};

use super::{where_::Where, with_filters::WithFilters, TypeGen};

pub struct QueryWhereExpr {
    model_id: TypeId,
}

impl QueryWhereExpr {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for QueryWhereExpr {
    fn generate(&self, context: &mut super::TypeGenContext) -> Result<TypeId> {
        let where_type = context.generate(&Where::new(self.model_id, true))?;
        let extended_type =
            context.generate(&WithFilters::new(where_type, self.model_id, false))?;

        let props = extended_type.as_struct().unwrap().data.props.to_vec();

        let name = self.name(context);
        let self_ref = t::proxy(&name).build()?;
        let and = t::optional(t::array(self_ref).build()?).build()?;

        let mut builder = t::struct_();
        builder.named(name);
        for (k, ty) in props.into_iter() {
            builder.prop(k.clone(), ty.into());
        }
        builder.prop("AND", and);
        builder.prop("OR", and);
        builder.prop("NOT", t::optional(self_ref).build()?);

        builder.build()
    }

    fn name(&self, _context: &super::TypeGenContext) -> String {
        format!(
            "Query{}WhereInput",
            self.model_id.type_name().unwrap().unwrap()
        )
    }
}
