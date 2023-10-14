// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::model::Property;
use crate::runtimes::prisma::{relationship::Cardinality, type_generation::where_::Where};
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeId;

use super::TypeGen;

#[derive(Clone, Copy, Debug)]
enum Operation {
    Create,
    Update,
}

impl Operation {
    fn is_update(&self) -> bool {
        match self {
            Operation::Create => false,
            Operation::Update => true,
        }
    }
}

pub struct InputType {
    model_id: TypeId,
    skip_rel: Vec<String>,
    operation: Operation,
}

impl InputType {
    pub fn for_create(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
            operation: Operation::Create,
        }
    }

    pub fn for_update(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
            operation: Operation::Update,
        }
    }
}

impl TypeGen for InputType {
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Model(prop) => {
                    let rel_name = model.relationships.get(k).ok_or_else(|| {
                        format!("relationship not registered: {}::{}", model.type_name, k)
                    })?;
                    if self.skip_rel.contains(rel_name) {
                        continue;
                    }

                    let create = context.generate(&InputType {
                        model_id: prop.model_id,
                        skip_rel: {
                            let mut skip_rel = self.skip_rel.clone();
                            skip_rel.push(rel_name.to_string());
                            skip_rel
                        },
                        operation: Operation::Create,
                    })?;
                    // TODO unique where
                    let connect = context.generate(&Where::new(prop.model_id, false))?;

                    let mut inner = t::struct_();
                    inner.propx("create", t::optional(create))?;
                    inner.propx("connect", t::optional(connect))?;

                    if let Cardinality::Many = prop.quantifier {
                        inner.propx(
                            "createMany",
                            t::optionalx(t::struct_().propx("data", t::array(create))?)?,
                        )?;
                    }

                    // TODO what if cardinality is Cardinality::One ??
                    builder.propx(k, t::optionalx(inner.min(1).max(1))?)?;
                }

                Property::Scalar(prop) => {
                    builder.prop(
                        k,
                        if self.operation.is_update() || prop.auto {
                            t::optional(prop.type_id).build()?
                        } else {
                            prop.wrapper_type_id
                        },
                    );
                }

                Property::Unmanaged(_) => continue,
            }
        }

        builder.named(self.name()).build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        let suffix = if self.skip_rel.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip_rel.join("And"))
        };
        let op = match self.operation {
            Operation::Create => "Create",
            Operation::Update => "Update",
        };
        format!("_{model_name}_{op}Input{suffix}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtimes::prisma::context::PrismaContext;
    use crate::test_utils::*;

    #[test]
    fn test_input_type() -> Result<()> {
        setup(None)?;

        let mut ctx = PrismaContext::default();
        let (user, post) = models::simple_relationship()?;

        ctx.manage(user)?;

        insta::assert_snapshot!(
            "user input type for create",
            tree::print(ctx.generate(&InputType::for_create(user))?)
        );

        insta::assert_snapshot!(
            "user input type for update",
            tree::print(ctx.generate(&InputType::for_update(user))?)
        );

        insta::assert_snapshot!(
            "post input type for create",
            tree::print(ctx.generate(&InputType::for_create(post))?)
        );

        insta::assert_snapshot!(
            "post input type for update",
            tree::print(ctx.generate(&InputType::for_update(post))?)
        );

        Ok(())
    }
}
