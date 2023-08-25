// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use common::typegraph::{EffectType, Injection, InjectionData, SingleValue, TypeNode};
use enum_dispatch::enum_dispatch;

use crate::conversion::types::TypeConversion;
use crate::errors::Result;
use crate::global_store::{with_store, Store};
use crate::typegraph::TypegraphContext;
use crate::wit::core::{
    TypeArray, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeId, TypeInteger, TypeOptional,
    TypePolicy, TypeProxy, TypeString, TypeStruct, TypeUnion,
};

pub trait TypeData {
    fn get_display_params_into(&self, params: &mut Vec<String>);
    fn variant_name(&self) -> String;
}

pub trait WrapperTypeData {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type>;
}

#[derive(Debug)]
pub struct ConcreteType<T: TypeData> {
    pub id: TypeId,
    pub base: TypeBase,
    pub data: T,
}

#[derive(Debug)]
pub struct WrapperType<T: TypeData + WrapperTypeData> {
    pub id: TypeId,
    pub data: T,
}

#[allow(clippy::derivable_impls)]
impl Default for TypeBase {
    fn default() -> Self {
        Self {
            name: None,
            injection: None,
            runtime_config: None,
        }
    }
}

#[derive(Debug)]
pub struct TypeBoolean;

pub type Proxy = WrapperType<TypeProxy>;
pub type Struct = ConcreteType<TypeStruct>;
pub type Integer = ConcreteType<TypeInteger>;
pub type Float = ConcreteType<TypeFloat>;
pub type Func = ConcreteType<TypeFunc>;
pub type Boolean = ConcreteType<TypeBoolean>;
pub type StringT = ConcreteType<TypeString>;
pub type Array = ConcreteType<TypeArray>;
pub type Optional = ConcreteType<TypeOptional>;
pub type Union = ConcreteType<TypeUnion>;
pub type Either = ConcreteType<TypeEither>;
pub type WithPolicy = WrapperType<TypePolicy>;

#[derive(Debug)]
#[enum_dispatch(TypeFun, TypeConversion, TypeModifier)]
pub enum Type {
    Proxy(Proxy),
    Struct(Struct),
    Integer(Integer),
    Float(Float),
    Func(Func),
    Boolean(Boolean),
    String(StringT),
    Array(Array),
    Optional(Optional),
    Union(Union),
    Either(Either),
    WithPolicy(WithPolicy),
}

#[enum_dispatch]
pub trait TypeFun {
    fn get_base(&self) -> Option<&TypeBase>;
    fn get_concrete_type_name(&self) -> Option<String>;
    fn to_string(&self) -> String;
    fn update_injection(&mut self, value: String);
}

#[enum_dispatch]
pub trait TypeModifier {
    fn apply_injection(&self, tpe: &mut TypeNode) -> Result<()>;
    // TODO: maybe use the same logic for runtime config?
    // fn apply_runtime_config(&self, tpe: &mut TypeNode);
}

impl<T> TypeFun for ConcreteType<T>
where
    T: TypeData,
{
    fn to_string(&self) -> String {
        let mut params = vec![];
        params.push(format!("#{}", self.id));
        self.data.get_display_params_into(&mut params);
        format!("{}({})", self.data.variant_name(), params.join(", "))
    }

    fn get_concrete_type_name(&self) -> Option<String> {
        Some(self.data.variant_name())
    }

    fn get_base(&self) -> Option<&TypeBase> {
        Some(&self.base)
    }

    fn update_injection(&mut self, value: String) {
        self.base.injection = Some(value);
    }
}

impl<T> TypeModifier for ConcreteType<T>
where
    T: TypeData,
{
    fn apply_injection(&self, tpe: &mut TypeNode) -> Result<()> {
        if let Some(base) = self.get_base() {
            if let Some(injection) = base.injection.clone() {
                let value: Injection =
                    serde_json::from_str(&injection).map_err(|e| e.to_string())?;
                if let Injection::Parent(data) = value {
                    let get_correct_id = |v: u32| -> Result<u32> {
                        with_store(|s| -> Result<u32> {
                            let id = s.resolve_proxy(v)?;
                            Ok(id)
                        })
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
                    tpe.base_mut().injection = Some(Injection::Parent(new_data));
                } else {
                    tpe.base_mut().injection = Some(value);
                }
            }
        }
        Ok(())
    }
}

impl<T> TypeFun for WrapperType<T>
where
    T: TypeData + WrapperTypeData,
{
    fn to_string(&self) -> String {
        let mut params = vec![];
        params.push(format!("#{}", self.id));
        self.data.get_display_params_into(&mut params);
        format!(
            "{}({})",
            self.get_concrete_type_name()
                .unwrap_or_else(|| self.data.variant_name()),
            params.join(", ")
        )
    }

    fn get_concrete_type_name(&self) -> Option<String> {
        with_store(|s| {
            self.data
                .get_wrapped_type(s)
                .and_then(|t| t.get_concrete_type_name())
        })
    }

    fn get_base(&self) -> Option<&TypeBase> {
        None
    }

    fn update_injection(&mut self, _value: String) {}
}

impl<T> TypeModifier for WrapperType<T>
where
    T: TypeData + WrapperTypeData,
{
    fn apply_injection(&self, _tpe: &mut TypeNode) -> Result<()> {
        Ok(())
    }
}
