#[derive(Debug, Clone)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub allow_methods: Vec<String>,
    pub allow_credentials: bool,
    pub max_age_sec: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

#[derive(Debug, Clone)]
pub struct TypegraphInitParams {
    pub name: String,
    pub dynamic: Option<bool>,
    pub path: String,
    // TypeMeta
    pub prefix: Option<String>,
    pub cors: Cors,
    pub rate: Option<Rate>,
}

#[derive(Debug, Clone)]
pub struct Artifact {
    pub path: String,
    pub hash: String,
    pub size: u32,
}

#[derive(Debug, Clone, Copy)]
pub struct MigrationAction {
    pub apply: bool,
    pub create: bool,
    pub reset: bool,
}

#[derive(Debug, Clone)]
pub struct PrismaMigrationConfig {
    pub migrations_dir: String,
    pub migration_actions: Vec<(String, MigrationAction)>,
    pub default_migration_action: MigrationAction,
}

#[derive(Debug, Clone)]
pub struct SerializeParams {
    pub typegraph_path: String,
    pub prefix: Option<String>,
    pub artifact_resolution: bool,
    pub codegen: bool,
    pub prisma_migration: PrismaMigrationConfig,
    pub pretty: bool,
}

pub type TypeId = u32;

#[derive(Debug, Clone, Default)]
pub struct TypeBase {
    pub name: Option<String>,
    // String => json String
    pub runtime_config: Option<Vec<(String, String)>>,
}

#[derive(Debug, Clone)]
pub struct TypeProxy {
    pub name: String,
    pub extras: Vec<(String, String)>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeInteger {
    pub min: Option<i32>,
    pub max: Option<i32>,
    pub exclusive_minimum: Option<i32>,
    pub exclusive_maximum: Option<i32>,
    pub multiple_of: Option<i32>,
    pub enumeration: Option<Vec<i32>>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeFloat {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub exclusive_minimum: Option<f64>,
    pub exclusive_maximum: Option<f64>,
    pub multiple_of: Option<f64>,
    pub enumeration: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeString {
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub format: Option<String>,
    pub pattern: Option<String>,
    pub enumeration: Option<Vec<String>>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeFile {
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub allow: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct TypeList {
    pub of: TypeId,
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub unique_items: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct TypeOptional {
    pub of: TypeId,
    pub default_item: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeUnion {
    pub variants: Vec<TypeId>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeEither {
    pub variants: Vec<TypeId>,
}

#[derive(Debug, Clone, Default)]
pub struct TypeStruct {
    pub props: Vec<(String, TypeId)>,
    pub additional_props: bool,
    pub min: Option<u32>,
    pub max: Option<u32>,
    pub enumeration: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub enum ValueSource {
    Raw(String),     // json
    Context(String), // key
    Secret(String),  // key
    Parent(String),  // name
    Param(String),   // name
}

#[derive(Debug, Clone)]
pub struct ParameterTransform {
    pub resolver_input: TypeId,
    pub transform_tree: String,
}

#[derive(Debug, Clone)]
pub struct TypeFunc {
    pub inp: TypeId,
    pub parameter_transform: Option<ParameterTransform>,
    pub out: TypeId,
    pub mat: MaterializerId,
    pub rate_calls: bool,
    pub rate_weight: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct TransformData {
    pub query_input: TypeId,
    pub parameter_transform: ParameterTransform,
}

pub type PolicyId = u32;

#[derive(Debug, Clone)]
pub struct Policy {
    pub name: String,
    pub materializer: MaterializerId,
}

#[derive(Debug, Clone)]
pub struct PolicyPerEffect {
    pub read: Option<PolicyId>,
    pub create: Option<PolicyId>,
    pub update: Option<PolicyId>,
    pub delete: Option<PolicyId>,
}

#[derive(Debug, Clone)]
pub enum PolicySpec {
    Simple(PolicyId),
    PerEffect(PolicyPerEffect),
}

#[derive(Debug, Clone)]
pub enum ContextCheck {
    NotNull,
    Value(String),
    Pattern(String),
}

pub type RuntimeId = u32;
pub type MaterializerId = u32;

#[derive(Debug, Clone)]
pub struct FuncParams {
    pub inp: TypeId,
    pub out: TypeId,
    pub mat: MaterializerId,
}
