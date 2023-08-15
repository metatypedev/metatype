use crate::wit::runtimes::{self as wit};

#[derive(Debug)]
pub enum GraphqlMaterializer {
    Query(wit::MaterializerGraphqlQuery),
    Mutation(wit::MaterializerGraphqlQuery),
}
