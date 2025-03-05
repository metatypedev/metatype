// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::args::{
    check_node_args, NodeArgsErased, NodeArgsMerged, PlaceholderArg, PlaceholderArgSelect,
};
use crate::interlude::*;
use crate::nodes::{NodeMeta, NodeMetaFn, SelectNodeErased, SubNodes};

/// Build the SelectNodeErased tree from the SelectionErasedMap tree
/// according to the NodeMeta tree. In this function
/// - arguments are associated with their types
/// - aliases get splatted into the node tree
/// - light query validation takes place
///
/// I.e. the user's selection is joined with the description of the graph found
/// in the static NodeMetas to fill in any blank spaces
pub fn selection_to_node_set(
    selection: SelectionErasedMap,
    metas: &HashMap<CowStr, NodeMetaFn>,
    parent_path: String,
) -> Result<Vec<SelectNodeErased>, SelectionError> {
    let mut out = vec![];
    let mut selection = selection.0;
    let mut found_nodes = selection
        .keys()
        .cloned()
        .collect::<std::collections::HashSet<_>>();
    for (node_name, meta_fn) in metas.iter() {
        found_nodes.remove(&node_name[..]);

        let Some(node_selection) = selection.remove(&node_name[..]) else {
            // this node was not selected
            continue;
        };

        // we can have multiple selection instances for a node
        // if aliases are involved
        let node_instances = match node_selection {
            // this noe was not selected
            SelectionErased::None => continue,
            SelectionErased::Scalar => vec![(node_name.clone(), NodeArgsErased::None, None)],
            SelectionErased::ScalarArgs(args) => {
                vec![(node_name.clone(), args, None)]
            }
            SelectionErased::Composite(select) => {
                vec![(node_name.clone(), NodeArgsErased::None, Some(select))]
            }
            SelectionErased::CompositeArgs(args, select) => {
                vec![(node_name.clone(), args, Some(select))]
            }
            SelectionErased::Alias(aliases) => aliases
                .into_iter()
                .map(|(instance_name, selection)| {
                    let (args, select) = match selection {
                        AliasSelection::Scalar => (NodeArgsErased::None, None),
                        AliasSelection::ScalarArgs(args) => (args, None),
                        AliasSelection::Composite(select) => (NodeArgsErased::None, Some(select)),
                        AliasSelection::CompositeArgs(args, select) => (args, Some(select)),
                    };
                    (instance_name, args, select)
                })
                .collect(),
        };

        let meta = meta_fn();
        for (instance_name, args, select) in node_instances {
            out.push(selection_to_select_node(
                instance_name,
                node_name.clone(),
                args,
                select,
                &parent_path,
                &meta,
            )?)
        }
    }
    Ok(out)
}

