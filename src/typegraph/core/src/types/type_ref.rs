use std::hash::Hash;
use std::rc::Rc;

use super::Type;
use crate::errors::Result;
use crate::global_store::Store;
use crate::types::{TypeDef, TypeDefExt as _, TypeId};
use common::typegraph::Injection;
use serde::{Deserialize, Serialize};

pub use as_id::{AsId, IdKind};
pub use injection::{InjectionTree, OverrideInjections, WithInjection};
pub use policy::{PolicySpec, WithPolicy};
pub use runtime_config::WithRuntimeConfig;
pub use xdef::{AsTypeDefEx, ExtendedTypeDef};

mod as_id;
mod injection;
mod policy;
mod runtime_config;
mod xdef;

type JsonValue = serde_json::Value;

#[derive(Debug, Hash, Serialize, Deserialize)]
#[serde(tag = "key", content = "value")]
pub enum RefAttr {
    AsId(IdKind),
    Injection(Injection),
    Reduce(InjectionTree),
    Policy(Vec<PolicySpec>),
    RuntimeConfig { runtime: String, data: JsonValue },
}

impl RefAttr {
    pub fn as_id(id: IdKind) -> Self {
        RefAttr::AsId(id)
    }

    pub fn injection(injection: Injection) -> Self {
        RefAttr::Injection(injection)
    }

    pub fn runtime(runtime: impl Into<String>, data: JsonValue) -> Self {
        RefAttr::RuntimeConfig {
            runtime: runtime.into(),
            data,
        }
    }
}

#[derive(Clone, Debug)]
pub struct DirectTypeRef {
    pub id: TypeId,
    pub target: TypeDef,
    pub attribute: Rc<RefAttr>,
}

#[derive(Clone, Debug)]
pub struct LinkTypeRef {
    pub id: TypeId,
    pub target: Box<TypeRef>,
    pub attribute: Rc<RefAttr>,
}

#[derive(Clone, Debug)]
pub struct IndirectTypeRef {
    pub id: TypeId,
    pub name: Rc<str>,
    pub attributes: Vec<Rc<RefAttr>>,
}

#[derive(Clone, Debug)]
pub struct NamedTypeRef {
    pub id: TypeId,
    pub name: Rc<str>,
    pub target: Box<Type>,
}

#[derive(Clone, Debug)]
pub enum TypeRef {
    Direct(DirectTypeRef),
    Link(LinkTypeRef),
    Indirect(IndirectTypeRef),
    Named(NamedTypeRef),
}

#[derive(Clone)]
pub struct DirectRefBuilder {
    target: TypeDef,
    attribute: Rc<RefAttr>,
}

#[derive(Clone)]
pub struct LinkRefBuilder {
    target: TypeRef,
    attribute: Rc<RefAttr>,
}

#[derive(Clone)]
pub struct IndirectRefBuilder {
    name: String,
    attributes: Vec<Rc<RefAttr>>,
}

#[derive(Clone)]
pub struct NamedRefBuilder {
    pub name: Rc<str>,
    target: Type,
}

pub enum FlatTypeRefTarget {
    Direct(TypeDef),
    Indirect(String),
}

pub struct FlatTypeRef {
    pub id: TypeId,
    pub target: FlatTypeRefTarget,
    pub attributes: RefAttrs,
    pub name: Option<Rc<str>>,
}

impl TypeRef {
    pub fn id(&self) -> TypeId {
        match &self {
            TypeRef::Direct(direct) => direct.id,
            TypeRef::Indirect(indirect) => indirect.id,
            TypeRef::Link(link) => link.id,
            TypeRef::Named(named) => named.id,
        }
    }
    pub fn flatten(&self) -> FlatTypeRef {
        match &self {
            TypeRef::Direct(direct) => FlatTypeRef {
                id: direct.id,
                target: FlatTypeRefTarget::Direct(direct.target.clone()),
                attributes: vec![direct.attribute.clone()],
                name: None,
            },
            TypeRef::Indirect(indirect) => FlatTypeRef {
                id: indirect.id,
                target: FlatTypeRefTarget::Indirect(indirect.name.to_string()),
                attributes: indirect.attributes.clone(),
                name: Some(indirect.name.clone()),
            },
            TypeRef::Link(link) => {
                let mut flat = link.target.flatten();
                flat.attributes.push(link.attribute.clone());
                flat.id = link.id;
                flat
            }
            TypeRef::Named(named) => match named.target.as_ref() {
                Type::Def(type_def) => FlatTypeRef {
                    id: named.id,
                    target: FlatTypeRefTarget::Direct(type_def.clone()),
                    attributes: vec![],
                    name: Some(named.name.clone()),
                },
                Type::Ref(type_ref) => {
                    let mut flat = type_ref.flatten();
                    flat.name = Some(named.name.clone());
                    flat.id = named.id;
                    flat
                }
            },
        }
    }
}

