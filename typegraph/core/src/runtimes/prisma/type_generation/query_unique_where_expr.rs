// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t::{self, ConcreteTypeBuilder, TypeBuilder};
use crate::types::TypeFun;
use crate::{global_store::with_store, types::TypeId};

use super::{TypeGen, TypeGenContext};

pub struct QueryUniqueWhereExpr {
    model_id: TypeId,
}

impl QueryUniqueWhereExpr {
    pub fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for QueryUniqueWhereExpr {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let props = with_store(|s| -> Result<_> {
            let model = s.type_as_struct(self.model_id).unwrap();

            let mut props = vec![];
            for (k, ty) in model.data.props.iter() {
                let attrs = s.get_attributes(ty.into())?;
                let is_id = attrs
                    .concrete_type
                    .as_type(s)?
                    .get_base()
                    .ok_or_else(|| "expected a concrete type".to_string())?
                    .as_id;
                let is_unique = s.get_type(ty.into())?.get_base().map_or(false, |base| {
                    base.runtime_config
                        .iter()
                        .flatten()
                        .find_map(|(k, v)| (k == "unique").then(|| v.clone()))
                        .map_or(false, |v| v == "true")
                });
                if s.is_func(attrs.concrete_type)? || (!is_id && !is_unique) {
                    continue;
                }
                props.push((k.clone(), s.resolve_quant(attrs.concrete_type)?));
            }

            Ok(props)
        })?;

        let mut st = t::struct_();
        for (k, ty) in props.into_iter() {
            st.prop(k, t::optional(ty).build()?);
        }
        st.named(self.name(context)).build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let name = with_store(|s| s.get_type_name(self.model_id).unwrap().unwrap().to_string());
        format!("QueryUnique{}WhereInput", name)
    }
}