pub(crate) fn selection_to_select_node(
    instance_name: CowStr,
    node_name: CowStr,
    args: NodeArgsErased,
    select: Option<CompositeSelection>,
    parent_path: &str,
    meta: &NodeMeta,
) -> Result<SelectNodeErased, SelectionError> {
    let args = if let Some(arg_types) = &meta.arg_types {
        match args {
            NodeArgsErased::Inline(args) => {
                let instance_args = check_node_args(args, arg_types).map_err(|name| {
                    SelectionError::UnexpectedArgs {
                        name,
                        path: format!("{parent_path}.{instance_name}"),
                    }
                })?;
                Some(NodeArgsMerged::Inline(instance_args))
            }
            NodeArgsErased::Placeholder(ph) => Some(NodeArgsMerged::Placeholder {
                value: ph,
                // FIXME: this clone can be improved
                arg_types: arg_types.clone(),
            }),
            NodeArgsErased::None => {
                return Err(SelectionError::MissingArgs {
                    path: format!("{parent_path}.{instance_name}"),
                })
            }
        }
    } else {
        None
    };
    let sub_nodes = match (&meta.variants, &meta.sub_nodes) {
        (Some(_), Some(_)) => unreachable!("union/either node metas can't have sub_nodes"),
        (None, None) => SubNodes::None,
        (variants, sub_nodes) => {
            let Some(select) = select else {
                return Err(SelectionError::MissingSubNodes {
                    path: format!("{parent_path}.{instance_name}"),
                });
            };
            match select {
                CompositeSelection::Atomic(select) => {
                    let Some(sub_nodes) = sub_nodes else {
                        return Err(SelectionError::UnexpectedUnion {
                            path: format!("{parent_path}.{instance_name}"),
                        });
                    };
                    SubNodes::Atomic(selection_to_node_set(
                        select,
                        sub_nodes,
                        format!("{parent_path}.{instance_name}"),
                    )?)
                }
                CompositeSelection::Union(mut variant_select) => {
                    let Some(variants) = variants else {
                        return Err(SelectionError::MissingUnion {
                            path: format!("{parent_path}.{instance_name}"),
                        });
                    };
                    let mut out = HashMap::new();
                    for (variant_ty, variant_meta) in variants {
                        let variant_meta = variant_meta();
                        // this union member is a scalar
                        let Some(sub_nodes) = variant_meta.sub_nodes else {
                            continue;
                        };
                        let mut nodes = if let Some(select) = variant_select.remove(variant_ty) {
                            selection_to_node_set(
                                select,
                                &sub_nodes,
                                format!("{parent_path}.{instance_name}.variant({variant_ty})"),
                            )?
                        } else {
                            vec![]
                        };
                        nodes.push(SelectNodeErased {
                            node_name: "__typename".into(),
                            instance_name: "__typename".into(),
                            args: None,
                            sub_nodes: SubNodes::None,
                            input_files: meta.input_files.clone(),
                        });
                        out.insert(variant_ty.clone(), nodes);
                    }
                    if !variant_select.is_empty() {
                        return Err(SelectionError::UnexpectedVariants {
                            path: format!("{parent_path}.{instance_name}"),
                            varaint_tys: variant_select.into_keys().collect(),
                        });
                    }
                    SubNodes::Union(out)
                }
            }
        }
    };
    Ok(SelectNodeErased {
        node_name,
        instance_name,
        args,
        sub_nodes,
        input_files: meta.input_files.clone(),
    })
}

#[derive(Debug)]
pub enum SelectionError {
    MissingArgs {
        path: String,
    },
    MissingSubNodes {
        path: String,
    },
    MissingUnion {
        path: String,
    },
    UnexpectedArgs {
        path: String,
        name: String,
    },
    UnexpectedUnion {
        path: String,
    },
    UnexpectedVariants {
        path: String,
        varaint_tys: Vec<CowStr>,
    },
}

impl std::fmt::Display for SelectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SelectionError::MissingArgs { path } => write!(f, "args are missing at node {path}"),
            SelectionError::UnexpectedArgs { path, name } => {
                write!(f, "unexpected arg '${name}' at node {path}")
            }
            SelectionError::MissingSubNodes { path } => {
                write!(f, "node at {path} is a composite but no selection found")
            }
            SelectionError::MissingUnion { path } => write!(
                f,
                "node at {path} is a union but provided selection is atomic"
            ),
            SelectionError::UnexpectedUnion { path } => write!(
                f,
                "node at {path} is an atomic type but union selection provided"
            ),
            SelectionError::UnexpectedVariants {
                path,
                varaint_tys: varaint_ty,
            } => {
                write!(
                    f,
                    "node at {path} has none of the variants called '{varaint_ty:?}'"
                )
            }
        }
    }
}
impl std::error::Error for SelectionError {}

// This is a newtype for Into trait impl purposes
#[derive(Debug)]
pub struct SelectionErasedMap(pub HashMap<CowStr, SelectionErased>);

#[derive(Debug)]
pub enum CompositeSelection {
    Atomic(SelectionErasedMap),
    Union(HashMap<CowStr, SelectionErasedMap>),
}

impl Default for CompositeSelection {
    fn default() -> Self {
        CompositeSelection::Atomic(SelectionErasedMap(Default::default()))
    }
}

#[derive(Debug)]
pub enum SelectionErased {
    None,
    Scalar,
    ScalarArgs(NodeArgsErased),
    Composite(CompositeSelection),
    CompositeArgs(NodeArgsErased, CompositeSelection),
    Alias(HashMap<CowStr, AliasSelection>),
}

#[derive(Debug)]
pub enum AliasSelection {
    Scalar,
    ScalarArgs(NodeArgsErased),
    Composite(CompositeSelection),
    CompositeArgs(NodeArgsErased, CompositeSelection),
}

