// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    conv::key::TypeKey,
    injection::InjectionNode,
    interlude::*,
    path::RelativePath,
    visitor::{Infallible, PathExt as _, VisitNext},
};
use enum_dispatch::enum_dispatch;

mod boolean;
mod file;
mod float;
mod function;
mod integer;
mod list;
mod object;
mod optional;
mod string;
mod union;

pub use boolean::*;
pub use file::*;
pub use float::*;
pub use function::*;
pub use integer::*;
pub use list::*;
pub use object::*;
pub use optional::*;
pub use string::*;
pub use union::*;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum EdgeKind {
    OptionalItem,
    ListItem,
    ObjectProperty(Arc<str>),
    UnionVariant(usize),
    EitherVariant(usize),
    FunctionInput,
    FunctionOutput,
}

pub struct Edge {
    pub from: WeakType,
    pub to: Type,
    pub kind: EdgeKind,
}

impl PartialEq for Edge {
    fn eq(&self, other: &Self) -> bool {
        let left = self.from.upgrade().expect("no strong pointer for type");
        let right = other.from.upgrade().expect("no strong pointer for type");
        left.key() == right.key() && self.to.key() == other.to.key() && self.kind == other.kind
    }
}

impl Eq for Edge {}

impl std::hash::Hash for Edge {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.from
            .upgrade()
            .expect("no strong pointer for type")
            .key()
            .hash(state);
        self.to.key().hash(state);
        self.kind.hash(state);
    }
}

#[derive(Debug)]
pub struct TypeBase {
    pub parent: WeakType,
    pub key: TypeKey,
    pub title: String,
    pub name: Once<Arc<str>>,
    pub description: Option<String>,
    pub injection: Option<Arc<InjectionNode>>, // why here??
}

impl TypeBase {
    pub fn new(
        schema: &tg_schema::TypeNodeBase,
        parent: WeakType,
        key: TypeKey,
        injection: Option<Arc<InjectionNode>>,
    ) -> Self {
        Self {
            parent,
            key,
            title: schema.title.clone(),
            name: Default::default(),
            description: schema.description.clone(),
            injection,
        }
    }
}

#[derive(Debug, Clone)]
#[enum_dispatch]
pub enum Type {
    Boolean(Arc<BooleanType>),
    Integer(Arc<IntegerType>),
    Float(Arc<FloatType>),
    String(Arc<StringType>),
    File(Arc<FileType>),
    Optional(Arc<OptionalType>),
    List(Arc<ListType>),
    Object(Arc<ObjectType>),
    Union(Arc<UnionType>),
    Function(Arc<FunctionType>),
}

#[enum_dispatch(Type)]
pub trait TypeNode {
    fn base(&self) -> &TypeBase;
    fn tag(&self) -> &'static str;

    fn children(&self) -> Vec<Type> {
        vec![]
    }
    fn edges(&self) -> Vec<Edge> {
        vec![]
    }
}

pub trait TypeNodeExt: TypeNode {
    fn idx(&self) -> u32;
    fn name(&self) -> Arc<str>;
    fn parent(&self) -> Option<Type>;
    fn title(&self) -> &str;
    fn key(&self) -> TypeKey;
    fn injection(&self) -> Option<Arc<InjectionNode>>;
    fn is_descendant_of(&self, other: &Type) -> bool;
}

impl<N> TypeNodeExt for N
where
    N: TypeNode,
{
    fn idx(&self) -> u32 {
        self.base().key.0
    }

    fn name(&self) -> Arc<str> {
        self.base()
            .name
            .get()
            .cloned()
            .expect("name not initialized on type")
    }

    fn parent(&self) -> Option<Type> {
        self.base().parent.upgrade()
    }

    fn title(&self) -> &str {
        self.base().title.as_ref()
    }

    fn key(&self) -> TypeKey {
        self.base().key
    }

    fn injection(&self) -> Option<Arc<InjectionNode>> {
        self.base().injection.clone()
    }

    fn is_descendant_of(&self, other: &Type) -> bool {
        let key = self.key();
        crate::visitor::traverse_types(other.clone(), false, |node, acc| -> Result<_, Infallible> {
            Ok(if node.path.is_cyclic() {
                VisitNext::Stop
            } else if node.ty.key() == key {
                *acc = true;
                VisitNext::Stop
            } else {
                VisitNext::Children
            })
        })
        .unwrap()
    }
}

