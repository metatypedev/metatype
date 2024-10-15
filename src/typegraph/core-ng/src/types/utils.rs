#[derive(Debug, Clone)]
pub struct ReduceValue {
    pub inherit: bool,
    // json String
    pub payload: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ReducePath {
    pub path: Vec<String>,
    pub value: ReduceValue,
}

#[derive(Debug, Clone)]
pub struct Reduce {
    pub paths: Vec<ReducePath>,
}

#[derive(Debug, Clone)]
pub enum AuthProtocol {
    Oauth2,
    Jwt,
    Basic,
}

#[derive(Debug, Clone)]
pub struct Auth {
    pub name: String,
    pub protocol: AuthProtocol,
    // String => json String
    pub auth_data: Vec<(String, String)>,
}

#[derive(Debug, Clone)]
pub struct QueryDeployParams {
    pub tg: String,
    pub secrets: Option<Vec<(String, String)>>,
}

#[derive(Debug, Clone)]
pub struct FdkConfig {
    pub workspace_path: String,
    pub target_name: String,
    pub config_json: String,
    pub tg_json: String,
}

#[derive(Debug, Clone)]
pub struct FdkOutput {
    pub path: String,
    pub content: String,
    pub overwrite: bool,
}
