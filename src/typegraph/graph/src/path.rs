// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::injection::InjectionNode;
use crate::{conv::map::ValueTypeKind, interlude::*, EdgeKind, FunctionType, Type};
use crate::{Edge, TypeNode as _, TypeNodeExt as _};
use std::hash::{Hash, Hasher};

pub type Path = Vec<PathSegment>;

#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum PathSegment {
    ObjectProp(Arc<str>),
    ListItem,
    OptionalItem,
    UnionVariant(u32),
}

impl TryFrom<EdgeKind> for PathSegment {
    type Error = EdgeKind;
    fn try_from(value: EdgeKind) -> Result<Self, Self::Error> {
        match value {
            EdgeKind::ObjectProperty(key) => Ok(Self::ObjectProp(key)),
            EdgeKind::ListItem => Ok(Self::ListItem),
            EdgeKind::OptionalItem => Ok(Self::OptionalItem),
            EdgeKind::UnionVariant(idx) => Ok(Self::UnionVariant(idx as u32)),
            _ => Err(value),
        }
    }
}

impl PathSegment {
    pub fn apply(&self, ty: &Type) -> Result<Type> {
        match self {
            PathSegment::ObjectProp(key) => match ty {
                Type::Object(obj) => {
                    let prop = obj.properties().get(key).ok_or_else(|| {
                        eyre!("cannot apply path segment: property '{}' not found", key)
                    })?;
                    Ok(prop.ty.clone())
                }
                _ => bail!(
                    "cannot apply path segment: expected object type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::ListItem => match ty {
                Type::List(list) => Ok(list.item().clone()),
                _ => bail!(
                    "cannot apply path segment: expected list type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::OptionalItem => match ty {
                Type::Optional(opt) => Ok(opt.item().clone()),
                _ => bail!(
                    "cannot apply path segment: expected optional type, got {:?}",
                    ty.tag()
                ),
            },
            PathSegment::UnionVariant(idx) => match ty {
                Type::Union(union) => Ok(union
                    .variants()
                    .get(*idx as usize)
                    .ok_or_else(|| {
                        eyre!(
                            "index out of bounds: variant #{} not found in union; ty={}",
                            idx,
                            ty.idx()
                        )
                    })?
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

    // pub fn apply_on_schema_node_ex<K: DupKey>(
    //     &self,
    //     nodes: &[tg_schema::TypeNode],
    //     xkey: TypeKeyEx<K>,
    // ) -> Result<TypeKeyEx<K>> {
    //     let idx = self.apply_on_schema_node(nodes, xkey.0)?;
    //     let injection = xkey
    //         .1
    //         .injection
    //         .and_then(|inj| self.apply_on_injection(&inj));
    //
    //     Ok(TypeKeyEx(idx, DuplicationKey { injection }))
    // }

    pub fn apply_on_injection(&self, node: &Arc<InjectionNode>) -> Option<Arc<InjectionNode>> {
        match self {
            PathSegment::ObjectProp(key) => match node.as_ref() {
                InjectionNode::Parent { children } => children.get(key.as_ref()).cloned(),
                _ => unreachable!("expected parent node"),
            },
            _ => Some(node.clone()),
        }
    }
}

/// A value type is a type that is not a namespace object, nor a function.
/// It can be an input type or an output type.
#[derive(Debug, Clone)]
pub struct ValueTypePath {
    pub owner: Weak<FunctionType>,
    pub branch: ValueTypeKind,
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
}

impl PartialEq for ValueTypePath {
    fn eq(&self, other: &Self) -> bool {
        let left = self.owner.upgrade().expect("no strong pointer for type");
        let right = other.owner.upgrade().expect("no strong pointer for type");

        self.branch == other.branch && left.base.key == right.base.key && self.path == other.path
    }
}

impl Eq for ValueTypePath {}

impl Hash for ValueTypePath {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.owner
            .upgrade()
            .expect("no strong pointer for type")
            .base
            .key
            .hash(state);
        self.branch.hash(state);
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
        Self::Input(ValueTypePath {
            owner,
            path,
            branch: ValueTypeKind::Input,
        })
    }

    pub fn output(owner: Weak<FunctionType>, path: Path) -> Self {
        Self::Output(ValueTypePath {
            owner,
            path,
            branch: ValueTypeKind::Output,
        })
    }

    pub fn is_input(&self) -> bool {
        matches!(self, Self::Input(_))
    }

    pub fn is_output(&self) -> bool {
        matches!(self, Self::Output(_))
    }

    pub fn is_namespace(&self) -> bool {
        matches!(self, Self::NsObject(_))
    }

    pub fn get_injection(&self) -> Option<Arc<InjectionNode>> {
        match self {
            Self::Function(_) | Self::NsObject(_) | Self::Output(_) => None,
            Self::Input(p) => {
                // TODO (perf): get from parent
                let owner = p.owner.upgrade().expect("no strong pointer for type");
                let mut injection = Arc::new(InjectionNode::Parent {
                    children: owner.injections.clone(),
                });

                for seg in &p.path {
                    injection = seg.apply_on_injection(&injection)?;
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
                    branch: ValueTypeKind::Input,
                })
            }
            Self::Output(k) => {
                let mut path = k.path.clone();
                path.push(segment);
                Self::Output(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                    branch: ValueTypeKind::Output,
                })
            }
            Self::Function(_) => {
                bail!("unexpected segment pushed on function {:?}", segment);
            }
        })
    }

    pub(crate) fn push_edge(&self, edge: &Edge) -> Result<Self> {
        if let Type::Function(func) = &edge.to {
            return Ok(Self::Function(func.idx()));
        }

        Ok(match self {
            Self::NsObject(path) => {
                let mut path = path.clone();
                match &edge.kind {
                    EdgeKind::ObjectProperty(key) => {
                        path.push(Arc::clone(key));
                        Self::NsObject(path)
                    }
                    _ => bail!("unexpected edge pushed on namespace {:?}", edge.kind),
                }
            }
            Self::Input(k) => {
                let mut path = k.path.clone();
                path.push(edge.kind.clone().try_into().map_err(|_| {
                    eyre!(
                        "unexpected edge kind pushed on input rpath: {:?}",
                        edge.kind
                    )
                })?);
                Self::Input(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                    branch: ValueTypeKind::Input,
                })
            }
            Self::Output(k) => {
                let mut path = k.path.clone();
                path.push(edge.kind.clone().try_into().map_err(|_| {
                    eyre!(
                        "unexpected edge kind pushed on output rpath: {:?}",
                        edge.kind
                    )
                })?);
                Self::Output(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                    branch: ValueTypeKind::Output,
                })
            }
            Self::Function(_) => {
                let func = edge.from.upgrade().unwrap();
                let func = func.assert_func().unwrap();
                let owner = Arc::downgrade(func);

                match &edge.kind {
                    EdgeKind::FunctionInput => Self::Input(ValueTypePath {
                        owner,
                        branch: ValueTypeKind::Input,
                        path: Default::default(),
                    }),
                    EdgeKind::FunctionOutput => Self::Output(ValueTypePath {
                        owner,
                        branch: ValueTypeKind::Output,
                        path: Default::default(),
                    }),
                    _ => bail!("unexpected edge pushed on function {:?}", edge.kind),
                }
            }
        })
    }

    pub(crate) fn pop(&self) -> Self {
        match self {
            Self::NsObject(path) => {
                let mut path = path.clone();
                path.pop();
                Self::NsObject(path)
            }
            Self::Input(k) => {
                let mut path = k.path.clone();
                path.pop();
                Self::Input(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                    branch: ValueTypeKind::Input,
                })
            }
            Self::Output(k) => {
                let mut path = k.path.clone();
                path.pop();
                Self::Output(ValueTypePath {
                    owner: k.owner.clone(),
                    path,
                    branch: ValueTypeKind::Output,
                })
            }
            Self::Function(_) => self.clone(),
        }
    }
}