#[derive(Default, Clone, Copy, Debug)]
pub struct HasAlias;
#[derive(Default, Clone, Copy, Debug)]
pub struct NoAlias;

#[derive(Debug)]
pub struct AliasInfo<ArgT, SelT, ATyag> {
    aliases: HashMap<CowStr, AliasSelection>,
    _phantom: PhantomData<(ArgT, SelT, ATyag)>,
}

#[derive(Debug)]
pub enum ScalarSelect<ATy> {
    Get,
    Skip,
    Alias(AliasInfo<(), (), ATy>),
}
#[derive(Debug)]
pub enum ScalarSelectArgs<ArgT, ATy> {
    Get(NodeArgsErased, PhantomData<ArgT>),
    Skip,
    Alias(AliasInfo<ArgT, (), ATy>),
}
#[derive(Debug)]
pub enum CompositeSelect<SelT, ATy> {
    Get(CompositeSelection, PhantomData<SelT>),
    Skip,
    Alias(AliasInfo<(), SelT, ATy>),
}
#[derive(Debug)]
pub enum CompositeSelectArgs<ArgT, SelT, ATy> {
    Get(
        NodeArgsErased,
        CompositeSelection,
        PhantomData<(ArgT, SelT)>,
    ),
    Skip,
    Alias(AliasInfo<ArgT, SelT, ATy>),
}

pub struct Get;
pub struct Skip;
pub struct Args<ArgT>(ArgT);
pub struct Select<SelT>(SelT);
pub struct ArgSelect<ArgT, SelT>(ArgT, SelT);
pub struct Alias<ArgT, SelT>(AliasInfo<ArgT, SelT, HasAlias>);

/// Shorthand for `Default::default`. All selections generally default
/// to [`skip`].
pub fn default<T: Default>() -> T {
    T::default()
}
/// Include all sub nodes excpet those that require arguments
pub fn all<T: Selection>() -> T {
    T::all()
}
/// Select the node for inclusion.
pub fn get<T: From<Get>>() -> T {
    T::from(Get)
}
/// Skip this node when queryig.
pub fn skip<T: From<Skip>>() -> T {
    T::from(Skip)
}
/// Provide argumentns for a scalar node.
pub fn args<ArgT, T: From<Args<ArgT>>>(args: ArgT) -> T {
    T::from(Args(args))
}
/// Provide selections for a composite node that takes no args.
pub fn select<SelT, T: From<Select<SelT>>>(selection: SelT) -> T {
    T::from(Select(selection))
}
/// Provide arguments and selections for a composite node.
pub fn arg_select<ArgT, SelT, T: From<ArgSelect<ArgT, SelT>>>(args: ArgT, selection: SelT) -> T {
    T::from(ArgSelect(args, selection))
}

/// Query the same node multiple times using aliases.
///
/// WARNING: make sure your alias names don't clash across sibling
/// nodes.
pub fn alias<ArgT, SelT, ASelT, T, S>(info: impl Into<HashMap<S, ASelT>>) -> T
where
    S: Into<CowStr>,
    ASelT: Into<AliasSelection>,
    T: From<Alias<ArgT, SelT>> + FromAliasSelection<ASelT>,
{
    let info: HashMap<_, _> = info.into();
    T::from(Alias(AliasInfo {
        aliases: info
            .into_iter()
            .map(|(name, sel)| (name.into(), sel.into()))
            .collect(),
        _phantom: PhantomData,
    }))
}

pub trait Selection {
    /// Include all sub nodes excpet those that require arguments
    fn all() -> Self;
}

// --- Impl SelectionType impls --- //

impl<ATy> Selection for ScalarSelect<ATy> {
    fn all() -> Self {
        Self::Get
    }
}
impl<ArgT, ATy> Selection for ScalarSelectArgs<ArgT, ATy> {
    fn all() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Selection for CompositeSelect<SelT, ATy>
where
    SelT: Selection + Into<CompositeSelection>,
{
    fn all() -> Self {
        Self::Skip
    }
}
impl<ArgT, SelT, ATy> Selection for CompositeSelectArgs<ArgT, SelT, ATy>
where
    SelT: Selection,
{
    fn all() -> Self {
        Self::Skip
    }
}
// --- Default impls --- //

impl<ATy> Default for ScalarSelect<ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> Default for ScalarSelectArgs<ArgT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> Default for CompositeSelect<SelT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}
impl<ArgT, SelT, ATy> Default for CompositeSelectArgs<ArgT, SelT, ATy> {
    fn default() -> Self {
        Self::Skip
    }
}

