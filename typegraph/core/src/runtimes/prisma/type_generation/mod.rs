// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::hash_map::Entry;
use std::collections::HashMap;

use self::additional_filters::{Skip, Take, Distinct};
use self::order_by::OrderBy;
use self::query_unique_where_expr::QueryUniqueWhereExpr;
use self::query_where_expr::QueryWhereExpr;
use self::with_nested_count::WithNestedCount;

use super::relationship::registry::RelationshipRegistry;
use crate::errors::Result;
use crate::global_store::with_store;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::types::{ProxyResolution, Type, TypeFun, TypeId};

mod additional_filters;
mod count;
pub mod find_unique;
mod order_by;
mod query_unique_where_expr;
pub mod query_where_expr;
pub mod where_;
pub mod with_filters;
mod with_nested_count;

#[derive(Default)]
struct TypeGenContext {
    registry: RelationshipRegistry,
    cache: HashMap<String, TypeId>,
}

trait TypeGen {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId>;
    fn name(&self, context: &TypeGenContext) -> String;
}

impl TypeGenContext {
    pub fn find_unique(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            t::struct_()
                .prop(
                    "where",
                    t::optional(self.generate(&QueryUniqueWhereExpr::new(model_id))?).build()?,
                )
                .build()?,
            // output
            t::optional(self.generate(&WithNestedCount::new(model_id))?).build()?,
        ))
    }

    pub fn find_many(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            t::struct_()
                .prop(
                    "where",
                    t::optional(self.generate(&QueryWhereExpr::new(model_id))?).build()?,
                )
                .prop(
                    "orderBy",
                    t::optional(self.generate(&OrderBy(model_id))?).build()?,
                )
                .prop("take", t::optional(self.generate(&Take)?).build()?)
                .prop("skip", t::optional(self.generate(&Skip)?).build()?)
                .prop(
                    "distinct",
                    t::optional(self.generate(&Distinct(model_id))?).build()?,
                )
                .build()?,
            // output
            t::array(self.generate(&WithNestedCount::new(model_id))?).build()?,
        ))
    }

    fn generate(&mut self, generator: &impl TypeGen) -> Result<TypeId> {
        let type_name = generator.name(self);
        if let Some(type_id) = self.cache.get(&type_name) {
            Ok(*type_id)
        } else {
            let type_id = generator.generate(self)?;
            self.cache.insert(type_name, type_id);
            Ok(type_id)
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_utils::*;

    #[test]
    fn test_find_unique() -> Result<()> {
        let mut context = TypeGenContext::default();
        let (user, post) = models::simple_relationship()?;
        context.registry.manage(user)?;

        let (inp, out) = context.find_unique(user)?;
        insta::assert_snapshot!("find_unique User inp", tree::print(inp));
        insta::assert_snapshot!("find_unique User out", tree::print(out));

        let (inp, out) = context.find_unique(post)?;
        insta::assert_snapshot!("find_unique Post inp", tree::print(inp));
        insta::assert_snapshot!("find_unique Post out", tree::print(out));

        Ok(())
    }
}
