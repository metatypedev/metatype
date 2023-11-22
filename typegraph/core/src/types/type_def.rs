// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::rc::Rc;

use crate::conversion::types::TypeConversion;
use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::wit::core::{
    PolicySpec, TypeBase, TypeEither, TypeFile, TypeFloat, TypeFunc, TypeInteger, TypeList,
    TypeOptional, TypeString, TypeStruct, TypeUnion,
};
use common::typegraph::{Injection, TypeNode};
use enum_dispatch::enum_dispatch;

use super::TypeId;

#[derive(Default, Debug, Clone)]
pub struct ExtendedTypeBase {
    pub injection: Option<Box<Injection>>,
    pub policies: Vec<PolicySpec>,
}

impl ExtendedTypeBase {
    pub fn is_empty(&self) -> bool {
        self.injection.is_none() && self.policies.is_empty()
    }
}

pub trait TypeDefData {
    fn get_display_params_into(&self, params: &mut Vec<String>);
    fn variant_name(&self) -> &'static str;
    // fn into_type(self, type_id: TypeId, base: Option<TypeBase>) -> Result<Type>;
}

#[derive(Debug)]
pub struct NonRefType<T: TypeDefData> {
    pub id: TypeId,
    pub base: TypeBase,
    pub extended_base: ExtendedTypeBase,
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
            TypeDef::List(inner) => Ok(TypeId(inner.data.of).resolve_ref()?.1),
            TypeDef::Optional(inner) => Ok(TypeId(inner.data.of).resolve_ref()?.1),
            _ => Ok(self.clone()),
        }
    }
}

#[enum_dispatch]
pub trait TypeDefExt {
    fn id(&self) -> TypeId;
    fn base(&self) -> &TypeBase;
    fn x_base(&self) -> &ExtendedTypeBase;
    fn data(&self) -> &dyn TypeDefData;
    // fn to_string(&self) -> String;

    fn name(&self) -> Option<&str> {
        self.base().name.as_deref()
    }

    fn variant_name(&self) -> &'static str;

    fn with_base(&self, id: TypeId, base: TypeBase) -> TypeDef;
    fn with_x_base(&self, id: TypeId, base: ExtendedTypeBase) -> TypeDef;

    fn repr(&self) -> String;
}

impl<T: TypeDefExt> TypeDefExt for Rc<T> {
    fn id(&self) -> TypeId {
        (**self).id()
    }

    fn base(&self) -> &TypeBase {
        (**self).base()
    }

    fn x_base(&self) -> &ExtendedTypeBase {
        (**self).x_base()
    }

    fn data(&self) -> &dyn TypeDefData {
        (**self).data()
    }

    fn variant_name(&self) -> &'static str {
        (**self).variant_name()
    }

    fn with_base(&self, id: TypeId, base: TypeBase) -> TypeDef {
        (**self).with_base(id, base)
    }

    fn with_x_base(&self, id: TypeId, base: ExtendedTypeBase) -> TypeDef {
        (**self).with_x_base(id, base)
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

    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn x_base(&self) -> &ExtendedTypeBase {
        &self.extended_base
    }

    fn with_base(&self, id: TypeId, base: TypeBase) -> TypeDef {
        Rc::new(Self {
            id,
            base,
            extended_base: self.extended_base.clone(),
            data: self.data.clone(),
        })
        .into()
    }

    fn with_x_base(&self, id: TypeId, base: ExtendedTypeBase) -> TypeDef {
        Rc::new(Self {
            id,
            base: self.base.clone(),
            extended_base: base,
            data: self.data.clone(),
        })
        .into()
    }

    fn variant_name(&self) -> &'static str {
        self.data().variant_name()
    }

    fn repr(&self) -> String {
        // TODO add base and x_base
        let mut params = vec![];
        params.push(format!("#{}", self.id.0));
        self.data.get_display_params_into(&mut params);
        format!("{}({})", self.data.variant_name(), params.join(", "))
    }
}
