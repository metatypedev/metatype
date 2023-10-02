// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeId},
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

impl TypeGen for Where {
    fn generate(&self, context: &mut super::TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();

        for (key, type_id) in self.model_id.as_struct().unwrap().iter_props() {
            if let Some(rel) = context.registry.find_relationship_on(self.model_id, key) {
                if !self.relations {
                    continue;
                }
                let model = rel.get_opposite_of(self.model_id, key).unwrap();

                let inner = context.generate(&Where {
                    model_id: model.model_type,
                    relations: false,
                })?;
                builder.prop(key, t::optional(inner).build()?);
            } else {
                let non_optional = type_id.non_optional_concrete_type()?;
                match non_optional.as_type()? {
                    Type::Optional(_) => unreachable!(),
                    Type::Func(_) => continue,
                    _ => {
                        builder.prop(key, t::optional(non_optional).build()?);
                    }
                }
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

        let mut context = TypeGenContext::default();
        let record = models::simple_record()?;
        context.registry.manage(record)?;

        let where_type = context.generate(&Where::new(record, false))?;
        insta::assert_snapshot!("where Record", tree::print(where_type));

        Ok(())
    }
}
