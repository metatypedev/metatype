use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Error {
    pub stack: Vec<String>,
}

pub type TypeId = u32;

pub type RuntimeId = u32;

pub type MaterializerId = u32;

pub type PolicyId = u32;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub allow_methods: Vec<String>,
    pub allow_credentials: bool,
    pub max_age_sec: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypegraphInitParams {
    pub name: String,
    pub dynamic: Option<bool>,
    pub path: String,
    pub prefix: Option<String>,
    pub cors: Cors,
    pub rate: Option<Rate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Artifact {
    pub path: String,
    pub hash: String,
    pub size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationAction {
    pub apply: bool,
    pub create: bool,
    pub reset: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrismaMigrationConfig {
    pub migrations_dir: String,
    pub migration_actions: Vec<(String, MigrationAction)>,
    pub default_migration_action: MigrationAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializeParams {
    pub typegraph_path: String,
    pub prefix: Option<String>,
    pub artifact_resolution: bool,
    pub codegen: bool,
    pub prisma_migration: PrismaMigrationConfig,
    pub pretty: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeProxy {
    pub name: String,
    pub extras: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeInteger {
    pub min: Option<i32>,
    pub max: Option<i32>,
    pub exclusive_minimum: Option<i32>,
    pub exclusive_maximum: Option<i32>,
    pub multiple_of: Option<i32>,
    pub enumeration: Option<Vec<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeFloat {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub exclusive_minimum: Option<f64>,
    pub exclusive_maximum: Option<f64>,
    pub multiple_of: Option<f64>,
    pub enumeration: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeString {
    pub max: Option<u32>,
    pub min: Option<u32>,
    pub format: Option<String>,
    pub pattern: Option<String>,
    pub enumeration: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeFile {
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub allow: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeList {
    pub of: TypeId,
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub unique_items: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeOptional {
    pub of: TypeId,
    pub default_item: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeUnion {
    pub variants: Vec<TypeId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeEither {
    pub variants: Vec<TypeId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeStruct {
    pub props: Vec<(String, TypeId)>,
    pub additional_props: bool,
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub enumeration: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ValueSource {
    Raw(String),
    Context(String),
    Secret(String),
    Parent(String),
    Param(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterTransform {
    pub resolver_input: TypeId,
    pub transform_tree: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeFunc {
    pub inp: TypeId,
    pub parameter_transform: Option<ParameterTransform>,
    pub out: TypeId,
    pub mat: MaterializerId,
    pub rate_calls: bool,
    pub rate_weight: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformData {
    pub query_input: TypeId,
    pub parameter_transform: ParameterTransform,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    pub name: String,
    pub materializer: MaterializerId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyPerEffect {
    pub read: Option<PolicyId>,
    pub create: Option<PolicyId>,
    pub update: Option<PolicyId>,
    pub delete: Option<PolicyId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PolicySpec {
    Simple(PolicyId),
    PerEffect(PolicyPerEffect),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContextCheck {
    NotNull,
    Value(String),
    Pattern(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuncParams {
    pub inp: TypeId,
    pub out: TypeId,
    pub mat: MaterializerId,
}

pub trait Handler {
    fn init_typegraph(params: TypegraphInitParams) -> Result<(), super::Error>;
    fn serialize_typegraph(params: SerializeParams) -> Result<(String, Vec<Artifact>), super::Error>;
    fn with_injection(type_id: TypeId, injection: String) -> Result<TypeId, super::Error>;
    fn with_config(type_id: TypeId, config: String) -> Result<TypeId, super::Error>;
    fn refb(name: String, attributes: Option<String>) -> Result<TypeId, super::Error>;
    fn floatb(data: TypeFloat) -> Result<TypeId, super::Error>;
    fn integerb(data: TypeInteger) -> Result<TypeId, super::Error>;
    fn booleanb() -> Result<TypeId, super::Error>;
    fn stringb(data: TypeString) -> Result<TypeId, super::Error>;
    fn as_id(id: TypeId, composite: bool) -> Result<TypeId, super::Error>;
    fn fileb(data: TypeFile) -> Result<TypeId, super::Error>;
    fn listb(data: TypeList) -> Result<TypeId, super::Error>;
    fn optionalb(data: TypeOptional) -> Result<TypeId, super::Error>;
    fn unionb(data: TypeUnion) -> Result<TypeId, super::Error>;
    fn eitherb(data: TypeEither) -> Result<TypeId, super::Error>;
    fn structb(data: TypeStruct) -> Result<TypeId, super::Error>;
    fn extend_struct(tpe: TypeId, props: Vec<(String, TypeId)>) -> Result<TypeId, super::Error>;
    fn get_type_repr(id: TypeId) -> Result<String, super::Error>;
    fn funcb(data: TypeFunc) -> Result<TypeId, super::Error>;
    fn get_transform_data(resolver_input: TypeId, transform_tree: String) -> Result<TransformData, super::Error>;
    fn register_policy(pol: Policy) -> Result<PolicyId, super::Error>;
    fn with_policy(type_id: TypeId, policy_chain: Vec<PolicySpec>) -> Result<TypeId, super::Error>;
    fn get_public_policy() -> Result<(PolicyId, String), super::Error>;
    fn get_internal_policy() -> Result<(PolicyId, String), super::Error>;
    fn register_context_policy(key: String, check: ContextCheck) -> Result<(PolicyId, String), super::Error>;
    fn rename_type(tpe: TypeId, new_name: String) -> Result<TypeId, super::Error>;
    fn expose(fns: Vec<(String, TypeId)>, default_policy: Option<Vec<PolicySpec>>) -> Result<(), super::Error>;
    fn set_seed(seed: Option<u32>) -> Result<(), super::Error>;
}