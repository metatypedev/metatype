// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::BTreeMap, sync::Arc};

use tg_schema::EffectType;

// use use `Arc` because we will have a lot of `.clone()`s: into child types,
// duplication key, etc...
#[derive(Debug, Hash, PartialEq, Eq)]
pub enum InjectionNode {
    Parent {
        children: BTreeMap<String, Arc<InjectionNode>>,
    },
    Leaf {
        injection: Arc<Injection>,
    },
}

#[derive(Debug, Hash, PartialEq, Eq)]
pub enum Injection {
    Static {
        value: serde_json::Value,
    },
    Context {
        path: String,
    },
    Secret {
        name: String,
    },
    Parent {
        prop_name: String,
    },
    Dynamic {
        generator: String,
    },
    Random {
        generator: String,
        args: BTreeMap<String, serde_json::Value>,
    },
}

impl InjectionNode {
    pub fn from_schema(node: &tg_schema::InjectionNode, effect: EffectType) -> Option<Arc<Self>> {
        match node {
            tg_schema::InjectionNode::Parent { children } => {
                let children = children
                    .iter()
                    .filter_map(|(key, node)| {
                        Self::from_schema(node, effect).map(|node| (key.clone(), node))
                    })
                    .collect::<BTreeMap<_, _>>();

                if children.is_empty() {
                    None
                } else {
                    Some(Self::Parent { children }.into())
                }
            }
            tg_schema::InjectionNode::Leaf { injection } => {
                Injection::from_schema(injection, effect)
                    .map(|injection| Self::Leaf { injection }.into())
            }
        }
    }

    pub fn is_empty(&self) -> bool {
        match self {
            Self::Parent { children } => {
                // should be impossible; as we would have `None`
                children.is_empty()
            }
            Self::Leaf { .. } => false,
        }
    }
}

impl Injection {
    fn from_schema(inj: &tg_schema::Injection, effect: EffectType) -> Option<Arc<Self>> {
        use tg_schema::Injection as I;
        match inj {
            I::Static(d) => Some(
                Self::Static {
                    value: select(d, effect)?.clone(),
                }
                .into(),
            ),
            I::Context(d) => Some(
                Self::Context {
                    path: select(d, effect)?
                        .as_str()
                        .expect("context injection data must be a string")
                        .to_string(),
                }
                .into(),
            ),
            I::Secret(d) => Some(
                Self::Secret {
                    name: select(d, effect)?
                        .as_str()
                        .expect("secret injection data must be a string")
                        .to_string(),
                }
                .into(),
            ),
            I::Parent(d) => Some(
                Self::Parent {
                    prop_name: select(d, effect)?
                        .as_str()
                        .expect("parent injection data must be a string")
                        .to_string(),
                }
                .into(),
            ),
            I::Random(d) => {
                let data = select(d, effect)?;
                let generator = &data["gen"];
                if generator.is_null() {
                    return None;
                }
                let generator = generator
                    .as_str()
                    .expect("random injection generator name must be a string")
                    .to_string();
                let args = &data["args"];
                let args = if args.is_null() {
                    Default::default()
                } else {
                    args.as_object()
                        .expect("random injection args must be an object")
                        .clone()
                        .into_iter()
                        .collect()
                };
                Some(Self::Random { generator, args }.into())
            }
            I::Dynamic(d) => Some(
                Self::Dynamic {
                    generator: select(d, effect)?
                        .as_str()
                        .expect("dynamic injection data must be a string")
                        .to_string(),
                }
                .into(),
            ),
        }
    }
}

fn select(inj_data: &tg_schema::InjectionData, fx: EffectType) -> Option<&serde_json::Value> {
    use tg_schema::InjectionData as D;
    match inj_data {
        D::SingleValue(v) => Some(&v.value),
        D::ValueByEffect(map) => map.get(&fx),
    }
}
