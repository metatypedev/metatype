// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use tg_schema::InjectionNode;

use crate::interlude::*;
use crate::{Arc, FunctionType, ObjectType, Type, TypeNode, TypeNodeExt as _, Weak, Wrap as _};
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

pub type Path = Vec<PathSegment>;

#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeKey(pub u32, pub u32); // Type idx and an ordinal number

impl std::fmt::Debug for TypeKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Ty_{}/{}", self.0, self.1)
    }
}

#[derive(Debug)]
pub enum ValueTypeKind {
    Input,
    Output,
}

#[derive(Debug)]
pub struct MapValueItem {
    pub kind: ValueTypeKind,
    pub ty: Type,
    pub relative_paths: Vec<ValueTypePath>,
}

#[derive(Debug)]
pub enum MapItem {
    Unset,
    Namespace(Arc<ObjectType>, Vec<Arc<str>>),
    Function(Arc<FunctionType>),
    Value(Vec<MapValueItem>),
}

impl MapItem {
    pub fn as_value(&self) -> Option<&[MapValueItem]> {
        match self {
            Self::Value(v) => Some(v),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub struct ConversionMap {
    pub direct: Vec<MapItem>,
    pub reverse: HashMap<RelativePath, TypeKey>,
}

impl ConversionMap {
    pub fn new(type_count: usize) -> Self {
        let mut direct = Vec::with_capacity(type_count);
        direct.resize_with(type_count, || MapItem::Unset);
        Self {
            direct,
            reverse: Default::default(),
        }
    }

    pub fn get(&self, key: TypeKey) -> Option<Type> {
        match self.direct.get(key.0 as usize) {
            Some(MapItem::Unset) => None,
            Some(MapItem::Namespace(ty, _)) => {
                assert_eq!(key.1, 0);
                Some(Type::Object(Arc::clone(ty)))
            }
            Some(MapItem::Function(f)) => {
                assert_eq!(key.1, 0);
                Some(Type::Function(Arc::clone(f)))
            }
            Some(MapItem::Value(value_types)) => {
                let ordinal = key.1 as usize;
                value_types.get(ordinal).map(|item| item.ty.clone())
            }
            None => None, // unreachable
        }
    }
}

impl ConversionMap {
    pub fn register(&mut self, rpath: RelativePath, node: Type) -> Result<()> {
        let key = node.key();
        let item = std::mem::replace(&mut self.direct[key.0 as usize], MapItem::Unset);
        let item = match item {
            MapItem::Unset => match &rpath {
                RelativePath::Function(_) => MapItem::Function(node.assert_func()?.clone()),
                RelativePath::NsObject(path) => {
                    MapItem::Namespace(node.assert_object()?.clone(), path.clone())
                }
                RelativePath::Input(_) => MapItem::Value(vec![MapValueItem {
                    kind: ValueTypeKind::Input,
                    ty: node.clone(),
                    relative_paths: vec![rpath
                        .clone()
                        .try_into()
                        .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?],
                }]),
                RelativePath::Output(_) => MapItem::Value(vec![MapValueItem {
                    kind: ValueTypeKind::Output,
                    ty: node.clone(),
                    relative_paths: vec![rpath
                        .clone()
                        .try_into()
                        .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?],
                }]),
            },
            MapItem::Namespace(_, _) => {
                bail!("unexpected duplicate namespace type: {:?}", key)
            }
            MapItem::Function(_) => {
                bail!("unexpected duplicate function type: {:?}", key)
            }
            MapItem::Value(mut value_types) => {
                if key.1 != value_types.len() as u32 {
                    bail!("unexpected ordinal number: {:?}", key);
                }
                value_types.push(MapValueItem {
                    kind: match rpath {
                        RelativePath::Input(_) => ValueTypeKind::Input,
                        RelativePath::Output(_) => ValueTypeKind::Output,
                        _ => bail!("unexpected value type kind: {:?}", rpath),
                    },
                    ty: node.clone(),
                    relative_paths: vec![rpath
                        .clone()
                        .try_into()
                        .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?],
                });
                MapItem::Value(value_types)
            }
        };
        self.direct[key.0 as usize] = item;

        let old = self.reverse.insert(rpath.clone(), key);
        if old.is_some() {
            bail!("duplicate relative path: {:?}", rpath);
        }

        Ok(())
    }

    pub fn append(&mut self, key: TypeKey, rpath: RelativePath) -> Result<()> {
        let entry = self
            .direct
            .get_mut(key.0 as usize)
            .ok_or_else(|| eyre!("type index out of bound"))?;
        match entry {
            MapItem::Value(value_types) => {
                let ordinal = key.1 as usize;
                let item = value_types.get_mut(ordinal).ok_or_else(|| {
                    eyre!("value type not found: local index out of bound: {:?}", key)
                })?;
                item.relative_paths.push(
                    rpath
                        .clone()
                        .try_into()
                        .map_err(|e| eyre!("relative path is not a value type: {:?}", e))?,
                );
            }
            _ => bail!("unexpected map item: {:?}", key),
        }

        self.reverse.insert(rpath, key);

        Ok(())
    }

    pub fn get_next_type_key(&self, type_idx: u32) -> Result<TypeKey> {
        match self.direct.get(type_idx as usize) {
            Some(MapItem::Unset) => Ok(TypeKey(type_idx, 0)),
            Some(MapItem::Namespace(_, _)) => {
                bail!("unexpected duplicate namespace type: {:?}", type_idx)
            }
            Some(MapItem::Function(_)) => {
                bail!("unexpected duplicate function type: {:?}", type_idx)
            }
            Some(MapItem::Value(value_types)) => {
                let ordinal = value_types.len() as u32;
                Ok(TypeKey(type_idx, ordinal))
            }
            None => bail!("type index out of bounds: {:?}", type_idx),
        }
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
    // Typed error?
    pub fn apply(&self, ty: &Type) -> Result<Type> {
        match self {
            PathSegment::ObjectProp(key) => match ty {
                Type::Object(obj) => {
                    let prop = obj.properties()?.get(key).ok_or_else(|| {
                        eyre!("cannot apply path segment: property '{}' not found", key)
                    })?;
                    Ok(prop.type_.clone())
                }
                _ => bail!(
                    "cannot apply path segment: expected object type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::ListItem => match ty {
                Type::List(list) => Ok(list.item()?.clone()),
                _ => bail!(
                    "cannot apply path segment: expected list type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::OptionalItem => match ty {
                Type::Optional(opt) => Ok(opt.item()?.clone()),
                _ => bail!(
                    "cannot apply path segment: expected optional type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::UnionVariant(idx) => match ty {
                Type::Union(union) => Ok(union
                    .variants()?
                    .get(*idx as usize)
                    .ok_or_else(|| eyre!("variant #{} not found in union; ty={}", idx, ty.idx()))?
                    .clone()),
                _ => bail!(
                    "cannot apply path segment: expected union type, got {:?}",
                    ty.tag()
                ),
            },
        }
    }

    pub fn apply_on_schema_node(
        &self,
        nodes: &[tg_schema::TypeNode],
        type_idx: u32,
    ) -> Result<u32> {
        use tg_schema::TypeNode as N;
        let node = &nodes[type_idx as usize];
        match self {
            PathSegment::ObjectProp(key) => match node {
                N::Object { data, .. } => {
                    data.properties.get(key.as_ref()).copied().ok_or_else(|| {
                        eyre!(
                            "invalid path segment: {:?}; property '{}' not found",
                            self,
                            key
                        )
                    })
                }
                _ => bail!(
                    "invalid path segment: {:?}; expected object type, got {:?}",
                    self,
                    node.base().title
                ),
            },
            PathSegment::ListItem => match node {
                N::List { data, .. } => Ok(data.items),
                _ => bail!(
                    "invalid path segment: {:?}; expected list type, got {:?}",
                    self,
                    node.base().title
                ),
            },
            PathSegment::OptionalItem => match node {
                N::Optional { data, .. } => Ok(data.item),
                _ => bail!(
                    "invalid path segment: {:?}; expected optional type, got {:?}",
                    self,
                    node.base().title
                ),
            },
            PathSegment::UnionVariant(idx) => match node {
                N::Union { data, .. } => data.any_of.get(*idx as usize).copied().ok_or_else(|| {
                    eyre!(
                        "invalid path segment: {:?}; variant #{idx} not found in union",
                        self
                    )
                }),
                N::Either { data, .. } => {
                    data.one_of.get(*idx as usize).copied().ok_or_else(|| {
                        eyre!(
                            "invalid path segment: {:?}; variant #{idx} not found in either",
                            self
                        )
                    })
                }
                _ => bail!(
                    "invalid path segment: {:?}; expected union type, got {:?}",
                    self,
                    node.base().title
                ),
            },
        }
    }

    pub fn apply_on_injection(&self, mut node: InjectionNode) -> Option<InjectionNode> {
        match self {
            PathSegment::ObjectProp(key) => match &mut node {
                InjectionNode::Parent { children } => children.get_mut(key.as_ref()).map(|node| {
                    std::mem::replace(
                        node,
                        InjectionNode::Parent {
                            children: Default::default(),
                        },
                    )
                }),
                _ => unreachable!("expected parent node"),
            },
            _ => Some(node),
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
    pub fn to_indices(&self, root_type: Type, schema: &tg_schema::Typegraph) -> Result<Vec<u32>> {
        let mut ty = root_type.idx();
        let mut acc = vec![ty];
        for seg in &self.path {
            ty = seg.apply_on_schema_node(&schema.types, ty)?;
            acc.push(ty);
        }
        Ok(acc)
    }

    pub fn find_cycle(
        &self,
        root_type: Type,
        schema: &tg_schema::Typegraph,
    ) -> Result<Option<ValueTypePath>> {
        // precondition: self.path.len() > 2
        let indices = self.to_indices(root_type, schema)?;
        let last = indices.last().unwrap();
        Ok(indices[..indices.len() - 1]
            .iter()
            .position(|idx| idx == last)
            .map(|idx| {
                let path = self.path[..idx].to_vec();
                ValueTypePath {
                    owner: self.owner.clone(),
                    path,
                }
            }))
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
        let left = self.owner.upgrade().expect("no strong pointer for type");
        let right = other.owner.upgrade().expect("no strong pointer for type");

        left.base.type_idx == right.base.type_idx && self.path == other.path
    }
}

impl Eq for ValueTypePath {}

impl Hash for ValueTypePath {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.owner
            .upgrade()
            .expect("no strong pointer for type")
            .base
            .type_idx
            .hash(state);
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

impl TryFrom<RelativePath> for ValueTypePath {
    type Error = RelativePath;
    fn try_from(value: RelativePath) -> Result<Self, Self::Error> {
        match value {
            RelativePath::Input(path) => Ok(path),
            RelativePath::Output(path) => Ok(path),
            _ => Err(value),
        }
    }
}

impl std::fmt::Debug for RelativePath {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Function(idx) => write!(f, "Function({})", idx),
            Self::NsObject(path) => write!(f, "NsObject(/{:?})", path.join("/")),
            Self::Input(k) => write!(
                f,
                "Input(fn={}; {:?})",
                k.owner.upgrade().expect("no strong pointer for type").idx(),
                k.path
            ),
            Self::Output(k) => write!(
                f,
                "Output(fn={}; {:?})",
                k.owner.upgrade().expect("no strong pointer for type").idx(),
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

    pub fn find_cycle(&self, schema: &tg_schema::Typegraph) -> Result<Option<RelativePath>> {
        use RelativePath as RP;
        match self {
            RP::Function(_) => Ok(None),
            RP::NsObject(_) => Ok(None),
            RP::Input(p) => {
                if p.path.len() <= 2 {
                    Ok(None)
                } else {
                    Ok(p.find_cycle(
                        p.owner
                            .upgrade()
                            .ok_or_else(|| eyre!("no strong pointer for type"))?
                            .input()?
                            .wrap(),
                        schema,
                    )?
                    .map(|p| RP::Input(p)))
                }
            }
            RP::Output(p) => {
                if p.path.len() <= 2 {
                    Ok(None)
                } else {
                    Ok(p.find_cycle(
                        p.owner
                            .upgrade()
                            .ok_or_else(|| eyre!("no strong pointer for type"))?
                            .output()?
                            .clone(),
                        schema,
                    )?
                    .map(|p| RP::Output(p)))
                }
            }
        }
    }

    pub fn get_injection(&self, schema: &tg_schema::Typegraph) -> Option<InjectionNode> {
        match self {
            Self::Function(_) | Self::NsObject(_) | Self::Output(_) => None,
            Self::Input(p) => {
                let owner = p.owner.upgrade().expect("no strong pointer for type");
                let owner_node = schema.types.get(owner.base.type_idx as usize).unwrap();
                let data = match owner_node {
                    tg_schema::TypeNode::Function { data, .. } => {
                        data
                        //
                    }
                    _ => unreachable!("expected a function node; got {:?}", owner_node.type_name()),
                };
                let mut injection = InjectionNode::Parent {
                    children: data.injections.clone(),
                };

                for seg in &p.path {
                    if let Some(inj) = seg.apply_on_injection(std::mem::replace(
                        &mut injection,
                        InjectionNode::Parent {
                            children: Default::default(),
                        },
                    )) {
                        injection = inj;
                    } else {
                        return None;
                    }
                }
                Some(injection)
            }
        }
    }
}

impl RelativePath {
    pub(crate) fn push(&self, segment: PathSegment) -> Result<Self> {
        Ok(match self {
            Self::NsObject(path) => {
                let mut path = path.clone();
                match segment {
                    PathSegment::ObjectProp(key) => {
                        path.push(key);
                        Self::NsObject(path)
                    }
                    _ => bail!("unexpected segment pushed on namespace {:?}", segment),
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
                bail!("unexpected segment pushed on function {:?}", segment);
            }
        })
    }
}
