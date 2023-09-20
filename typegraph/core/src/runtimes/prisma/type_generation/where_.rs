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
        struct Prop {
            key: String,
            ty: TypeId,
            recurse: bool,
            relations: bool,
        }
        let mut props = vec![];

        for (k, ty) in self.model_id.as_struct().unwrap().iter_props() {
            if let Some(rel) = context.registry.find_relationship_on(self.model_id, k) {
                if !self.relations {
                    continue;
                }
                let model = rel.get_opposite_of(self.model_id, k).unwrap();
                props.push(Prop {
                    key: k.to_string(),
                    ty: model.model_type,
                    recurse: true,
                    relations: false,
                });
            } else {
                let attrs = ty.attrs()?;
                match attrs.concrete_type.as_type()? {
                    // different runtime
                    Type::Func(_) => continue,
                    Type::Optional(ty) => {
                        props.push(Prop {
                            key: k.to_string(),
                            ty: ty.data.of.into(),
                            recurse: false,
                            relations: false,
                        });
                    }
                    _ => {
                        props.push(Prop {
                            key: k.to_string(),
                            ty,
                            recurse: false,
                            relations: false,
                        });
                    }
                }
            }
        }

        let mut st = t::struct_();
        for prop in props.into_iter() {
            if prop.recurse {
                st.prop(
                    prop.key,
                    t::optional(context.generate(&Where {
                        model_id: prop.ty,
                        relations: prop.relations,
                    })?)
                    .build()?,
                );
            } else {
                st.prop(prop.key, t::optional(prop.ty).build()?);
            }
        }

        st.named(self.name(context)).build()
    }

    fn name(&self, context: &super::TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.model_id).unwrap().name;
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
        let mut context = TypeGenContext::default();
        let record = models::simple_record()?;
        context.registry.manage(record)?;

        let where_type = context.generate(&Where::new(record, false))?;
        insta::assert_snapshot!("where Record", tree::print(where_type));

        Ok(())
    }
}
