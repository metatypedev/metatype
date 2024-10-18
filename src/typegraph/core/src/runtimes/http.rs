use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::{MaterializerId, RuntimeId},
        runtimes::{BaseMaterializer, HttpRuntimeData, MaterializerHttpRequest},
    },
};

use super::{Materializer, Runtime};

pub fn register_http_runtime(data: HttpRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::Http(data.into())))
}

pub fn http_request(
    base: BaseMaterializer,
    data: MaterializerHttpRequest,
) -> Result<MaterializerId> {
    let mat = Materializer::http(base.runtime, data, base.effect);
    Ok(Store::register_materializer(mat))
}
