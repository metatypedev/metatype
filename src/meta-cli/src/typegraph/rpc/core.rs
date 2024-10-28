use serde::{Serialize, Deserialize};
use serde_json::Value;
use typegraph_core::{errors::Result, Lib};
use typegraph_core::sdk::core::*;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all="snake_case")]
pub enum RpcCall {
    InitTypegraph { params: TypegraphInitParams },
    SerializeTypegraph { params: SerializeParams },
    WithInjection { type_id: TypeId, injection: String },
    WithConfig { type_id: TypeId, config: String },
    Refb { name: String, attributes: Option<String> },
    Floatb { data: TypeFloat },
    Integerb { data: TypeInteger },
    Booleanb,
    Stringb { data: TypeString },
    AsId { id: TypeId, composite: bool },
    Fileb { data: TypeFile },
    Listb { data: TypeList },
    Optionalb { data: TypeOptional },
    Unionb { data: TypeUnion },
    Eitherb { data: TypeEither },
    Structb { data: TypeStruct },
    ExtendStruct { tpe: TypeId, props: Vec<(String, TypeId)> },
    GetTypeRepr { id: TypeId },
    Funcb { data: TypeFunc },
    GetTransformData { resolver_input: TypeId, transform_tree: String },
    RegisterPolicy { pol: Policy },
    WithPolicy { type_id: TypeId, policy_chain: Vec<PolicySpec> },
    GetPublicPolicy,
    GetInternalPolicy,
    RegisterContextPolicy { key: String, check: ContextCheck },
    RenameType { tpe: TypeId, new_name: String },
    Expose { fns: Vec<(String, TypeId)>, default_policy: Option<Vec<PolicySpec>> },
    SetSeed { seed: Option<u32> },
}

impl super::RpcDispatch for RpcCall {
    fn dispatch(self) -> Result<Value> {
        match self {
            Self::InitTypegraph { params } => Lib::init_typegraph(params).map(|res| serde_json::to_value(res).unwrap()),
            Self::SerializeTypegraph { params } => Lib::serialize_typegraph(params).map(|res| serde_json::to_value(res).unwrap()),
            Self::WithInjection { type_id, injection } => Lib::with_injection(type_id, injection).map(|res| serde_json::to_value(res).unwrap()),
            Self::WithConfig { type_id, config } => Lib::with_config(type_id, config).map(|res| serde_json::to_value(res).unwrap()),
            Self::Refb { name, attributes } => Lib::refb(name, attributes).map(|res| serde_json::to_value(res).unwrap()),
            Self::Floatb { data } => Lib::floatb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Integerb { data } => Lib::integerb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Booleanb => Lib::booleanb().map(|res| serde_json::to_value(res).unwrap()),
            Self::Stringb { data } => Lib::stringb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::AsId { id, composite } => Lib::as_id(id, composite).map(|res| serde_json::to_value(res).unwrap()),
            Self::Fileb { data } => Lib::fileb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Listb { data } => Lib::listb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Optionalb { data } => Lib::optionalb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Unionb { data } => Lib::unionb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Eitherb { data } => Lib::eitherb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::Structb { data } => Lib::structb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::ExtendStruct { tpe, props } => Lib::extend_struct(tpe, props).map(|res| serde_json::to_value(res).unwrap()),
            Self::GetTypeRepr { id } => Lib::get_type_repr(id).map(|res| serde_json::to_value(res).unwrap()),
            Self::Funcb { data } => Lib::funcb(data).map(|res| serde_json::to_value(res).unwrap()),
            Self::GetTransformData { resolver_input, transform_tree } => Lib::get_transform_data(resolver_input, transform_tree).map(|res| serde_json::to_value(res).unwrap()),
            Self::RegisterPolicy { pol } => Lib::register_policy(pol).map(|res| serde_json::to_value(res).unwrap()),
            Self::WithPolicy { type_id, policy_chain } => Lib::with_policy(type_id, policy_chain).map(|res| serde_json::to_value(res).unwrap()),
            Self::GetPublicPolicy => Lib::get_public_policy().map(|res| serde_json::to_value(res).unwrap()),
            Self::GetInternalPolicy => Lib::get_internal_policy().map(|res| serde_json::to_value(res).unwrap()),
            Self::RegisterContextPolicy { key, check } => Lib::register_context_policy(key, check).map(|res| serde_json::to_value(res).unwrap()),
            Self::RenameType { tpe, new_name } => Lib::rename_type(tpe, new_name).map(|res| serde_json::to_value(res).unwrap()),
            Self::Expose { fns, default_policy } => Lib::expose(fns, default_policy).map(|res| serde_json::to_value(res).unwrap()),
            Self::SetSeed { seed } => Lib::set_seed(seed).map(|res| serde_json::to_value(res).unwrap()),
        }
    }
}