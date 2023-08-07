// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use enum_dispatch::enum_dispatch;

use crate::conversion::types::TypeConversion;
use crate::errors::Result;
use crate::global_store::{with_store, Store};
use crate::typegraph::TypegraphContext;
use crate::wit::core::{
    PolicySpec, TypeArray, TypeBase, TypeEither, TypeFunc, TypeId, TypeInteger, TypeOptional,
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
        Self { name: None }
    }
}

#[derive(Debug)]
pub struct TypeBoolean;

pub type Proxy = WrapperType<TypeProxy>;
pub type Struct = ConcreteType<TypeStruct>;
pub type Integer = ConcreteType<TypeInteger>;
pub type Func = ConcreteType<TypeFunc>;
pub type Boolean = ConcreteType<TypeBoolean>;
pub type StringT = ConcreteType<TypeString>;
pub type Array = ConcreteType<TypeArray>;
pub type Optional = ConcreteType<TypeOptional>;
pub type Union = ConcreteType<TypeUnion>;
pub type Either = ConcreteType<TypeEither>;
pub type WithPolicy = WrapperType<TypePolicy>;

#[derive(Debug)]
#[enum_dispatch(TypeFun, TypeConversion)]
pub enum Type {
    Proxy(Proxy),
    Struct(Struct),
    Integer(Integer),
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
}

impl TypeData for TypeProxy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("proxy_name='{}'", self.name));
    }

    fn variant_name(&self) -> String {
        "proxy".to_string()
    }
}

impl WrapperTypeData for TypeProxy {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store
            .get_type_by_name(&self.name)
            .map(|id| store.get_type(id).unwrap())
    }
}

impl TypeData for TypeInteger {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        if let Some(min) = self.min {
            params.push(format!("min={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("max={}", max));
        }
    }

    fn variant_name(&self) -> String {
        "integer".to_string()
    }
}

impl TypeData for TypeBoolean {
    fn get_display_params_into(&self, _params: &mut Vec<String>) {}

    fn variant_name(&self) -> String {
        "boolean".to_string()
    }
}

impl TypeData for TypeString {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        if let Some(min) = self.min {
            params.push(format!("min={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("max={}", max));
        }
        if let Some(pattern) = self.pattern.to_owned() {
            params.push(format!("pattern={}", pattern));
        }
        if let Some(format) = self.format.to_owned() {
            params.push(format!("format={}", format));
        }
    }

    fn variant_name(&self) -> String {
        "string".to_string()
    }
}

impl TypeData for TypeArray {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("items={}", self.of));
        if let Some(min) = self.min {
            params.push(format!("minItems={}", min));
        }
        if let Some(max) = self.max {
            params.push(format!("maxItems={}", max));
        }
        if let Some(unique) = self.unique_items {
            params.push(format!("uniqueItems={}", unique));
        }
    }

    fn variant_name(&self) -> String {
        "array".to_string()
    }
}

impl TypeData for TypeOptional {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("item={}", self.of));
        if let Some(default) = self.default_item.clone() {
            params.push(format!("defaultItem={}", default));
        }
    }

    fn variant_name(&self) -> String {
        "optional".to_string()
    }
}

impl TypeData for TypeUnion {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[u{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "union".to_string()
    }
}

impl TypeData for TypeEither {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (i, tpe_id) in self.variants.iter().enumerate() {
            params.push(format!("[e{}] => #{}", i, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "either".to_string()
    }
}

impl TypeData for TypeStruct {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        for (name, tpe_id) in self.props.iter() {
            params.push(format!("[{}] => #{}", name, tpe_id));
        }
    }

    fn variant_name(&self) -> String {
        "struct".to_string()
    }
}

impl TypeData for TypeFunc {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("#{} => #{}", self.inp, self.out));
    }

    fn variant_name(&self) -> String {
        "func".to_string()
    }
}

impl TypeData for TypePolicy {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!(
            "policy='[{}]'",
            self.chain
                .iter()
                .map(|p| match p {
                    PolicySpec::Simple(pol_id) => format!(
                        "'{}'",
                        with_store(|s| s.get_policy(*pol_id).unwrap().name.clone())
                    ),
                    PolicySpec::PerEffect(p) => with_store(|s| format!(
                        "{{create='{}', update='{}', delete='{}', none='{}'}}",
                        p.create
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.update
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.delete
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                        p.none
                            .map(|pol_id| s.get_policy(pol_id).unwrap().name.as_str())
                            .unwrap_or("null"),
                    )),
                })
                .collect::<Vec<_>>()
                .join(", ")
        ));
    }

    fn variant_name(&self) -> String {
        "policy".to_string()
    }
}

impl WrapperTypeData for TypePolicy {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store.get_type(self.tpe).ok()
    }
}
