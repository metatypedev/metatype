// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conversion::types::TypeConversion,
    errors::Result,
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{Type, TypeData, WithInjection, WrapperTypeData},
    wit::core::TypeWithInjection,
};
use common::typegraph::{EffectType, Injection, InjectionData, SingleValue, TypeNode};

use std::collections::HashMap;

impl TypeConversion for WithInjection {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe)?;
            let mut type_node = tpe.convert(ctx, runtime_id)?;
            let base = type_node.base_mut();
            let value: Injection =
                serde_json::from_str(&self.data.injection).map_err(|e| e.to_string())?;
            if let Injection::Parent(data) = value {
                let get_correct_id = |v: u32| -> Result<u32> {
                    let id = s.resolve_proxy(v)?;
                    if let Some(index) = ctx.find_type_index_by_store_id(&id) {
                        return Ok(index);
                    }
                    Err(format!("unable to find type for store id {}", id))
                };
                let new_data = match data {
                    InjectionData::SingleValue(SingleValue { value }) => {
                        InjectionData::SingleValue(SingleValue {
                            value: get_correct_id(value)?,
                        })
                    }
                    InjectionData::ValueByEffect(per_effect) => {
                        let mut new_per_effect: HashMap<EffectType, u32> = HashMap::new();
                        for (k, v) in per_effect.iter() {
                            new_per_effect.insert(*k, get_correct_id(*v)?);
                        }
                        InjectionData::ValueByEffect(new_per_effect)
                    }
                };
                base.injection = Some(Injection::Parent(new_data));
            } else {
                base.injection = Some(value);
            }
            Ok(type_node)
        })
    }
}

impl TypeData for TypeWithInjection {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        let value: Injection = serde_json::from_str(&self.injection).unwrap();
        let gen_display = |data: InjectionData<String>| match data {
            InjectionData::SingleValue(t) => t.value,
            InjectionData::ValueByEffect(t) => {
                let mut res: Vec<String> = vec![];
                for (effect, value) in t.iter() {
                    res.push(format!("{:?}:{}", effect, value));
                }
                res.join(", ")
            }
        };

        let gen_display_u32 = |data: InjectionData<u32>| match data {
            InjectionData::SingleValue(t) => t.value.to_string(),
            InjectionData::ValueByEffect(t) => {
                let mut res: Vec<String> = vec![];
                for (effect, value) in t.iter() {
                    res.push(format!("{:?}:{}", effect, value));
                }
                res.join(", ")
            }
        };

        params.push(format!(
            "injection='[{}]'",
            match value {
                Injection::Static(data) => format!("static={}", gen_display(data)),
                Injection::Context(data) => format!("context={}", gen_display(data)),
                Injection::Secret(data) => format!("secret={}", gen_display(data)),
                Injection::Dynamic(data) => format!("dynamic={}", gen_display(data)),
                Injection::Parent(data) => format!("parent={}", gen_display_u32(data)),
            },
        ));
    }

    fn variant_name(&self) -> String {
        "injection".to_string()
    }
}

impl WrapperTypeData for TypeWithInjection {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store.get_type(self.tpe).ok()
    }
}
