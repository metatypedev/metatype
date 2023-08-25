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
                // let as_id = &registry_entry.id_field == k;
                let ty = s.resolve_proxy((*ty).into())?;
                // let is_unique = s.get_config_flag(ty, "unique")?;
                let ty = s.get_type(ty)?.get_concrete_type().unwrap();
                if s.is_func(ty)? {
                    continue;
                }
                let ty = s.resolve_quant(ty)?;
                props.push((k.clone(), ty));
            }

            Ok(props)
        })?;

        let mut st = t::struct_();
        for (k, ty) in props.into_iter() {
            st.prop(k, t::optional(ty.into()).build()?);
        }
        st.named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        format!(
            "QueryUnique{}WhereInput",
            context.registry.models.get(&self.model_id).unwrap().name
        )
    }
}
