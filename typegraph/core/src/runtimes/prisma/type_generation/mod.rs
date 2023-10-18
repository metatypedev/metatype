// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! This module is responsible for generating the types for prisma operations.
//!
//! Implementing the `TypeGen` trait will allow to generate and cache a type
//! in the `TypeGenContext`.
//! Type generation should always be done through the `TypeGenContext` to enable
//! the cache. Do not call `TypeGen::generate` directly.

use std::rc::Rc;

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

use super::context::PrismaContext;
use crate::errors::Result;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::typegraph::with_tg;
use crate::types::{TypeFun, TypeId};

mod additional_filters;
mod aggregate;
mod count;
mod filters;
pub mod group_by;
mod input_type;
mod order_by;
mod out_type;
pub mod query_input_type;
mod query_unique_where_expr;
mod query_where_expr;
mod update_input;
mod where_;
mod with_nested_count;

trait TypeGen {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId>;
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
            )
            .into());
        }
    }

    Ok(FormattedQuery {
        query: proc_query,
        ordered_keys,
    })
}

impl PrismaContext {
    fn generate(&self, generator: &impl TypeGen) -> Result<TypeId> {
        let type_name = generator.name();

        let cached = {
            let cache = self.typegen_cache.get_or_init(|| {
                let cache = with_tg(|tg| tg.get_prisma_typegen_cache()).unwrap();
                Rc::downgrade(&cache)
            });
            let cache = cache
                .upgrade()
                .ok_or_else(|| "Typegen cache not available".to_string())?;
            let cache = cache.borrow();
            cache.get(&type_name).cloned()
        };

        if let Some(type_id) = cached {
            Ok(type_id)
        } else {
            let type_id = generator.generate(self)?;

            // name validation
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
                )
                .into());
            }

            // insert new entry into cache
            let cache = self.typegen_cache.get().unwrap();
            let cache = cache
                .upgrade()
                .ok_or_else(|| "Typegen cache not available".to_string())?;
            let mut cache = cache.borrow_mut();
            cache.insert(type_name, type_id);
            Ok(type_id)
        }
    }

    pub fn generate_types(
        &mut self,
        op: impl PrismaOperation,
        model_id: TypeId,
    ) -> Result<OperationTypes> {
        self.manage(model_id)?;

        Ok(OperationTypes {
            input: op.generate_input_type(self, model_id)?,
            output: op.generate_output_type(self, model_id)?,
        })
    }
}

pub trait PrismaOperation {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId>;
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId>;
}

pub struct FindUnique;
pub struct FindMany;
pub struct FindFirst;
pub struct Aggregate;
pub struct GroupBy;
pub struct CreateOne;
pub struct CreateMany;
pub struct UpdateOne;
pub struct UpdateMany;
pub struct UpsertOne;
pub struct DeleteOne;
pub struct DeleteMany;

impl PrismaOperation for FindUnique {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .propx(
                "where",
                t::optional(context.generate(&QueryUniqueWhereExpr::new(model_id))?),
            )?
            .build()
    }

    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::optional(context.generate(&OutType::new(model_id))?).build()
    }
}

impl PrismaOperation for FindMany {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&QueryInputType::new(model_id, false))
    }

    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::array(context.generate(&WithNestedCount::new(model_id))?).build()
    }
}

impl PrismaOperation for FindFirst {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&QueryInputType::new(model_id, false))
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::optional(context.generate(&OutType::new(model_id))?).build()
    }
}

impl PrismaOperation for Aggregate {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&QueryInputType::new(model_id, false))
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop("_count", context.generate(&CountOutput::new(model_id))?)
            .prop(
                "_avg",
                context.generate(&NumberAggregateOutput::new(model_id, true))?,
            )
            .prop(
                "_sum",
                context.generate(&NumberAggregateOutput::new(model_id, false))?,
            )
            .prop(
                "_min",
                context.generate(&NumberAggregateOutput::new(model_id, false))?,
            )
            .prop(
                "_max",
                context.generate(&NumberAggregateOutput::new(model_id, false))?,
            )
            .min(1)
            .build()
    }
}

pub struct Count;

impl PrismaOperation for Count {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&QueryInputType::new(model_id, false))
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&CountOutput::new(model_id))
    }
}

impl PrismaOperation for GroupBy {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&QueryInputType::new(model_id, true))
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&GroupByResult::new(model_id))
    }
}

