// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! This module is responsible for generating the types for prisma operations.
//!
//! Implementing the `TypeGen` trait will allow to generate and cache a type
//! in the `TypeGenContext`.
//! Type generation should always be done through the `TypeGenContext` to enable
//! the cache. Do not call `TypeGen::generate` directly.

use std::collections::HashMap;

use regex::Regex;

use self::aggregate::{CountOutput, NumberAggregateOutput};
use self::group_by::GroupByResult;
use self::input_type::InputType;
use self::out_type::OutType;
use self::query_input_type::QueryInputType;
use self::query_unique_where_expr::QueryUniqueWhereExpr;
use self::query_where_expr::QueryWhereExpr;
use self::update_input::UpdateInput;
use self::with_nested_count::WithNestedCount;

use super::relationship::registry::RelationshipRegistry;
use crate::errors::Result;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::types::{TypeFun, TypeId};

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
    fn name(&self) -> String;
}

pub struct OperationTypes {
    pub input: TypeId,
    pub output: TypeId,
}

pub struct FormattedQuery {
    pub query: String,
    pub ordered_keys: Vec<String>,
}

pub fn replace_variables_to_indices(query: String, input_id: TypeId) -> Result<FormattedQuery> {
    let parameters = input_id.as_struct()?;
    let mut proc_query = query;
    let mut ordered_keys = vec![];
    let mut not_present = vec![];
    for (index, (var, _)) in parameters.data.props.iter().enumerate() {
        // Note: pattern matches ${var}, ${  var}, ${ var  }, ..
        let pattern = format!("\\$\\{{\\s*{var}\\s*\\}}");
        let re = Regex::new(&pattern).map_err(|e| e.to_string())?;
        if !re.is_match(&proc_query) {
            not_present.push(format!("{:?}", var));
        } else {
            ordered_keys.push(var.clone());
            proc_query = re
                .replace_all(&proc_query, &format!("$${}", index + 1))
                .to_string();
        }
        if !not_present.is_empty() {
            return Err(format!(
                "{} present in type definition but not in the query",
                not_present.join(", ")
            ));
        }
    }

    Ok(FormattedQuery {
        query: proc_query,
        ordered_keys,
    })
}

impl TypeGenContext {
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

    pub fn execute_raw(&mut self, param: TypeId) -> Result<OperationTypes> {
        let param = param.as_struct()?;
        Ok(OperationTypes {
            input: param.get_id(),
            output: t::integer().build()?,
        })
    }

    pub fn query_raw(&mut self, param: Option<TypeId>, out: TypeId) -> Result<OperationTypes> {
        let param = param.unwrap_or(t::struct_().build()?).as_struct()?;
        Ok(OperationTypes {
            input: param.get_id(),
            output: out,
        })
    }

    fn generate(&mut self, generator: &impl TypeGen) -> Result<TypeId> {
        //! Generates a type and caches it, or returns the cached type if it
        //! already exists.

        let type_name = generator.name();
        if let Some(type_id) = self.cache.get(&type_name) {
            Ok(*type_id)
        } else {
            let type_id = generator.generate(self)?;
            let typ = type_id.as_type()?;
            let name = typ
                .get_base()
                .ok_or_else(|| "Generated type must be a concrete type".to_string())?
                .name
                .as_ref()
                .ok_or_else(|| format!("Generated type must have name: {type_name}"))?;
            if name != &type_name {
                return Err(format!(
                    "Generated type name mismatch: expected {}, got {}",
                    type_name, name
                ));
            }
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