#[derive(Clone)]
pub enum TypeRefBuilder {
    Direct(DirectRefBuilder),
    Link(LinkRefBuilder),
    Indirect(IndirectRefBuilder),
    Named(NamedRefBuilder),
}

impl TypeRef {
    pub fn from_type(target: Type, attribute: RefAttr) -> TypeRefBuilder {
        match target {
            Type::Def(def) => TypeRef::direct(def, attribute),
            Type::Ref(r) => TypeRef::link(r, attribute),
        }
    }
    pub fn direct(target: TypeDef, attribute: RefAttr) -> TypeRefBuilder {
        TypeRefBuilder::Direct(DirectRefBuilder {
            target,
            attribute: Rc::new(attribute),
        })
    }
    pub fn link(target: TypeRef, attribute: RefAttr) -> TypeRefBuilder {
        TypeRefBuilder::Link(LinkRefBuilder {
            target,
            attribute: Rc::new(attribute),
        })
    }
    pub fn indirect(
        name: impl Into<String>,
        attributes: impl IntoIterator<Item = RefAttr>,
    ) -> TypeRefBuilder {
        TypeRefBuilder::Indirect(IndirectRefBuilder {
            name: name.into(),
            attributes: attributes.into_iter().map(Rc::new).collect(),
        })
    }
    pub fn named(name: impl Into<String>, target: Type) -> TypeRefBuilder {
        let name: String = name.into();
        TypeRefBuilder::Named(NamedRefBuilder {
            name: name.into(),
            target,
        })
    }
}

impl TypeRefBuilder {
    pub fn with_id(self, id: TypeId) -> TypeRef {
        match self {
            TypeRefBuilder::Direct(builder) => TypeRef::Direct(DirectTypeRef {
                id,
                target: builder.target,
                attribute: builder.attribute,
            }),
            TypeRefBuilder::Link(builder) => TypeRef::Link(LinkTypeRef {
                id,
                target: Box::new(builder.target),
                attribute: builder.attribute,
            }),
            TypeRefBuilder::Indirect(builder) => TypeRef::Indirect(IndirectTypeRef {
                id,
                name: builder.name.into(),
                attributes: builder.attributes,
            }),
            TypeRefBuilder::Named(builder) => TypeRef::Named(NamedTypeRef {
                id,
                name: builder.name,
                target: Box::new(builder.target),
            }),
        }
    }

    pub fn register(self) -> Result<TypeRef> {
        Store::register_type_ref(self)
    }
}

pub type RefAttrs = Vec<Rc<RefAttr>>;

impl TypeRef {
    pub fn repr(&self) -> String {
        self.flatten().repr()
    }

    // pub fn hash_type(
    //     &self,
    //     hasher: &mut crate::conversion::hash::Hasher,
    //     tg: &mut TypegraphContext,
    // ) -> Result<()> {
    //     self.flatten().hash_type(hasher, tg)
    // }
}

impl FlatTypeRef {
    // pub fn hash_type(
    //     &self,
    //     hasher: &mut crate::conversion::hash::Hasher,
    //     tg: &mut crate::typegraph::TypegraphContext,
    // ) -> Result<()> {
    //     if let Some(name) = self.name.as_deref() {
    //         "named".hash(hasher);
    //         name.hash(hasher);
    //         return Ok(());
    //     }
    //     match &self.target {
    //         FlatTypeRefTarget::Direct(type_def) => {
    //             type_def.hash_type(hasher, tg)?;
    //         }
    //         FlatTypeRefTarget::Indirect(_) => {
    //             unreachable!()
    //         }
    //     }
    //     // TODO do not hash attributes as they are not part of the type
    //     if !self.attributes.is_empty() {
    //         "attributes".hash(hasher);
    //         for attr in self.attributes.iter().rev() {
    //             attr.as_ref().hash(hasher);
    //         }
    //     }
    //     Ok(())
    // }

    fn repr(&self) -> String {
        let mut attrs = "".to_string();
        for attr in self.attributes.iter().rev() {
            attrs.push_str(&format!(", {}", attr.repr()));
        }
        let name = if let Some(name) = self.name.as_deref() {
            format!("&{}", name)
        } else {
            "".to_string()
        };
        match &self.target {
            FlatTypeRefTarget::Direct(type_def) => {
                format!("ref(#{}{name}{attrs}) to {}", self.id.0, type_def.repr())
            }
            FlatTypeRefTarget::Indirect(_) => {
                format!("ref(#{}{name}(indirect){attrs})", self.id.0)
            }
        }
    }
}

