use std::hash::Hash;
use std::rc::Rc;

use super::Type;
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::types::{TypeDef, TypeDefExt as _, TypeId};
use crate::wit::metatype::typegraph::host::print;
pub use as_id::{AsId, IdKind};
use common::typegraph::Injection;
pub use injection::{InjectionTree, OverrideInjections, WithInjection};
pub use policy::{PolicySpec, WithPolicy};
pub use resolve_ref::ResolveRef;
use serde::{Deserialize, Serialize};

mod as_id;
mod injection;
mod policy;
mod resolve_ref;

#[derive(Clone, Debug)]
pub enum RefTarget {
    Direct(TypeDef),
    Indirect(String),
    Link(TypeRef),
}

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
pub struct TypeRef {
    pub id: TypeId,
    pub target: Box<RefTarget>,
    pub attribute: Option<Rc<RefAttr>>,
}

pub struct TypeRefBuilder {
    target: RefTarget,
    attribute: Option<RefAttr>,
}

pub enum FlatTypeRefTarget {
    Direct(TypeDef),
    Indirect(String),
}

pub struct FlatTypeRef {
    pub id: TypeId,
    pub target: FlatTypeRefTarget,
    pub attributes: RefAttrs,
}

impl TypeRef {
    pub fn flatten(&self) -> FlatTypeRef {
        match self.target.as_ref() {
            RefTarget::Direct(target) => FlatTypeRef {
                id: self.id,
                target: FlatTypeRefTarget::Direct(target.clone()),
                attributes: self.attribute.clone().into_iter().collect(),
            },
            RefTarget::Indirect(name) => FlatTypeRef {
                id: self.id,
                target: FlatTypeRefTarget::Indirect(name.clone()),
                attributes: self.attribute.clone().into_iter().collect(),
            },
            RefTarget::Link(target) => {
                let mut flat = target.flatten();
                flat.attributes.extend(self.attribute.clone());
                flat
            }
        }
    }
}

pub type RefAttrs = Vec<Rc<RefAttr>>;

impl RefAttr {
    pub fn with_target(self, target: Type) -> TypeRefBuilder {
        match target {
            Type::Def(type_def) => TypeRefBuilder {
                target: RefTarget::Direct(type_def),
                attribute: self.into(),
            },
            Type::Ref(type_ref) => {
                print(&format!("linking to ref: {:?}; {:?}", type_ref, self));
                TypeRefBuilder {
                    target: RefTarget::Link(type_ref),
                    attribute: self.into(),
                }
            }
        }
    }
}

impl RefTarget {
    pub fn with_attr(self, attr: Option<RefAttr>) -> TypeRefBuilder {
        TypeRefBuilder {
            target: self,
            attribute: attr,
        }
    }
}

impl TypeRefBuilder {
    pub fn with_id(self, id: TypeId) -> TypeRef {
        TypeRef {
            id,
            target: self.target.into(),
            attribute: self.attribute.map(Rc::new),
        }
    }

    pub fn build(self) -> Result<TypeRef> {
        Store::register_type_ref(self)
    }
}

impl TypeRef {
    pub fn new(target: Type, attribute: Option<RefAttr>) -> Result<TypeRef> {
        Store::register_type_ref(
            match target {
                Type::Def(type_def) => RefTarget::Direct(type_def),
                Type::Ref(type_ref) => RefTarget::Link(type_ref),
            }
            .with_attr(attribute),
        )
    }

    pub fn direct(target: TypeDef, attribute: Option<RefAttr>) -> Result<Self> {
        Store::register_type_ref(RefTarget::Direct(target).with_attr(attribute))
    }

    pub fn indirect(name: String, attribute: Option<RefAttr>) -> Result<Self> {
        Store::register_type_ref(RefTarget::Indirect(name).with_attr(attribute))
    }

    pub fn link(target: TypeRef, attribute: RefAttr) -> Result<Self> {
        Store::register_type_ref(RefTarget::Link(target).with_attr(Some(attribute)))
    }

    pub fn repr(&self) -> String {
        self.flatten().repr()
    }

    pub fn hash_type(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        self.flatten().hash_type(hasher, tg, runtime_id)
    }
}

impl FlatTypeRef {
    pub fn hash_type(
        &self,
        hasher: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        match &self.target {
            FlatTypeRefTarget::Direct(type_def) => {
                type_def.hash_type(hasher, tg, runtime_id)?;
            }
            FlatTypeRefTarget::Indirect(name) => {
                "named".hash(hasher);
                name.hash(hasher);
                runtime_id.hash(hasher);
            }
        }
        if !self.attributes.is_empty() {
            "ref".hash(hasher);
            for attr in self.attributes.iter().rev() {
                attr.as_ref().hash(hasher);
            }
        }
        Ok(())
    }

    fn repr(&self) -> String {
        let mut attrs = "".to_string();
        for attr in self.attributes.iter().rev() {
            attrs.push_str(&format!(", {}", attr.repr()));
        }
        match &self.target {
            FlatTypeRefTarget::Direct(type_def) => {
                format!("ref(#{}{attrs}) to {}", self.id.0, type_def.repr())
            }
            FlatTypeRefTarget::Indirect(name) => {
                format!("ref(#{} , target_name: '{}'{attrs})", self.id.0, name)
            }
        }
    }
}

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
