// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::fmt::Debug;

use common::typegraph::{Injection, TypeNode};
use enum_dispatch::enum_dispatch;

use crate::conversion::types::TypeConversion;
use crate::errors::{self, ErrorContext, Result};
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::wit::core::{
    PolicySpec, TypeBase, TypeEither, TypeFile, TypeFloat, TypeFunc, TypeId as CoreTypeId,
    TypeInteger, TypeList, TypeOptional, TypePolicy, TypeProxy, TypeString, TypeStruct, TypeUnion,
    TypeWithInjection,
};
use std::rc::Rc;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct TypeId(pub CoreTypeId);

impl Debug for TypeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Type#{}", self.0)
    }
}

impl From<CoreTypeId> for TypeId {
    fn from(id: CoreTypeId) -> Self {
        Self(id)
    }
}

impl From<&CoreTypeId> for TypeId {
    fn from(id: &CoreTypeId) -> Self {
        Self(*id)
    }
}

impl From<TypeId> for CoreTypeId {
    fn from(id: TypeId) -> Self {
        id.0
    }
}

impl From<TypeId> for serde_json::Value {
    fn from(id: TypeId) -> Self {
        id.0.into()
    }
}

pub trait TypeData {
    fn get_display_params_into(&self, params: &mut Vec<String>);
    fn variant_name(&self) -> String;
    fn into_type(self, type_id: TypeId, base: Option<TypeBase>) -> Result<Type>;
}

pub trait WrapperTypeData {
    fn resolve(&self) -> Option<TypeId>;

    fn try_resolve(&self) -> Result<TypeId> {
        self.resolve()
            .ok_or_else(|| "cannot resolve wrapped type".into())
    }
}

#[derive(Debug)]
pub struct ConcreteType<T: TypeData> {
    pub id: TypeId,
    pub base: TypeBase,
    pub data: T,
}

impl<T: TypeData + Clone> ConcreteType<T> {
    pub fn rename(&self, new_name: String) -> Result<TypeId> {
        let mut base = self.base.clone();
        base.name = Some(new_name);
        Store::register_type(|id| self.data.clone().into_type(id, Some(base)).unwrap())
    }
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
            runtime_config: None,

            as_id: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TypeBoolean;

pub type Proxy = WrapperType<TypeProxy>;
pub type Struct = ConcreteType<TypeStruct>;
pub type Integer = ConcreteType<TypeInteger>;
pub type Float = ConcreteType<TypeFloat>;
pub type Func = ConcreteType<TypeFunc>;
pub type Boolean = ConcreteType<TypeBoolean>;
pub type StringT = ConcreteType<TypeString>;
pub type File = ConcreteType<TypeFile>;
pub type List = ConcreteType<TypeList>;
pub type Optional = ConcreteType<TypeOptional>;
pub type Union = ConcreteType<TypeUnion>;
pub type Either = ConcreteType<TypeEither>;

// Note: TypePolicy|TypeWithInjection|Proxy => Struct | Integer | ...
pub type WithPolicy = WrapperType<TypePolicy>;
pub type WithInjection = WrapperType<TypeWithInjection>;

#[derive(Debug, Clone)]
#[enum_dispatch(TypeFun, TypeConversion)]
pub enum Type {
    Proxy(Rc<Proxy>),
    Struct(Rc<Struct>),
    Integer(Rc<Integer>),
    Float(Rc<Float>),
    Func(Rc<Func>),
    Boolean(Rc<Boolean>),
    String(Rc<StringT>),
    File(Rc<File>),
    List(Rc<List>),
    Optional(Rc<Optional>),
    Union(Rc<Union>),
    Either(Rc<Either>),
    WithPolicy(Rc<WithPolicy>),
    WithInjection(Rc<WithInjection>),
}

impl Type {
    fn get_name(&self) -> Option<&str> {
        match self {
            Type::Proxy(inner) => Some(&inner.data.name),
            _ => self.get_base().and_then(|b| b.name.as_deref()),
        }
    }
}

#[enum_dispatch]
pub trait TypeFun {
    fn get_id(&self) -> TypeId;
    fn get_base(&self) -> Option<&TypeBase>;
    fn get_data(&self) -> &dyn TypeData;
    fn get_concrete_type(&self) -> Option<TypeId>;
    fn to_string(&self) -> String;

    fn get_concrete_type_name(&self) -> Result<String> {
        let concrete_type = self
            .get_concrete_type()
            .ok_or_else(|| "cannot find wrapped concrete type".to_string())?;
        concrete_type.as_type().map(|t| t.get_data().variant_name())
    }

    fn as_wrapper_type(&self) -> Option<&dyn WrapperTypeData> {
        None
    }

    fn is_concrete_type(&self) -> bool {
        self.as_wrapper_type().is_none()
    }
}

impl<T: TypeFun> TypeFun for Rc<T> {
    fn get_base(&self) -> Option<&TypeBase> {
        (**self).get_base()
    }

