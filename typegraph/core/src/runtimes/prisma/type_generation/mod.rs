// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::hash_map::Entry;
use std::collections::HashMap;

use self::query_unique_where_expr::QueryUniqueWhereExpr;
use self::with_nested_count::WithNestedCount;

use super::relationship::registry::RelationshipRegistry;
use crate::errors::Result;
use crate::global_store::with_store;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::types::{ProxyResolution, Type, TypeFun, TypeId};

mod count;
pub mod find_unique;
mod query_unique_where_expr;
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
                .prop("where", self.generate(QueryUniqueWhereExpr::new(model_id))?)
                .build()?,
            // output
            self.generate(WithNestedCount::new(model_id))?,
        ))
    }

    fn generate(&mut self, generator: impl TypeGen) -> Result<TypeId> {
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
