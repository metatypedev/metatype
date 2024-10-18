use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::{
    types::{builders, core::*},
    Result,
};

use super::{SerializeChain, TypegraphFunc};

#[rustfmt::skip]
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum CoreCall {
    InitTypegraph(TypegraphInitParams),
    SerializeTypegraph (SerializeParams),
    WithInjection { type_id: TypeId, injection: String },
    Refb { name: String, attributes: Option<String> },
    Integerb { data: TypeInteger, base: TypeBase },
    Floatb { data: TypeFloat, base: TypeBase },
    Booleanb { base: TypeBase },
    Stringb { data: TypeString, base: TypeBase },
    Fileb { data: TypeFile, base: TypeBase },
    Listb { data: TypeList, base: TypeBase },
    Optionalb { data: TypeOptional, base: TypeBase },
    Unionb { data: TypeUnion, base: TypeBase },
    Eitherb { data: TypeEither, base: TypeBase },
    Strucutb { data: TypeStruct, base: TypeBase },
    Funcb { data: TypeFunc },
    ExtendStruct { type_id: TypeId, props: Vec<(String, Vec<TypeId>)> },
    AsId { type_id: TypeId, composite: bool },
    GetTypeRepr { type_id: TypeId },
    GetTransformData { resolver_input: TypeId, transfrom_type: String },
    RegisterPolicy { policy: Policy },
    RegisterContextPolicy { key: String, check: ContextCheck },
    WithPolicy { type_id: TypeId, policy_chain: Vec<PolicySpec> },
    GetPublicPolicy,
    GetInternalPolicy,
    RenameType { type_id: TypeId, new_name: String },
    Expose { fns: Vec<(String, TypeId)>, default_policy: Option<Vec<PolicySpec>> },
    SetSeed { seed: Option<u32> },
}

impl TypegraphFunc for CoreCall {
    fn execute(self) -> Result<Value> {
        todo!()
    }
}