// --- From Get/Skip...etc impls --- //

impl<ATy> From<Get> for ScalarSelect<ATy> {
    fn from(_: Get) -> Self {
        Self::Get
    }
}

impl<ATy> From<Skip> for ScalarSelect<ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<ArgT, ATy> From<Skip> for ScalarSelectArgs<ArgT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<SelT, ATy> From<Skip> for CompositeSelect<SelT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}
impl<ArgT, SelT, ATy> From<Skip> for CompositeSelectArgs<ArgT, SelT, ATy> {
    fn from(_: Skip) -> Self {
        Self::Skip
    }
}

impl<ArgT, ATy> From<Args<ArgT>> for ScalarSelectArgs<ArgT, ATy>
where
    ArgT: Serialize,
{
    fn from(Args(args): Args<ArgT>) -> Self {
        Self::Get(NodeArgsErased::Inline(to_json_value(args)), PhantomData)
    }
}

impl<SelT, ATy> From<Select<SelT>> for CompositeSelect<SelT, ATy>
where
    SelT: Into<CompositeSelection>,
{
    fn from(Select(selection): Select<SelT>) -> Self {
        Self::Get(selection.into(), PhantomData)
    }
}

impl<ArgT, SelT, ATy> From<ArgSelect<ArgT, SelT>> for CompositeSelectArgs<ArgT, SelT, ATy>
where
    ArgT: Serialize,
    SelT: Into<CompositeSelection>,
{
    fn from(ArgSelect(args, selection): ArgSelect<ArgT, SelT>) -> Self {
        Self::Get(
            NodeArgsErased::Inline(to_json_value(args)),
            selection.into(),
            PhantomData,
        )
    }
}

impl<ArgT, ATy> From<PlaceholderArg<ArgT>> for ScalarSelectArgs<ArgT, ATy> {
    fn from(value: PlaceholderArg<ArgT>) -> Self {
        Self::Get(NodeArgsErased::Placeholder(value.value), PhantomData)
    }
}
impl<ArgT, SelT, ATy> From<PlaceholderArgSelect<ArgT, SelT>>
    for CompositeSelectArgs<ArgT, SelT, ATy>
where
    SelT: Into<CompositeSelection>,
{
    fn from(value: PlaceholderArgSelect<ArgT, SelT>) -> Self {
        Self::Get(
            NodeArgsErased::Placeholder(value.value),
            value.selection.into(),
            PhantomData,
        )
    }
}

// --- ToAliasSelection impls --- //

/// This is a marker trait that allows the core selection types
/// like CompositeSelectNoArgs to mark which types can be used
/// as their aliasing nodes. This prevents usage of invalid selections
/// on aliases like [`Skip`].
pub trait FromAliasSelection<T> {}

impl FromAliasSelection<Get> for ScalarSelect<HasAlias> {}
impl<ArgT> FromAliasSelection<Args<ArgT>> for ScalarSelectArgs<ArgT, HasAlias> {}
impl<SelT> FromAliasSelection<Select<SelT>> for CompositeSelect<SelT, HasAlias> {}
impl<ArgT, SelT> FromAliasSelection<ArgSelect<ArgT, SelT>>
    for CompositeSelectArgs<ArgT, SelT, HasAlias>
{
}

// --- From Alias impls --- //

impl From<Alias<(), ScalarSelect<HasAlias>>> for ScalarSelect<HasAlias> {
    fn from(Alias(info): Alias<(), ScalarSelect<HasAlias>>) -> Self {
        Self::Alias(AliasInfo {
            aliases: info.aliases,
            _phantom: PhantomData,
        })
    }
}
impl<ArgT> From<Alias<ArgT, ()>> for ScalarSelectArgs<ArgT, HasAlias> {
    fn from(Alias(info): Alias<ArgT, ()>) -> Self {
        Self::Alias(info)
    }
}
impl<SelT> From<Alias<(), SelT>> for CompositeSelect<SelT, HasAlias> {
    fn from(Alias(info): Alias<(), SelT>) -> Self {
        Self::Alias(info)
    }
}
impl<ArgT, SelT> From<Alias<ArgT, SelT>> for CompositeSelectArgs<ArgT, SelT, HasAlias> {
    fn from(Alias(info): Alias<ArgT, SelT>) -> Self {
        Self::Alias(info)
    }
}

