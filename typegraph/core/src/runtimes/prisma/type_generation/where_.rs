// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::runtimes::prisma::ScalarType;
use indexmap::IndexMap;

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::filters::{
    BooleanFilter, CompleteFilter, NumberFilter, NumberType, ScalarListFilter, StringFilter,
};
use super::TypeGen;

pub struct Where {
    model_id: TypeId,
    skip_models: IndexMap<TypeId, String>,
    aggregates: bool,
}

impl Where {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_models: Default::default(),
            aggregates: false,
        }
    }

    fn nested(&self, name: &str, model_id: TypeId) -> Self {
        let mut skip_models = self.skip_models.clone();
        skip_models.insert(self.model_id, name.to_string());
        Self {
            model_id,
            skip_models,
            aggregates: self.aggregates,
        }
    }

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
        let name = self.name();
        let mut builder = t::struct_();

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (key, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => match self.skip_models.get(&prop.model_id) {
                    Some(name) => {
                        builder.propx(key, t::optionalx(t::proxy(name.clone()))?)?;
                    }
                    None => {
                        let inner = context.generate(&self.nested(&name, prop.model_id))?;
                        builder.propx(key, t::optional(inner))?;
                    }
                },
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

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();

        let suffix1 = if self.aggregates {
            "__agg".to_string()
        } else {
            "".to_string()
        };

        let suffix2 = if !self.skip_models.is_empty() {
            format!(
                "__skip_{}",
                self.skip_models
                    .iter()
                    .map(|(id, name)| { format!("{}_{}", id.0, name) })
                    .collect::<Vec<_>>()
                    .join("__")
            )
        } else {
            "".to_string()
        };
        format!("{model_name}Where{suffix1}{suffix2}")
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