impl PrismaOperation for CreateOne {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop("data", context.generate(&InputType::for_create(model_id))?)
            .build()
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&OutType::new(model_id))
    }
}

impl PrismaOperation for CreateMany {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .propx(
                "data",
                t::array(context.generate(&InputType::for_create(model_id))?),
            )?
            .build()
    }
    fn generate_output_type(&self, _context: &PrismaContext, _model_id: TypeId) -> Result<TypeId> {
        t::struct_().propx("count", t::integer())?.build()
    }
}

impl PrismaOperation for UpdateOne {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop("data", context.generate(&InputType::for_update(model_id))?)
            .prop(
                "where",
                context.generate(&QueryUniqueWhereExpr::new(model_id))?,
            )
            .build()
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&OutType::new(model_id))
    }
}

impl PrismaOperation for UpdateMany {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop("data", context.generate(&UpdateInput::new(model_id))?)
            .prop(
                "where",
                t::optional(context.generate(&QueryWhereExpr::new(model_id))?).build()?,
            )
            .build()
    }
    fn generate_output_type(&self, _context: &PrismaContext, _model_id: TypeId) -> Result<TypeId> {
        t::struct_().propx("count", t::integer())?.build()
    }
}

impl PrismaOperation for UpsertOne {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop(
                "where",
                context.generate(&QueryUniqueWhereExpr::new(model_id))?,
            )
            .prop(
                "create",
                context.generate(&InputType::for_create(model_id))?,
            )
            .prop("update", context.generate(&UpdateInput::new(model_id))?)
            .build()
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&OutType::new(model_id))
    }
}

impl PrismaOperation for DeleteOne {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop(
                "where",
                context.generate(&QueryUniqueWhereExpr::new(model_id))?,
            )
            .build()
    }
    fn generate_output_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        context.generate(&OutType::new(model_id))
    }
}

impl PrismaOperation for DeleteMany {
    fn generate_input_type(&self, context: &PrismaContext, model_id: TypeId) -> Result<TypeId> {
        t::struct_()
            .prop(
                "where",
                t::optional(context.generate(&QueryWhereExpr::new(model_id))?).build()?,
            )
            .build()
    }
    fn generate_output_type(&self, _context: &PrismaContext, _model_id: TypeId) -> Result<TypeId> {
        t::struct_().propx("count", t::integer())?.build()
    }
}

impl PrismaContext {
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
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_utils::*;
    use paste::paste;

    /// generate a test for the operation:
    /// snapshot for the input type and/or the output type as specified
    macro_rules! test_op {
        ( $op_name:ident, $test_inp:expr, $test_out:expr ) => {
            paste! {
                #[test]
                fn [<test _ $op_name:snake>]() -> Result<()> {
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
            setup(None)?;
            let mut context = PrismaContext::default();

            let record = models::simple_record()?;
            context.manage(record)?;
            if $test_inp {
                let inp = $op_name.generate_input_type(&context, record)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " Record inp") },
                    tree::print(inp)
                );
            }
            if $test_out {
                let out = $op_name.generate_output_type(&context, record)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " Record out") },
                    tree::print(out)
                );
            }

            let (user, post) = models::simple_relationship()?;
            context.manage(user)?;

            if $test_inp {
                let inp = $op_name.generate_input_type(&context, user)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " User inp") },
                    tree::print(inp)
                );
            }

            if $test_out {
                let out = $op_name.generate_output_type(&context, user)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " User out") },
                    tree::print(out)
                );
            }

            if $test_inp {
                let inp = $op_name.generate_input_type(&context, post)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " Post inp") },
                    tree::print(inp)
                );
            }
            if $test_out {
                let out = $op_name.generate_output_type(&context, post)?;
                insta::assert_snapshot!(
                    paste! { concat!(stringify!([<$op_name:snake>]), " Post out") },
                    tree::print(out)
                );
            }

            Ok(())
        }};
    }

    test_op!(FindUnique);
    test_op!(FindMany);
    test_op!(FindFirst, output_only);
    test_op!(Aggregate, output_only);
    test_op!(GroupBy);
    test_op!(CreateOne, input_only);
    test_op!(CreateMany);
    test_op!(UpdateOne, input_only);
    test_op!(UpdateMany, input_only);
    // the following operations reuse already tests types, so no need to test them
    // test_op!(Count);
    // test_op!(UpsertOne);
    // test_op!(DeleteOne);
    // test_op!(DeleteMany);
}
