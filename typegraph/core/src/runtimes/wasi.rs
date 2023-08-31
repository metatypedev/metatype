use crate::wit::runtimes as wit;

#[derive(Debug)]
pub enum WasiMaterializer {
    Module(wit::MaterializerWasi),
}
