use crate::wit::runtimes as wit;

#[derive(Debug)]
pub enum RandomMaterializer {
    Runtime(wit::MaterializerRandom),
}
