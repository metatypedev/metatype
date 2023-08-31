use crate::wit::runtimes::{self as wit};

#[derive(Debug)]
pub enum PythonMaterializer {
    Lambda(wit::MaterializerPythonLambda),
    Def(wit::MaterializerPythonDef),
    Module(wit::MaterializerPythonModule),
    Import(wit::MaterializerPythonImport),
}
