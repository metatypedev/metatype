// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Lrc, Weak};

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

pub enum EdgeKind {
    OptionalItem,
    ListItem,
    ObjectProperty(Lrc<str>),
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

pub trait TypeNode {
    fn base(&self) -> &TypeBase;

    fn children(&self) -> Vec<Type> {
        vec![]
    }
    fn edges(self: &Lrc<Self>) -> Vec<Edge> {
        vec![]
    }

    fn parent(&self) -> Option<Type> {
        self.base().parent.upgrade()
    }

    fn title(&self) -> &str {
        &self.base().title
    }
}

#[derive(Debug)]
pub struct TypeBase {
    pub parent: WeakType,
    pub type_idx: u32,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone)]
pub enum Type {
    Boolean(Lrc<BooleanType>),
    Integer(Lrc<IntegerType>),
    Float(Lrc<FloatType>),
    String(Lrc<StringType>),
    File(Lrc<FileType>),
    Optional(Lrc<OptionalType>),
    List(Lrc<ListType>),
    Object(Lrc<ObjectType>),
    Union(Lrc<UnionType>),
    Either(Lrc<EitherType>),
    Function(Lrc<FunctionType>),
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
    Either(Weak<EitherType>),
    Function(Weak<FunctionType>),
}

impl Type {
    pub fn downgrade(&self) -> WeakType {
        match self {
            Type::Boolean(t) => WeakType::Boolean(Lrc::downgrade(t)),
            Type::Integer(t) => WeakType::Integer(Lrc::downgrade(t)),
            Type::Float(t) => WeakType::Float(Lrc::downgrade(t)),
            Type::String(t) => WeakType::String(Lrc::downgrade(t)),
            Type::File(t) => WeakType::File(Lrc::downgrade(t)),
            Type::Optional(t) => WeakType::Optional(Lrc::downgrade(t)),
            Type::List(t) => WeakType::List(Lrc::downgrade(t)),
            Type::Object(t) => WeakType::Object(Lrc::downgrade(t)),
            Type::Union(t) => WeakType::Union(Lrc::downgrade(t)),
            Type::Either(t) => WeakType::Either(Lrc::downgrade(t)),
            Type::Function(t) => WeakType::Function(Lrc::downgrade(t)),
        }
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
            WeakType::Either(w) => w.upgrade().map(Type::Either),
            WeakType::Function(w) => w.upgrade().map(Type::Function),
        }
    }
}
