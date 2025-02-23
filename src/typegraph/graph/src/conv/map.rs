// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{Arc, FunctionType, Type, TypeNodeExt as _, Weak, Wrap as _};
use std::collections::{BTreeMap, HashMap};
use std::hash::{Hash, Hasher};

pub type Path = Vec<PathSegment>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeKey(pub u32, pub u32); // Type idx and an ordinal number

#[derive(Debug, Clone)]
pub struct MapEntry {
    /// paths relative to the nearest ascendant function
    pub relative_paths: Vec<RelativePath>,
    pub node: Type,
}

#[derive(Debug, Default)]
pub struct ConversionMap {
    pub direct: BTreeMap<TypeKey, MapEntry>,
    pub reverse: HashMap<RelativePath, TypeKey>,
}

impl ConversionMap {
    pub fn register(&mut self, rpath: RelativePath, node: Type) {
        let key = node.key();
        let old = self.direct.insert(
            key,
            MapEntry {
                relative_paths: vec![rpath.clone()],
                node,
            },
        );
        if old.is_some() {
            panic!("duplicate type key: {:?}", key);
        }
        let old = self.reverse.insert(rpath.clone(), key);
        if old.is_some() {
            panic!("duplicate relative path: {:?}", rpath);
        }
    }

    pub fn append(&mut self, key: TypeKey, rpath: RelativePath) {
        let entry = self.direct.get_mut(&key).unwrap();
        entry.relative_paths.push(rpath.clone());
        self.reverse.insert(rpath, key);
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum PathSegment {
    ObjectProp(Arc<str>),
    ListItem,
    OptionalItem,
    UnionVariant(u32),
}

impl PathSegment {
    pub fn apply(&self, ty: &Type) -> Option<Type> {
        match self {
            PathSegment::ObjectProp(key) => match ty {
                Type::Object(obj) => {
                    let prop = obj.properties().get(key)?;
                    Some(prop.type_.clone())
                }
                _ => None,
            },
            PathSegment::ListItem => match ty {
                Type::List(list) => Some(list.item().unwrap().clone()),
                _ => None,
            },
            PathSegment::OptionalItem => match ty {
                Type::Optional(opt) => Some(opt.item().clone()),
                _ => None,
            },
            PathSegment::UnionVariant(idx) => match ty {
                Type::Union(union) => Some(union.variants().get(*idx as usize)?.clone()),
                _ => None,
            },
        }
    }

    pub fn apply_on_schema_node(
        &self,
        nodes: &[tg_schema::TypeNode],
        type_idx: u32,
    ) -> Option<u32> {
        use tg_schema::TypeNode as N;
        let node = &nodes[type_idx as usize];
        match self {
            PathSegment::ObjectProp(key) => match node {
                N::Object { data, .. } => data.properties.get(key.as_ref()).copied(),
                _ => None,
            },
            PathSegment::ListItem => match node {
                N::List { data, .. } => Some(data.items),
                _ => None,
            },
            PathSegment::OptionalItem => match node {
                N::Optional { data, .. } => Some(data.item),
                _ => None,
            },
            PathSegment::UnionVariant(idx) => match node {
                N::Union { data, .. } => data.any_of.get(*idx as usize).copied(),
                N::Either { data, .. } => data.one_of.get(*idx as usize).copied(),
                _ => None,
            },
        }
    }
}

/// A value type is a type that is not a namespace object, nor a function.
/// It can be an input type or an output type.
#[derive(Debug, Clone)]
pub struct ValueTypePath {
    pub owner: Weak<FunctionType>,
    pub path: Path,
}

impl ValueTypePath {
    pub fn to_indices(&self, root_type: Type, schema: &tg_schema::Typegraph) -> Vec<u32> {
        self.path
            .iter()
            .fold(
                (vec![root_type.idx()], root_type.idx()),
                |(mut acc, ty), seg| {
                    let ty = seg.apply_on_schema_node(&schema.types, ty).unwrap();
                    acc.push(ty);
                    (acc, ty)
                },
            )
            .0
    }

    pub fn find_cycle(
        &self,
        root_type: Type,
        schema: &tg_schema::Typegraph,
    ) -> Option<ValueTypePath> {
        // precondition: self.path.len() > 2
        let indices = self.to_indices(root_type, schema);
        eprintln!("find cycle: {:?}", indices);
        let last = indices.last().unwrap();
        indices[..indices.len() - 1]
            .iter()
            .position(|idx| idx == last)
            .map(|idx| {
                let path = self.path[..idx].to_vec();
                ValueTypePath {
                    owner: self.owner.clone(),
                    path,
                }
            })
    }
}

impl From<Arc<FunctionType>> for ValueTypePath {
    fn from(owner: Arc<FunctionType>) -> Self {
        Self {
            owner: Arc::downgrade(&owner),
            path: Default::default(),
        }
    }
}

impl PartialEq for ValueTypePath {
    fn eq(&self, other: &Self) -> bool {
        self.owner.upgrade().unwrap().base.type_idx == other.owner.upgrade().unwrap().base.type_idx
            && self.path == other.path
    }
}

impl Eq for ValueTypePath {}

impl Hash for ValueTypePath {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.owner.upgrade().unwrap().base.type_idx.hash(state);
        self.path.hash(state);
    }
}

/// type id in the expanded graph
#[derive(Clone, PartialEq, Eq, Hash)]
pub enum RelativePath {
    Function(u32),
    NsObject(Vec<Arc<str>>),
    Input(ValueTypePath),
    Output(ValueTypePath),
}

impl std::fmt::Debug for RelativePath {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Function(idx) => write!(f, "Function({})", idx),
            Self::NsObject(path) => write!(f, "NsObject(/{:?})", path.join("/")),
            Self::Input(k) => write!(
                f,
                "Input(fn={}; {:?})",
                k.owner.upgrade().unwrap().idx(),
                k.path
            ),
            Self::Output(k) => write!(
                f,
                "Output(fn={}; {:?})",
                k.owner.upgrade().unwrap().idx(),
                k.path
            ),
        }
    }
}

impl RelativePath {
    pub fn root() -> Self {
        Self::NsObject(vec![])
    }

    pub fn namespace(path: Vec<Arc<str>>) -> Self {
        Self::NsObject(path)
    }

    pub fn input(owner: Weak<FunctionType>, path: Path) -> Self {
        Self::Input(ValueTypePath { owner, path })
    }

    pub fn output(owner: Weak<FunctionType>, path: Path) -> Self {
        Self::Output(ValueTypePath { owner, path })
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

    pub fn find_cycle(&self, schema: &tg_schema::Typegraph) -> Option<RelativePath> {
        use RelativePath as RP;
        match self {
            RP::Function(_) => None,
            RP::NsObject(_) => None,
            RP::Input(p) => {
                if p.path.len() <= 2 {
                    return None;
                }
                p.find_cycle(p.owner.upgrade().unwrap().input().wrap(), schema)
                    .map(|p| RP::Input(p))
            }
            RP::Output(p) => {
                if p.path.len() <= 2 {
                    return None;
                }
                p.find_cycle(p.owner.upgrade().unwrap().output().clone(), schema)
                    .map(|p| RP::Output(p))
            }
        }
    }
}

impl RelativePath {
    pub(crate) fn push(&self, segment: PathSegment) -> Self {
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
                Self::Input(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                })
            }
            Self::Output(k) => {
                let mut path = k.path.clone();
                path.push(segment);
                Self::Output(ValueTypePath {
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