    fn get_concrete_type_name(&self) -> Result<String> {
        (**self).get_concrete_type_name()
    }

    fn to_string(&self) -> String {
        (**self).to_string()
    }

    fn get_id(&self) -> TypeId {
        (**self).get_id()
    }

    fn get_data(&self) -> &dyn TypeData {
        (**self).get_data()
    }

    fn get_concrete_type(&self) -> Option<TypeId> {
        (**self).get_concrete_type()
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
        self.data
            .resolve()
            .map(|id| id.as_type().unwrap().get_concrete_type().unwrap())
    }

    fn get_base(&self) -> Option<&TypeBase> {
        None
    }

    fn as_wrapper_type(&self) -> Option<&dyn WrapperTypeData> {
        Some(&self.data)
    }
}

pub enum ProxyResolution {
    None,
    Try,
    Force,
}

#[derive(Debug)]
pub struct TypeAttributes {
    pub concrete_type: TypeId,
    pub name: Option<String>,
    pub proxy_data: HashMap<String, String>,
    pub policy_chain: Vec<PolicySpec>,
    pub injection: Option<Injection>,
}

impl TypeId {
    pub fn non_optional_concrete_type(&self) -> Result<TypeId> {
        let concrete_type = self.concrete_type(ProxyResolution::Force)?.unwrap();

        Ok(match concrete_type.as_type()? {
            Type::Optional(inner) => inner.item().concrete_type(ProxyResolution::Force)?.unwrap(),
            _ => *self,
        })
    }

    pub fn concrete_type(&self, resolve_proxy: ProxyResolution) -> Result<Option<TypeId>> {
        let typ = self.as_type()?;
        if typ.is_concrete_type() {
            return Ok(Some(*self));
        }

        let wrapped_type = match typ {
            Type::Proxy(p) => match resolve_proxy {
                ProxyResolution::None => return Ok(None),
                ProxyResolution::Try => p.data.resolve(),
                ProxyResolution::Force => Some(p.data.try_resolve()?),
            },
            x => Some(x.as_wrapper_type().unwrap().resolve().unwrap()),
        };

        match wrapped_type {
            Some(wrapped_type) => wrapped_type.concrete_type(resolve_proxy),
            None => Ok(None),
        }
    }

    pub fn type_name(&self) -> Result<Option<String>> {
        self.as_type().map(|t| t.get_name().map(|s| s.to_string()))
    }

    pub fn repr(&self) -> Result<String> {
        self.as_type().map(|t| t.to_string())
    }

    pub fn resolve_proxy(&self) -> Result<TypeId> {
        match self.as_type()? {
            Type::Proxy(inner) => Store::get_type_by_name(&inner.data.name)
                .ok_or_else(|| errors::unregistered_type_name(&inner.data.name)),
            _ => Ok(*self),
        }
    }

    pub fn attrs(&self) -> Result<TypeAttributes> {
        let error_context = || match self.repr() {
            Ok(s) => format!("while getting attributes for type {}", s),
            Err(e) => format!("while getting attributes for type #{}: {}", self.0, e),
        };

        let mut type_id = *self;
        let mut proxy_data: HashMap<String, String> = HashMap::new();
        let mut policy_chain = Vec::new();
        let mut injection: Option<Injection> = None;
        let mut name = None;

        loop {
            let typ = type_id.as_type().with_context(error_context)?;
            match typ {
                Type::Proxy(p) => {
                    proxy_data.extend(p.data.extras.clone());
                    type_id = Store::get_type_by_name(&p.data.name)
                        .ok_or_else(|| errors::unregistered_type_name(&p.data.name))?;
                    continue;
                }

                Type::WithPolicy(inner) => {
                    policy_chain.extend(inner.data.chain.clone());
                    type_id = inner.data.tpe.into();
                    continue;
                }

                Type::WithInjection(inner) => {
                    if injection.is_some() {
                        return Err("multiple injections not supported".to_string().into());
                    }
                    injection = Some(
                        serde_json::from_str(&inner.data.injection).map_err(|e| e.to_string())?,
                    );
                    type_id = inner.data.tpe.into();
                    continue;
                }

                // exhaustively match all concrete type
                // so that this emits an error when a new type is added
                Type::Boolean(_)
                | Type::Integer(_)
                | Type::Float(_)
                | Type::String(_)
                | Type::File(_)
                | Type::Optional(_)
                | Type::List(_)
                | Type::Struct(_)
                | Type::Union(_)
                | Type::Either(_)
                | Type::Func(_) => {
                    break {
                        name = name.or_else(|| typ.get_name().map(|s| s.to_string()));
                        Ok(TypeAttributes {
                            concrete_type: type_id,
                            name,
                            proxy_data,
                            policy_chain,
                            injection,
                        })
                    }
                }
            }
        }
    }
}