// --- Into SelectionErased impls --- //

impl<ArgT, SelT, ATy> From<AliasInfo<ArgT, SelT, ATy>> for SelectionErased {
    fn from(value: AliasInfo<ArgT, SelT, ATy>) -> SelectionErased {
        SelectionErased::Alias(value.aliases)
    }
}

impl<ATy> From<ScalarSelect<ATy>> for SelectionErased {
    fn from(value: ScalarSelect<ATy>) -> SelectionErased {
        use ScalarSelect::*;
        match value {
            Get => SelectionErased::Scalar,
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<ArgT, ATy> From<ScalarSelectArgs<ArgT, ATy>> for SelectionErased {
    fn from(value: ScalarSelectArgs<ArgT, ATy>) -> SelectionErased {
        use ScalarSelectArgs::*;
        match value {
            Get(arg, _) => SelectionErased::ScalarArgs(arg),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<SelT, ATy> From<CompositeSelect<SelT, ATy>> for SelectionErased {
    fn from(value: CompositeSelect<SelT, ATy>) -> SelectionErased {
        use CompositeSelect::*;
        match value {
            Get(selection, _) => SelectionErased::Composite(selection),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

impl<ArgT, SelT, ATy> From<CompositeSelectArgs<ArgT, SelT, ATy>> for SelectionErased
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(value: CompositeSelectArgs<ArgT, SelT, ATy>) -> SelectionErased {
        use CompositeSelectArgs::*;
        match value {
            Get(args, selection, _) => SelectionErased::CompositeArgs(args, selection),
            Skip => SelectionErased::None,
            Alias(alias) => alias.into(),
        }
    }
}

// --- UnionMember impls --- //

/// The following trait is used for types that implement
/// selections for the composite members of unions.
///
/// The err return value indicates the case where
/// aliases are used selections on members which is an error
///
/// This state is currently impossible to arrive at since
/// AliasInfo has no public construction methods with NoAlias
/// set. Union selection types make sure all their immediate
/// member selection use NoAlias to prevent this invalid stat.e
pub trait UnionMember {
    fn composite(self) -> Option<SelectionErasedMap>;
}

/// Internal marker trait use to make sure we can't have union members
/// selection being another union selection.
// FIXME: I don't remember why I added this abstraction
// I think it was breaking the generated graphql but
// seems to be gone now
pub trait NotUnionSelection {}

// NOTE: UnionMembers are all NoAlias
impl UnionMember for ScalarSelect<NoAlias> {
    fn composite(self) -> Option<SelectionErasedMap> {
        None
    }
}

impl<ArgT> UnionMember for ScalarSelectArgs<ArgT, NoAlias> {
    fn composite(self) -> Option<SelectionErasedMap> {
        None
    }
}

impl<SelT> UnionMember for CompositeSelect<SelT, NoAlias>
// where
//     SelT: NotUnionSelection,
{
    fn composite(self) -> Option<SelectionErasedMap> {
        use CompositeSelect::*;
        match self {
            Get(CompositeSelection::Atomic(selection), _) => Some(selection),
            Skip => None,
            Get(CompositeSelection::Union(_), _) => {
                unreachable!("union selection on union member selection. how??")
            }
            Alias(_) => unreachable!("alias discovored on union/either member. how??"),
        }
    }
}

impl<ArgT, SelT, NoAlias> UnionMember for CompositeSelectArgs<ArgT, SelT, NoAlias>
// where
//     SelT: NotUnionSelection,
{
    fn composite(self) -> Option<SelectionErasedMap> {
        use CompositeSelectArgs::*;
        match self {
            Get(_args, CompositeSelection::Atomic(selection), _) => Some(selection),
            Skip => None,
            Get(_args, CompositeSelection::Union(_), _) => {
                unreachable!("union selection on union member selection. how??")
            }
            Alias(_) => unreachable!("alias discovored on union/either member. how??"),
        }
    }
}

// --- Into AliasSelection impls --- //

impl From<Get> for AliasSelection {
    fn from(_val: Get) -> Self {
        AliasSelection::Scalar
    }
}
impl<ArgT> From<Args<ArgT>> for AliasSelection
where
    ArgT: Serialize,
{
    fn from(val: Args<ArgT>) -> Self {
        AliasSelection::ScalarArgs(NodeArgsErased::Inline(to_json_value(val.0)))
    }
}
impl<SelT> From<Select<SelT>> for AliasSelection
where
    SelT: Into<CompositeSelection>,
{
    fn from(val: Select<SelT>) -> Self {
        let map = val.0.into();
        AliasSelection::Composite(map)
    }
}

impl<ArgT, SelT> From<ArgSelect<ArgT, SelT>> for AliasSelection
where
    ArgT: Serialize,
    SelT: Into<CompositeSelection>,
{
    fn from(val: ArgSelect<ArgT, SelT>) -> Self {
        let map = val.1.into();
        AliasSelection::CompositeArgs(NodeArgsErased::Inline(to_json_value(val.0)), map)
    }
}
impl<ATy> From<ScalarSelect<ATy>> for AliasSelection {
    fn from(val: ScalarSelect<ATy>) -> Self {
        use ScalarSelect::*;
        match val {
            Get => AliasSelection::Scalar,
            _ => unreachable!(),
        }
    }
}
impl<ArgT, ATy> From<ScalarSelectArgs<ArgT, ATy>> for AliasSelection {
    fn from(val: ScalarSelectArgs<ArgT, ATy>) -> Self {
        use ScalarSelectArgs::*;
        match val {
            Get(args, _) => AliasSelection::ScalarArgs(args),
            _ => unreachable!(),
        }
    }
}

impl<SelT, ATy> From<CompositeSelect<SelT, ATy>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: CompositeSelect<SelT, ATy>) -> Self {
        use CompositeSelect::*;
        match val {
            Get(select, _) => AliasSelection::Composite(select),
            _ => unreachable!(),
        }
    }
}
impl<ArgT, SelT, ATy> From<CompositeSelectArgs<ArgT, SelT, ATy>> for AliasSelection
where
    SelT: Into<SelectionErasedMap>,
{
    fn from(val: CompositeSelectArgs<ArgT, SelT, ATy>) -> Self {
        use CompositeSelectArgs::*;
        match val {
            Get(args, selection, _) => AliasSelection::CompositeArgs(args, selection),
            _ => unreachable!(),
        }
    }
}

// TODO(Natoandro): convert to proc_macro
// REPLY(Yohe): compile time hits might be a good reason to keep this macro
#[macro_export]
macro_rules! impl_selection_traits {
    ($ty:ident,$($field:tt),+) => {
        impl<ATy> From<$ty<ATy>> for CompositeSelection {
            fn from(value: $ty<ATy>) -> CompositeSelection {
                CompositeSelection::Atomic(SelectionErasedMap(
                    [
                        $((stringify!($field).into(), value.$field.into()),)+
                    ]
                    .into(),
                ))
            }
        }

        impl<ATy> Selection for $ty<ATy> {
            fn all() -> Self {
                Self {
                    $($field: all(),)+
                }
            }
        }

        impl<ATy> NotUnionSelection for $ty<ATy> {}
    };
}
#[macro_export]
macro_rules! impl_union_selection_traits {
    ($ty:ident) => {
        impl<ATy> From<$ty<ATy>> for CompositeSelection {
            fn from(value: $ty<ATy>) -> CompositeSelection {
                CompositeSelection::Union(Default::default())
            }
        }
    };
    ($ty:ident,$(($variant_ty:tt, $field:tt)),+) => {
        impl<ATy> From<$ty<ATy>> for CompositeSelection {
            fn from(value: $ty<ATy>) -> CompositeSelection {
                CompositeSelection::Union(
                    [
                        $({
                            let selection =
                                UnionMember::composite(value.$field);
                            selection.map(|val| ($variant_ty.into(), val))
                        },)+
                    ]
                    .into_iter()
                    .filter_map(|val| val)
                    .collect(),
                )
            }
        }

        impl<ATy> Selection for $ty<ATy> {
            fn all() -> Self {
                Self {
                    $($field: all(),)+
                }
            }
        }
    };
}
