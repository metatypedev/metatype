// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{FunctionType, Arc, Weak};
use std::hash::{Hash, Hasher};

pub type Path = Vec<PathSegment>;

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum PathSegment {
    ObjectProp(Arc<str>),
    ListItem,
    OptionalItem,
    UnionVariant(u32),
    EitherVariant(u32),
}

/// A value type is a type that is not a namespace object, nor a function.
/// It can be an input type or an output type.
#[derive(Debug, Clone)]
pub struct ValueTypeKey {
    pub owner: Weak<FunctionType>,
    pub path: Path,
}

impl PartialEq for ValueTypeKey {
    fn eq(&self, other: &Self) -> bool {
        self.owner.upgrade().unwrap().base.type_idx == other.owner.upgrade().unwrap().base.type_idx
            && self.path == other.path
    }
}

impl Eq for ValueTypeKey {}

impl Hash for ValueTypeKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.owner.upgrade().unwrap().base.type_idx.hash(state);
        self.path.hash(state);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Key {
    Function(u32),
    NsObject(Vec<Arc<str>>),
    Input(ValueTypeKey),
    Output(ValueTypeKey),
}

impl Key {
    pub fn root() -> Self {
        Self::NsObject(vec![])
    }

    pub fn namespace(path: Vec<Arc<str>>) -> Self {
        Self::NsObject(path)
    }

    pub fn input(owner: Weak<FunctionType>, path: Path) -> Self {
        Self::Input(ValueTypeKey { owner, path })
    }

    pub fn output(owner: Weak<FunctionType>, path: Path) -> Self {
        Self::Output(ValueTypeKey { owner, path })
    }

    pub fn is_input(&self) -> bool {
        match self {
            Self::Input(_) => true,
            _ => false,
        }
    }

    pub fn is_output(&self) -> bool {
        match self {
            Self::Output(_) => true,
            _ => false,
        }
    }

    pub fn is_namespace(&self) -> bool {
        match self {
            Self::NsObject(_) => true,
            _ => false,
        }
    }
}

impl Key {
    pub(super) fn push(&self, segment: PathSegment) -> Self {
        match self {
            Self::NsObject(path) => {
                let mut path = path.clone();
                match segment {
                    PathSegment::ObjectProp(key) => {
                        path.push(key);
                        Self::NsObject(path)
                    }
                    _ => panic!("unexpected segment pushed on namespace {:?}", segment),
                }
            }
            Self::Input(k) => {
                let mut path = k.path.clone();
                path.push(segment);
                Self::Input(ValueTypeKey {
                    owner: k.owner.clone(),
                    path,
                })
            }
            Self::Output(k) => {
                let mut path = k.path.clone();
                path.push(segment);
                Self::Output(ValueTypeKey {
                    owner: k.owner.clone(),
                    path,
                })
            }
            Self::Function(_) => {
                // TODO error
                panic!("unexpected segment pushed on function {:?}", segment);
            }
        }
    }
}