// pub trait AsFlatTypeRef {
//     fn as_flat_ref(&self) -> FlatTypeRef;
// }
//
// impl AsFlatTypeRef for Type {
//     fn as_flat_ref(&self) -> FlatTypeRef {
//         match self {
//             Type::Def(def) => FlatTypeRef {
//                 id: def.id(),
//                 target: FlatTypeRefTarget::Direct(def.clone()),
//                 attributes: vec![],
//                 name: None,
//             },
//             Type::Ref(r) => r.flatten(),
//         }
//     }
// }

impl RefAttr {
    fn repr(&self) -> String {
        match self {
            RefAttr::AsId(id) => format!(
                "as_id: {:?}",
                match id {
                    IdKind::Simple => "1",
                    IdKind::Composite => "n",
                }
            ),
            RefAttr::Injection(injection) => {
                format!("injection: {}", serde_json::to_string(&injection).unwrap())
            }
            RefAttr::Policy(policy) => {
                format!("policy: {}", serde_json::to_string(&policy).unwrap())
            }
            RefAttr::RuntimeConfig { runtime, data } => {
                format!("rt/{}: {}", runtime, serde_json::to_string(data).unwrap())
            }
            RefAttr::Reduce(tree) => {
                format!("reduce: {}", serde_json::to_string(tree).unwrap())
            }
        }
    }
}

pub trait FindAttribute {
    fn find_attr<'s, A: Sized + 's>(&'s self, pred: impl Fn(&'s RefAttr) -> Option<A>)
        -> Option<A>;
    #[allow(dead_code)]
    fn find_attrs<'s, A: Sized + 's>(&'s self, pred: impl Fn(&'s RefAttr) -> Option<A>) -> Vec<A>;

    fn find_id_kind(&self) -> Option<IdKind> {
        self.find_attr(|attr| match attr {
            RefAttr::AsId(id) => Some(*id),
            _ => None,
        })
    }

    fn find_injection(&self) -> Option<&Injection> {
        self.find_attr(|attr| match attr {
            RefAttr::Injection(injection) => Some(injection),
            _ => None,
        })
    }

    fn find_runtime_attr(&self, runtime_key: &str) -> Option<&JsonValue> {
        self.find_attr(|attr| match attr {
            RefAttr::RuntimeConfig { runtime, data } if runtime == runtime_key => Some(data),
            _ => None,
        })
    }

    #[allow(dead_code)]
    fn find_runtime_attrs(&self, runtime_key: &str) -> Vec<&JsonValue> {
        self.find_attrs(|attr| match attr {
            RefAttr::RuntimeConfig { runtime, data } if runtime == runtime_key => Some(data),
            _ => None,
        })
    }

    fn find_policy(&self) -> Option<&[PolicySpec]> {
        self.find_attr(|attr| match attr {
            RefAttr::Policy(policy) => Some(policy.as_slice()),
            _ => None,
        })
    }

    fn find_reduce_trees(&self) -> Vec<&InjectionTree> {
        self.find_attrs(|attr| match attr {
            RefAttr::Reduce(tree) => Some(tree),
            _ => None,
        })
    }
}

impl FindAttribute for RefAttrs {
    fn find_attr<'s, A: Sized + 's>(
        &'s self,
        pred: impl Fn(&'s RefAttr) -> Option<A>,
    ) -> Option<A> {
        self.iter().rev().find_map(|attr| pred(attr.as_ref()))
    }

    fn find_attrs<'s, A: Sized + 's>(&'s self, pred: impl Fn(&'s RefAttr) -> Option<A>) -> Vec<A> {
        self.iter()
            .rev()
            .filter_map(|attr| pred(attr.as_ref()))
            .collect()
    }
}

pub trait Named {
    fn named(self, name: impl Into<String>) -> Result<TypeRef>;
}

impl<T> Named for T
where
    T: TryInto<Type>,
    crate::errors::TgError: From<<T as TryInto<Type>>::Error>,
{
    fn named(self, name: impl Into<String>) -> Result<TypeRef> {
        TypeRef::named(name, self.try_into()?).register()
    }
}

// impl TypeRef {
//     pub fn extract_name(self) -> Option<(Type, String)> {
//         match self.target.as_ref() {
//             RefTarget::Indirect(name) => {
//                 Store::get_type_by_name(&name).map(|t| (Type::Ref(t), name.clone()))
//             }
//             RefTarget::Direct(def) => match self.attribute.as_deref() {
//                 Some(RefAttr::Name(name)) => Some((Type::Def(def.clone()), name.clone())),
//                 _ => None,
//             },
//             RefTarget::Link(link) => match self.attribute.as_deref() {
//                 Some(RefAttr::Name(name)) => Some((Type::Ref(link.clone()), name.clone())),
//                 _ => None,
//             },
//         }
//     }
// }

// impl Type {
//     pub fn extract_name(self) -> Option<(Type, String)> {
//         match self {
//             Type::Def(_) => None,
//             Type::Ref(r) => r.extract_name(),
//         }
//     }
// }
