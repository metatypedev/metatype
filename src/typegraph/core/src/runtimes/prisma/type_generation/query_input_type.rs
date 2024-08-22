// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::context::PrismaContext,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::TypeId,
};

use super::{
    additional_filters::{Cursor, Distinct, Skip, Take},
    group_by::{GroupingFields, Having},
    order_by::OrderBy,
    query_where_expr::QueryWhereExpr,
    TypeGen,
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
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
            .propx(
                "where",
                t::optional(context.generate(&QueryWhereExpr::new(self.model_id))?),
            )?
            .propx("orderBy", t::optional(context.generate(&order_by)?))?
            .propx("take", t::optional(context.generate(&Take)?))?
            .propx("skip", t::optional(context.generate(&Skip)?))?
            .propx(
                "cursor",
                t::optional(context.generate(&Cursor::new(self.model_id))?),
            )?;

        if self.is_group_by {
            builder.prop("by", context.generate(&GroupingFields::new(self.model_id))?);
            builder.propx(
                "having",
                // t::optional(context.generate(&Having::new(self.model_id))?).build()?,
                t::optional(context.generate(&Having::new(self.model_id))?),
            )?;
        } else {
            builder.propx(
                "distinct",
                t::optional(context.generate(&Distinct(self.model_id))?),
            )?;
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.name().unwrap().unwrap();
        let suffix = if self.is_group_by { "_group_by" } else { "" };
        format!("_{model_name}_QueryInput{suffix}")
    }
}