#[derive(Debug, Clone)]
pub enum WeakType {
    Boolean(Weak<BooleanType>),
    Integer(Weak<IntegerType>),
    Float(Weak<FloatType>),
    String(Weak<StringType>),
    File(Weak<FileType>),
    Optional(Weak<OptionalType>),
    List(Weak<ListType>),
    Object(Weak<ObjectType>),
    Union(Weak<UnionType>),
    Function(Weak<FunctionType>),
}

impl Type {
    pub fn downgrade(&self) -> WeakType {
        match self {
            Type::Boolean(t) => WeakType::Boolean(Arc::downgrade(t)),
            Type::Integer(t) => WeakType::Integer(Arc::downgrade(t)),
            Type::Float(t) => WeakType::Float(Arc::downgrade(t)),
            Type::String(t) => WeakType::String(Arc::downgrade(t)),
            Type::File(t) => WeakType::File(Arc::downgrade(t)),
            Type::Optional(t) => WeakType::Optional(Arc::downgrade(t)),
            Type::List(t) => WeakType::List(Arc::downgrade(t)),
            Type::Object(t) => WeakType::Object(Arc::downgrade(t)),
            Type::Union(t) => WeakType::Union(Arc::downgrade(t)),
            Type::Function(t) => WeakType::Function(Arc::downgrade(t)),
        }
    }

    pub fn is_composite(&self) -> bool {
        match self {
            Type::Boolean(_)
            | Type::Integer(_)
            | Type::Float(_)
            | Type::String(_)
            | Type::File(_) => false,
            Type::Object(_) => true,
            Type::Optional(t) => t.item().is_composite(),
            Type::List(t) => t.item().is_composite(),
            Type::Union(t) => t.variants().iter().any(|v| v.is_composite()),
            // ??
            Type::Function(t) => t.output().is_composite(),
        }
    }
}

impl Type {
    pub fn as_object(&self) -> Option<&Arc<ObjectType>> {
        match self {
            Type::Object(t) => Some(t),
            _ => None,
        }
    }

    pub fn assert_object(&self) -> Result<&Arc<ObjectType>> {
        Ok(self
            .as_object()
            .ok_or_else(|| eyre!("expected object type, got {}", self.tag()))
            .unwrap())
    }

    pub fn as_func(&self) -> Option<&Arc<FunctionType>> {
        match self {
            Type::Function(w) => Some(w),
            _ => None,
        }
    }

    pub fn assert_func(&self) -> Result<&Arc<FunctionType>> {
        self.as_func()
            .ok_or_else(|| eyre!("expected function type, got {}", self.tag()))
    }
}

impl WeakType {
    pub fn upgrade(&self) -> Option<Type> {
        match self {
            WeakType::Boolean(w) => w.upgrade().map(Type::Boolean),
            WeakType::Integer(w) => w.upgrade().map(Type::Integer),
            WeakType::Float(w) => w.upgrade().map(Type::Float),
            WeakType::String(w) => w.upgrade().map(Type::String),
            WeakType::File(w) => w.upgrade().map(Type::File),
            WeakType::Optional(w) => w.upgrade().map(Type::Optional),
            WeakType::List(w) => w.upgrade().map(Type::List),
            WeakType::Object(w) => w.upgrade().map(Type::Object),
            WeakType::Union(w) => w.upgrade().map(Type::Union),
            WeakType::Function(w) => w.upgrade().map(Type::Function),
        }
    }
}

impl WeakType {
    pub fn as_func(&self) -> Option<&Weak<FunctionType>> {
        match self {
            WeakType::Function(w) => Some(w),
            _ => None,
        }
    }
}

pub trait Wrap {
    fn wrap(self) -> Type;
}

macro_rules! impl_wrap {
    ($ty:ident) => {
        paste::paste! {
            impl Wrap for Arc<[<$ty Type>]> {
                fn wrap(self) -> Type {
                    Type::$ty(self)
                }
            }

            impl Wrap for &Arc<[<$ty Type>]> {
                fn wrap(self) -> Type {
                    Type::$ty(Arc::clone(self))
                }
            }
        }
    };
}

impl_wrap!(Boolean);
impl_wrap!(Integer);
impl_wrap!(Float);
impl_wrap!(String);
impl_wrap!(File);
impl_wrap!(Optional);
impl_wrap!(List);
impl_wrap!(Object);
impl_wrap!(Union);
impl_wrap!(Function);
