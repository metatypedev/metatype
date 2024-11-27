// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

pub enum NodeArgs<ArgT> {
    Inline(ArgT),
    Placeholder(PlaceholderValue),
}

impl<ArgT> From<ArgT> for NodeArgs<ArgT> {
    fn from(value: ArgT) -> Self {
        Self::Inline(value)
    }
}

#[derive(Debug)]
pub enum NodeArgsErased {
    None,
    Inline(serde_json::Value),
    Placeholder(PlaceholderValue),
}

impl<ArgT> From<NodeArgs<ArgT>> for NodeArgsErased
where
    ArgT: Serialize,
{
    fn from(value: NodeArgs<ArgT>) -> Self {
        match value {
            NodeArgs::Inline(arg) => Self::Inline(to_json_value(arg)),
            NodeArgs::Placeholder(ph) => Self::Placeholder(ph),
        }
    }
}

pub enum NodeArgsMerged {
    Inline(HashMap<CowStr, NodeArgValue>),
    Placeholder {
        value: PlaceholderValue,
        arg_types: HashMap<CowStr, CowStr>,
    },
}

/// This checks the input arg json for a node
/// against the arg description from the [`NodeMeta`].
pub(crate) fn check_node_args(
    args: serde_json::Value,
    arg_types: &HashMap<CowStr, CowStr>,
) -> Result<HashMap<CowStr, NodeArgValue>, String> {
    let args = match args {
        serde_json::Value::Object(val) => val,
        _ => unreachable!(),
    };
    let mut instance_args = HashMap::new();
    for (name, value) in args {
        let Some(type_name) = arg_types.get(&name[..]) else {
            return Err(name);
        };
        instance_args.insert(
            name.into(),
            NodeArgValue {
                type_name: type_name.clone(),
                value,
            },
        );
    }
    Ok(instance_args)
}

pub struct NodeArgValue {
    pub type_name: CowStr,
    pub value: serde_json::Value,
}

pub struct PreparedArgs;

impl PreparedArgs {
    pub fn get<ArgT, F, In>(&mut self, key: impl Into<CowStr>, fun: F) -> NodeArgs<ArgT>
    where
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        NodeArgs::Placeholder(PlaceholderValue {
            key: key.into(),
            fun: Box::new(move |value| {
                let value = serde_json::from_value(value)?;
                let value = fun(value);
                serde_json::to_value(value)
            }),
        })
    }
    pub fn arg<ArgT, T, F, In>(&mut self, key: impl Into<CowStr>, fun: F) -> T
    where
        T: From<PlaceholderArg<ArgT>>,
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        T::from(PlaceholderArg {
            value: PlaceholderValue {
                key: key.into(),
                fun: Box::new(move |value| {
                    let value = serde_json::from_value(value)?;
                    let value = fun(value);
                    serde_json::to_value(value)
                }),
            },
            _phantom: PhantomData,
        })
    }
    pub fn arg_select<ArgT, SelT, T, F, In>(
        &mut self,
        key: impl Into<CowStr>,
        selection: SelT,
        fun: F,
    ) -> T
    where
        T: From<PlaceholderArgSelect<ArgT, SelT>>,
        In: serde::de::DeserializeOwned,
        F: Fn(In) -> ArgT + 'static + Send + Sync,
        ArgT: Serialize,
    {
        T::from(PlaceholderArgSelect {
            value: PlaceholderValue {
                key: key.into(),
                fun: Box::new(move |value| {
                    let value = serde_json::from_value(value)?;
                    let value = fun(value);
                    serde_json::to_value(value)
                }),
            },
            selection,
            _phantom: PhantomData,
        })
    }
}

pub struct PlaceholderValue {
    pub key: CowStr,
    pub fun: Box<
        dyn Fn(serde_json::Value) -> Result<serde_json::Value, serde_json::Error> + Send + Sync,
    >,
}

impl std::fmt::Debug for PlaceholderValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PlaceholderValue")
            .field("key", &self.key)
            .finish_non_exhaustive()
    }
}

pub struct PlaceholderArg<ArgT> {
    pub value: PlaceholderValue,
    _phantom: PhantomData<ArgT>,
}
pub struct PlaceholderArgSelect<ArgT, SelT> {
    pub value: PlaceholderValue,
    pub selection: SelT,
    _phantom: PhantomData<ArgT>,
}

pub struct PlaceholderArgs<Arg>(Arg);
