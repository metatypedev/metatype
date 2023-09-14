// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::fmt::format;

use self::additional_filters::{Distinct, Skip, Take};
use self::aggregate::{CountOutput, NumberAggregateOutput};
use self::group_by::GroupByResult;
use self::input_type::InputType;
use self::order_by::OrderBy;
use self::out_type::OutType;
use self::query_input_type::QueryInputType;
use self::query_unique_where_expr::QueryUniqueWhereExpr;
use self::query_where_expr::QueryWhereExpr;
use self::update_input::UpdateInput;
use self::with_nested_count::WithNestedCount;

use super::relationship::registry::RelationshipRegistry;
use crate::errors::Result;
use crate::global_store::with_store;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::types::{ProxyResolution, Type, TypeFun, TypeId};

mod additional_filters;
mod aggregate;
mod count;
pub mod group_by;
mod input_type;
mod order_by;
mod out_type;
pub mod query_input_type;
mod query_unique_where_expr;
mod query_where_expr;
mod update_input;
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

pub struct OperationTypes {
    pub input: TypeId,
    pub output: TypeId,
}

impl TypeGenContext {
    fn get_model_name(&self, model_id: TypeId) -> &str {
        &self.registry.models.get(&model_id).unwrap().name
    }

    pub fn find_unique(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop(
                    "where",
                    t::optional(self.generate(&QueryUniqueWhereExpr::new(model_id))?).build()?,
                )
                .build()?,
            output: t::optional(self.generate(&WithNestedCount::new(model_id))?).build()?,
        })
    }

    pub fn find_many(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: self.generate(&QueryInputType::new(model_id, false))?,
            output: t::array(self.generate(&WithNestedCount::new(model_id))?).build()?,
        })
    }

    pub fn find_first(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: self.generate(&QueryInputType::new(model_id, false))?,
            output: t::optional(self.generate(&OutType::new(model_id))?).build()?,
        })
    }

    pub fn aggregate(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: self.generate(&QueryInputType::new(model_id, false))?,
            // TODO typegen
            output: t::struct_()
                .prop("_count", self.generate(&CountOutput::new(model_id))?)
                .prop(
                    "_avg",
                    self.generate(&NumberAggregateOutput::new(model_id, true))?,
                )
                .prop(
                    "_sum",
                    self.generate(&NumberAggregateOutput::new(model_id, false))?,
                )
                .prop(
                    "_min",
                    self.generate(&NumberAggregateOutput::new(model_id, false))?,
                )
                .prop(
                    "_max",
                    self.generate(&NumberAggregateOutput::new(model_id, false))?,
                )
                .min(1)
                .build()?,
        })
    }

    pub fn count(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: self.generate(&QueryInputType::new(model_id, false))?,
            output: self.generate(&CountOutput::new(model_id))?,
        })
    }

    pub fn group_by(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: self.generate(&QueryInputType::new(model_id, true))?,
            output: self.generate(&GroupByResult::new(model_id))?,
        })
    }

    pub fn create_one(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop("data", self.generate(&InputType::for_create(model_id))?)
                .build()?,
            output: self.generate(&OutType::new(model_id))?,
        })
    }

    pub fn create_many(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop(
                    "data",
                    t::array(self.generate(&InputType::for_create(model_id))?).build()?,
                )
                .build()?,
            // TODO typegen: BatchOutput
            output: t::struct_().prop("count", t::integer().build()?).build()?,
        })
    }

    pub fn update_one(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop("data", self.generate(&InputType::for_update(model_id))?)
                .prop(
                    "where",
                    self.generate(&QueryUniqueWhereExpr::new(model_id))?,
                )
                .build()?,
            output: self.generate(&OutType::new(model_id))?,
        })
    }

    pub fn update_many(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop("data", self.generate(&UpdateInput::new(model_id))?)
                .prop(
                    "where",
                    t::optional(self.generate(&QueryWhereExpr::new(model_id))?).build()?,
                )
                .build()?,
            output: t::struct_().prop("count", t::integer().build()?).build()?,
        })
    }

    pub fn upsert_one(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;

        Ok(OperationTypes {
            input: t::struct_()
                .prop(
                    "where",
                    self.generate(&QueryUniqueWhereExpr::new(model_id))?,
                )
                .prop("create", self.generate(&InputType::for_create(model_id))?)
                .prop("update", self.generate(&UpdateInput::new(model_id))?)
                // .prop("update", self.generate(&InputType::for_update(model_id))?)
                .build()?,
            output: self.generate(&OutType::new(model_id))?,
        })
    }

    pub fn delete_one(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;
        Ok(OperationTypes {
            input: t::struct_()
                .prop(
                    "where",
                    self.generate(&QueryUniqueWhereExpr::new(model_id))?,
                )
                .build()?,
            output: self.generate(&OutType::new(model_id))?,
        })
    }

    pub fn delete_many(&mut self, model_id: TypeId) -> Result<OperationTypes> {
        self.registry.manage(model_id)?;
        Ok(OperationTypes {
            input: t::struct_()
                .prop(
                    "where",
                    t::optional(self.generate(&QueryWhereExpr::new(model_id))?).build()?,
                )
                .build()?,
            output: t::struct_().prop("count", t::integer().build()?).build()?,
        })
    }

    fn generate(&mut self, generator: &impl TypeGen) -> Result<TypeId> {
        let type_name = generator.name(self);
        if let Some(type_id) = self.cache.get(&type_name) {
            Ok(*type_id)
        } else {
            let type_id = generator.generate(self)?;
            self.cache.insert(type_name, type_id);
            // TODO check generated type name
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
        ( $op_name:ident, $test_inp:expr, $test_out:expr ) => {
            paste! {
                #[test]
                fn [<test _ $op_name>]() -> Result<()> {
                    test_op_body!($op_name, $test_inp, $test_out)
                }
            }
        };

        ( $op_name:ident ) => {
            test_op!($op_name, true, true);
        };

        ( $op_name:ident, input_only ) => {
            test_op!($op_name, true, false);
        };

        ( $op_name:ident, output_only ) => {
            test_op!($op_name, false, true);
        };
    }

    macro_rules! test_op_body {
        ( $op_name:ident, $test_inp:expr, $test_out:expr ) => {{
            let mut context = TypeGenContext::default();

            let record = models::simple_record()?;
            context.registry.manage(record)?;
            let types = context.$op_name(record)?;
            if $test_inp {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " Record inp"),
                    tree::print(types.input)
                );
            }
            if $test_out {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " Record out"),
                    tree::print(types.output)
                );
            }

            let (user, post) = models::simple_relationship()?;
            context.registry.manage(user)?;

            let types = context.$op_name(user)?;
            if $test_inp {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " User inp"),
                    tree::print(types.input)
                );
            }

            if $test_out {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " User out"),
                    tree::print(types.output)
                );
            }

            let types = context.$op_name(post)?;
            if $test_inp {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " Post inp"),
                    tree::print(types.input)
                );
            }
            if $test_out {
                insta::assert_snapshot!(
                    concat!(stringify!($op_name), " Post out"),
                    tree::print(types.output)
                );
            }

            Ok(())
        }};
    }

    test_op!(find_unique);
    test_op!(find_many);
    test_op!(find_first, output_only);
    test_op!(aggregate, output_only);
    test_op!(group_by);
    test_op!(create_one, input_only);
    test_op!(create_many);
    test_op!(update_one, input_only);
    test_op!(update_many, input_only);
    // the following operations reuse already tests types, so no need to test them
    // test_op!(count);
    // test_op!(upsert_one);
    // test_op!(delete_one);
    // test_op!(delete_many);
}
