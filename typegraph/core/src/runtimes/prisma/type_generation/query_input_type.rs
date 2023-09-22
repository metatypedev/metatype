// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::TypeId,
};

use super::{
    additional_filters::{Distinct, Skip, Take},
    group_by::{GroupingFields, Having},
    order_by::OrderBy,
    query_where_expr::QueryWhereExpr,
    TypeGen, TypeGenContext,
};

pub struct QueryInputType {
    model_id: TypeId,
    is_group_by: bool,
}

impl QueryInputType {
    pub fn new(model_id: TypeId, is_group_by: bool) -> Self {
        Self {
            model_id,
            is_group_by,
        }
    }
}

impl TypeGen for QueryInputType {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let order_by = {
            let order_by = OrderBy::new(self.model_id);
            if self.is_group_by {
                order_by.with_aggregates()
            } else {
                order_by
            }
        };

        builder
            .prop(
                "where",
                t::optional(context.generate(&QueryWhereExpr::new(self.model_id))?).build()?,
            )
            .prop(
                "orderBy",
                t::optional(context.generate(&order_by)?).build()?,
            )
            .prop("take", t::optional(context.generate(&Take)?).build()?)
            .prop("skip", t::optional(context.generate(&Skip)?).build()?);

        if self.is_group_by {
            builder.prop("by", context.generate(&GroupingFields::new(self.model_id))?);
            builder.prop(
                "having",
                // t::optional(context.generate(&Having::new(self.model_id))?).build()?,
                t::optional(context.generate(&Having::new(self.model_id))?).build()?,
            );
        } else {
            builder.prop(
                "distinct",
                t::optional(context.generate(&Distinct(self.model_id))?).build()?,
            );
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.is_group_by { "_group_by" } else { "" };
        format!("_{model_name}_QueryInput{suffix}")
    }
}
