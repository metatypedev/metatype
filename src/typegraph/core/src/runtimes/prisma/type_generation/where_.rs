// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use tg_schema::runtimes::prisma::ScalarType;

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, TypeBuilder};
use crate::types::TypeId;

use super::filters::{
    BooleanFilter, CompleteFilter, NumberFilter, NumberType, ScalarListFilter, StringFilter,
};
use super::TypeGen;

pub struct Where {
    model_id: TypeId,
    // skip_models: std::collections::BTreeMap<String, String>,
    aggregates: bool,
}

impl Where {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            // skip_models: Default::default(),
            aggregates: false,
        }
    }

    // fn nested(&self, name: &str, model_id: TypeId) -> Self {
    //     // let mut skip_models = self.skip_models.clone();
    //     // skip_models.insert(self.model_id.name().unwrap().unwrap(), name.to_string());
    //     Self {
    //         model_id,
    //         // skip_models,
    //         aggregates: self.aggregates,
    //     }
    // }

    pub fn with_aggregates(self) -> Self {
        Self {
            aggregates: true,
            ..self
        }
    }
}

// TODO merge with with filters??
impl TypeGen for Where {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let name = self.name(context)?;

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (key, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    // let inner = match self.skip_models.get(&prop.model_type.name()[..]) {
                    //     Some(name) => t::ref_(name.clone(), Default::default()).build()?,
                    //     None => context.generate(&self.nested(&name, prop.model_type.type_id))?,
                    // };
                    let inner = context.generate(&Self::new(prop.model_type.type_id))?;
                    match prop.quantifier {
                        Cardinality::Many => {
                            builder.propx(
                                key,
                                t::optionalx(t::unionx!(
                                    t::struct_().propx("every", t::optional(inner))?,
                                    t::struct_().propx("some", t::optional(inner))?,
                                    t::struct_().propx("none", t::optional(inner))?,
                                ))?,
                            )?;
                        }
                        _ => {
                            builder.propx(key, t::optional(inner))?;
                        }
                    }
                }

                Property::Scalar(prop) => {
                    let generated = if let Cardinality::Many = prop.quantifier {
                        context.generate(&CompleteFilter(ScalarListFilter(prop.type_id)))?
                    } else {
                        match prop.prop_type {
                            ScalarType::Boolean => {
                                context.generate(&CompleteFilter(BooleanFilter))?
                            }
                            ScalarType::Integer => context.generate(&CompleteFilter(
                                NumberFilter::new(NumberType::Integer, self.aggregates), // TODO with aggregates??
                            ))?,
                            ScalarType::Float => context.generate(&CompleteFilter(
                                NumberFilter::new(NumberType::Float, self.aggregates), // TODO with aggregates??
                            ))?,
                            ScalarType::String { .. } => {
                                context.generate(&CompleteFilter(StringFilter))?
                            }
                        }
                    };
                    // TODO cardinality?? - many?
                    builder.propx(key, t::optional(generated))?;
                }
                Property::Unmanaged(_) => continue,
            }
        }

        builder.build_named(name)
    }

    fn name(&self, _context: &PrismaContext) -> Result<String> {
        let model_name = self.model_id.name().unwrap().unwrap();

        let suffix1 = if self.aggregates {
            "_with_aggregates".to_string()
        } else {
            "".to_string()
        };

        // let suffix2 = if !self.skip_models.is_empty() {
        //     /* let nested_suffix = if self.aggregates {
        //         "_where_with_aggregates"
        //     } else {
        //         "_where"
        //     }; */
        //     let mut keys = self
        //         .skip_models
        //         .keys()
        //         .cloned()
        //         // .map(|id| id.name().unwrap().unwrap())
        //         // .map(|name| {
        //         //     name.strip_suffix(nested_suffix)
        //         //         .map(|str| str.to_owned())
        //         //         .unwrap_or(name)
        //         // })
        //         .collect::<Vec<_>>();
        //     keys.sort();
        //     format!("_excluding_{}", keys.join("_and_"))
        // } else {
        //     "".to_string()
        // };
        let suffix2 = "";
        Ok(format!("{model_name}_where{suffix1}{suffix2}"))
    }
}

#[cfg(test)]
mod test {
    use super::super::*;
    use super::*;
    use crate::test_utils::*;

    #[test]
    fn test_generate_where() -> Result<()> {
        setup(None)?;

        let mut context = PrismaContext::default();
        let record = models::simple_record()?;
        context.manage(record)?;

        let where_type = context.generate(&Where::new(record))?;
        insta::assert_snapshot!("where Record", tree::print(where_type));

        let (user, post) = models::simple_relationship()?;
        context.manage(user)?;

        insta::assert_snapshot!(
            "where User",
            tree::print(context.generate(&Where::new(user))?)
        );

        insta::assert_snapshot!(
            "where Post",
            tree::print(context.generate(&Where::new(post))?)
        );

        Ok(())
    }
}
