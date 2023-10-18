// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::TypeGen;

pub struct Where {
    model_id: TypeId,
    skip_models: IndexMap<TypeId, String>,
}

impl Where {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_models: Default::default(),
        }
    }

    fn nested(&self, name: &str, model_id: TypeId) -> Self {
        let mut skip_models = self.skip_models.clone();
        skip_models.insert(self.model_id, name.to_string());
        Self {
            model_id,
            skip_models,
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
                    // TODO cardinality?? - many?
                    builder.propx(key, t::optional(prop.type_id))?;
                }
                Property::Unmanaged(_) => continue,
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if !self.skip_models.is_empty() {
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
        format!("{model_name}Where{suffix}")
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
