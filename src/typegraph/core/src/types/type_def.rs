// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::rc::Rc;

use super::{AsTypeDefEx as _, TypeId};
use crate::conversion::hash::{Hashable, Hasher};
use crate::conversion::types::TypeConversion;
use crate::errors::Result;
use crate::global_store::Store;
use crate::sdk::core::{
    TypeEither, TypeFile, TypeFloat, TypeFunc, TypeInteger, TypeList, TypeOptional, TypeString,
    TypeStruct, TypeUnion,
};
use crate::typegraph::TypegraphContext;
use crate::types::ExtendedTypeDef;
use common::typegraph::TypeNode;
use enum_dispatch::enum_dispatch;
use std::hash::Hash as _;

pub trait TypeDefData: Hashable {
    fn get_display_params_into(&self, params: &mut Vec<String>);
    fn variant_name(&self) -> &'static str;
    // fn into_type(self, type_id: TypeId, base: Option<TypeBase>) -> Result<Type>;
}

#[derive(Debug)]
pub struct NonRefType<T: TypeDefData> {
    pub id: TypeId,
    pub data: T,
}

impl<T: TypeDefData> NonRefType<T>
where
    Rc<NonRefType<T>>: Into<TypeDef>,
{
    pub fn type_with_data(&self, data: T) -> Result<TypeId> {
        Store::register_type_def(|type_id| Rc::new(Self { id: type_id, data }).into())
    }
}

#[derive(Debug, Clone, Hash)]
pub struct TypeBoolean;

pub type Struct = NonRefType<TypeStruct>;
pub type Integer = NonRefType<TypeInteger>;
pub type Float = NonRefType<TypeFloat>;
pub type Func = NonRefType<TypeFunc>;
pub type Boolean = NonRefType<TypeBoolean>;
pub type StringT = NonRefType<TypeString>;
pub type File = NonRefType<TypeFile>;
pub type List = NonRefType<TypeList>;
pub type Optional = NonRefType<TypeOptional>;
pub type Union = NonRefType<TypeUnion>;
pub type Either = NonRefType<TypeEither>;

#[derive(Debug, Clone)]
#[enum_dispatch(TypeDefExt, TypeConversion)]
pub enum TypeDef {
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
}

impl TypeDef {
    pub fn resolve_quantifier(&self) -> Result<TypeDef> {
        match self {
            TypeDef::List(inner) => Ok(TypeId(inner.data.of).as_xdef()?.type_def),
            TypeDef::Optional(inner) => Ok(TypeId(inner.data.of).as_xdef()?.type_def),
            _ => Ok(self.clone()),
        }
    }
}

#[enum_dispatch]
pub trait TypeDefExt {
    fn id(&self) -> TypeId;
    fn data(&self) -> &dyn TypeDefData;
    fn hash_type(&self, hasher: &mut Hasher, tg: &mut TypegraphContext) -> Result<()>;
    // fn to_string(&self) -> String;

    fn variant_name(&self) -> &'static str;

    // fn with_name(&self, name: Option<String>) -> TypeDef {
    //     let mut base = self.base().clone();
    //     base.name = name;
    //     self.with_base(self.id(), base)
    // }

    fn repr(&self) -> String;
}

impl<T: TypeDefExt> TypeDefExt for Rc<T> {
    fn id(&self) -> TypeId {
        (**self).id()
    }

    fn data(&self) -> &dyn TypeDefData {
        (**self).data()
    }

    fn hash_type(&self, hasher: &mut Hasher, tg: &mut TypegraphContext) -> Result<()> {
        (**self).hash_type(hasher, tg)
    }

    fn variant_name(&self) -> &'static str {
        (**self).variant_name()
    }

    fn repr(&self) -> String {
        (**self).repr()
    }
}

impl<T> TypeDefExt for NonRefType<T>
where
    T: TypeDefData + Clone,
    Rc<NonRefType<T>>: Into<TypeDef>,
{
    fn id(&self) -> TypeId {
        self.id
    }

    fn data(&self) -> &dyn TypeDefData {
        &self.data
    }

    fn variant_name(&self) -> &'static str {
        self.data().variant_name()
    }

    fn repr(&self) -> String {
        // TODO add base
        let mut params = vec![];
        params.push(format!("#{}", self.id.0));
        self.data.get_display_params_into(&mut params);
        format!("{}({})", self.data.variant_name(), params.join(", "))
    }

    fn hash_type(&self, hasher: &mut Hasher, tg: &mut TypegraphContext) -> Result<()> {
        "unnamed".hash(hasher);
        self.data.hash(hasher, tg)?;
        Ok(())
    }
}

impl TypeDef {
    pub fn as_struct(&self) -> Result<Rc<Struct>> {
        match self {
            TypeDef::Struct(s) => Ok(s.clone()),
            _ => Err(crate::errors::invalid_type("struct", &self.repr())),
        }
    }
}

// impl Hashable for TypeBase {
//     fn hash(&self, hasher: &mut Hasher, _tg: &mut TypegraphContext) -> Result<()> {
//         // self.name.hash(hasher);  // see TypeDefExt::hash_type
//         self.runtime_config.hash(hasher);
//
//         Ok(())
//     }
// }
