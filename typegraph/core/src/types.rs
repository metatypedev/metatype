// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::TypeNode;
use enum_dispatch::enum_dispatch;

use crate::conversion::types::TypeConversion;
use crate::errors::{self, Result};
use crate::global_store::{with_store, Store};
use crate::typegraph::TypegraphContext;
use crate::wit::core::{
    TypeArray, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeId as CoreTypeId, TypeInteger,
    TypeOptional, TypePolicy, TypeProxy, TypeString, TypeStruct, TypeUnion,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TypeId(pub CoreTypeId);

impl From<CoreTypeId> for TypeId {
    fn from(id: CoreTypeId) -> Self {
        Self(id)
    }
}

impl From<TypeId> for CoreTypeId {
    fn from(id: TypeId) -> Self {
        id.0
    }
}

pub trait TypeData {
    fn get_display_params_into(&self, params: &mut Vec<String>);
    fn variant_name(&self) -> String;
}

pub trait WrapperTypeData {
    fn resolve(&self, store: &Store) -> Option<TypeId>;

    fn try_resolve(&self, store: &Store) -> Result<TypeId> {
        self.resolve(store)
            .ok_or_else(|| "cannot resolve wrapped type".into())
    }
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
            as_id: false,
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
// pub type WithConfig = WrapperType<TypeWithConfig>;

#[derive(Debug)]
#[enum_dispatch(TypeFun, TypeConversion)]
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
    fn get_id(&self) -> TypeId;
    fn get_base(&self) -> Option<&TypeBase>;
    fn get_data(&self) -> &dyn TypeData;
    fn get_concrete_type(&self) -> Option<TypeId>;
    fn to_string(&self) -> String;

    fn get_concrete_type_name(&self) -> Result<String> {
        with_store(|s| {
            let concrete_type = self.get_concrete_type().unwrap(); // TODO error
            s.get_type(concrete_type)
                .map(|t| t.get_data().variant_name())
        })
    }

    fn as_wrapper_type(&self) -> Option<&dyn WrapperTypeData> {
        None
    }

    fn is_concrete_type(&self) -> bool {
        self.as_wrapper_type().is_none()
    }
}

impl<T> TypeFun for ConcreteType<T>
where
    T: TypeData,
{
    fn get_id(&self) -> TypeId {
        self.id
    }

    fn to_string(&self) -> String {
        let mut params = vec![];
        params.push(format!("#{}", self.id.0));
        self.data.get_display_params_into(&mut params);
        format!("{}({})", self.data.variant_name(), params.join(", "))
    }

    fn get_data(&self) -> &dyn TypeData {
        &self.data
    }

    fn get_concrete_type(&self) -> Option<TypeId> {
        Some(self.id)
    }

    fn get_base(&self) -> Option<&TypeBase> {
        Some(&self.base)
    }
}

impl<T> TypeFun for WrapperType<T>
where
    T: TypeData + WrapperTypeData,
{
    fn get_id(&self) -> TypeId {
        self.id
    }

    fn to_string(&self) -> String {
        let mut params = vec![];
        params.push(format!("#{}", self.id.0));
        self.data.get_display_params_into(&mut params);
        format!(
            "{}({})",
            self.get_concrete_type_name()
                .unwrap_or_else(|_| self.data.variant_name()),
            params.join(", ")
        )
    }

    fn get_data(&self) -> &dyn TypeData {
        &self.data
    }

    fn get_concrete_type(&self) -> Option<TypeId> {
        with_store(|s| {
            self.data
                .resolve(s)
                .map(|id| s.get_type(id).unwrap().get_concrete_type().unwrap())
        })
    }

    fn get_base(&self) -> Option<&TypeBase> {
        None
    }

    fn as_wrapper_type(&self) -> Option<&dyn WrapperTypeData> {
        Some(&self.data)
    }
}

impl Store {
    pub fn type_as_struct(&self, type_id: TypeId) -> Result<&Struct> {
        match self.get_type(type_id)? {
            Type::Struct(s) => Ok(s),
            _ => Err(errors::invalid_type(
                "Struct",
                &self.get_type_repr(type_id)?,
            )),
        }
    }
}

pub enum ProxyResolution {
    None,
    Try,
    Force,
}

impl TypeId {
    pub fn as_type<'a>(&self, store: &'a Store) -> Result<&'a Type> {
        store.get_type(*self)
    }

    pub fn as_struct<'a>(&self, store: &'a Store) -> Result<&'a Struct> {
        store.type_as_struct(*self)
    }

    pub fn concrete_type_id(
        &self,
        store: &Store,
        resolve_proxy: ProxyResolution,
    ) -> Result<Option<TypeId>> {
        let typ = self.as_type(store)?;
        if typ.is_concrete_type() {
            return Ok(Some(*self));
        }

        let wrapped_type = match typ {
            Type::Proxy(p) => match resolve_proxy {
                ProxyResolution::None => return Ok(None),
                ProxyResolution::Try => p.data.resolve(store),
                ProxyResolution::Force => Some(p.data.try_resolve(store)?),
            },
            x => Some(x.as_wrapper_type().unwrap().resolve(store).unwrap()),
        };

        match wrapped_type {
            Some(wrapped_type) => wrapped_type.concrete_type_id(store, resolve_proxy),
            None => Ok(None),
        }
    }
}
