// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    runtimes::prisma::{context::PrismaContext, utils::model::Property},
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::TypeId,
};

use super::TypeGen;

pub struct Where {
    model_id: TypeId,
    relations: bool, // list relations to skip??
}

impl Where {
    pub fn new(model_id: TypeId, relations: bool) -> Self {
        Self {
            model_id,
            relations,
        }
    }
}

// TODO merge with with filters??
impl TypeGen for Where {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (key, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    if !self.relations {
                        continue;
                    }

                    let inner = context.generate(&Where {
                        model_id: prop.model_id,
                        relations: false,
                    })?;
                    builder.propx(key, t::optional(inner))?;
                }
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
        let suffix = if !self.relations { "_norel" } else { "" };
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

        let where_type = context.generate(&Where::new(record, false))?;
        insta::assert_snapshot!("where Record", tree::print(where_type));

        let (user, post) = models::simple_relationship()?;
        context.manage(user)?;

        insta::assert_snapshot!(
            "where User (no rel)",
            tree::print(context.generate(&Where::new(user, false))?)
        );
        insta::assert_snapshot!(
            "where User (with rel)",
            tree::print(context.generate(&Where::new(user, true))?)
        );

        insta::assert_snapshot!(
            "where Post (no rel)",
            tree::print(context.generate(&Where::new(post, false))?)
        );

        insta::assert_snapshot!(
            "where Post (with rel)",
            tree::print(context.generate(&Where::new(post, true))?)
        );

        Ok(())
    }
}
