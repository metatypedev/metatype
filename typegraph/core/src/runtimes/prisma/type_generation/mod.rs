// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::hash_map::Entry;
use std::collections::HashMap;

use self::additional_filters::{Distinct, Skip, Take};
use self::input_type::InputType;
use self::order_by::OrderBy;
use self::out_type::OutType;
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
mod input_type;
mod order_by;
mod out_type;
mod query_unique_where_expr;
mod query_where_expr;
mod where_;
mod with_filters;
mod with_nested_count;

#[derive(Default, Debug)]
pub struct TypeGenContext {
    pub registry: RelationshipRegistry,
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

    fn find_many_inp(&mut self, model_id: TypeId) -> Result<TypeId> {
        Ok(t::struct_()
            .prop(
                "where",
                t::optional(self.generate(&QueryWhereExpr::new(model_id))?).build()?,
            )
            .prop(
                "orderBy",
                t::optional(self.generate(&OrderBy::new(model_id, vec![]))?).build()?,
            )
            .prop("take", t::optional(self.generate(&Take)?).build()?)
            .prop("skip", t::optional(self.generate(&Skip)?).build()?)
            .prop(
                "distinct",
                t::optional(self.generate(&Distinct(model_id))?).build()?,
            )
            .build()?)
    }

    pub fn find_many(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            self.find_many_inp(model_id)?,
            // output
            // t::integer().build()?
            t::array(self.generate(&WithNestedCount::new(model_id))?).build()?,
        ))
    }

    pub fn find_first(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            self.find_many_inp(model_id)?,
            // output
            t::optional(self.generate(&OutType::new(model_id))?).build()?,
        ))
    }

    pub fn create_one(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            t::struct_()
                .prop("data", self.generate(&InputType::for_create(model_id))?)
                .build()?,
            // output
            self.generate(&OutType::new(model_id))?,
        ))
    }

    pub fn create_many(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            t::struct_()
                .prop(
                    "data",
                    t::array(self.generate(&InputType::for_create(model_id))?).build()?,
                )
                .build()?,
            // output
            t::struct_().prop("count", t::integer().build()?).build()?,
        ))
    }

    pub fn update_one(&mut self, model_id: TypeId) -> Result<(TypeId, TypeId)> {
        self.registry.manage(model_id)?;

        Ok((
            // input
            t::struct_()
                .prop("data", self.generate(&InputType::for_update(model_id))?)
                .prop(
                    "where",
                    self.generate(&QueryUniqueWhereExpr::new(model_id))?,
                )
                .build()?,
            //output
            self.generate(&OutType::new(model_id))?,
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
    use paste::paste;

    macro_rules! test_op {
        ( $op_name:ident ) => {
            paste! {
                #[test]
                fn [<test _ $op_name>]() -> Result<()> {
                    let mut context = TypeGenContext::default();

                    let record = models::simple_record()?;
                    context.registry.manage(record)?;
                    let (inp, out) = context.$op_name(record)?;
                    insta::assert_snapshot!(concat!(stringify!($op_name), " Record inp"), tree::print(inp));
                    insta::assert_snapshot!(concat!(stringify!($op_name), " Record out"), tree::print(out));

                    let (user, post) = models::simple_relationship()?;
                    context.registry.manage(user)?;

                    let (inp, out) = context.$op_name(user)?;
                    insta::assert_snapshot!(concat!(stringify!($op_name), " User inp"), tree::print(inp));
                    insta::assert_snapshot!(concat!(stringify!($op_name), " User out"), tree::print(out));

                    let (inp, out) = context.$op_name(post)?;
                    insta::assert_snapshot!(concat!(stringify!($op_name), " Post inp"), tree::print(inp));
                    insta::assert_snapshot!(concat!(stringify!($op_name), " Post out"), tree::print(out));

                    Ok(())
                }

            }
        };
    }

    test_op!(find_unique);
    test_op!(find_many);
    test_op!(find_first);
    test_op!(create_one);
    test_op!(create_many);
    test_op!(update_one);
}
