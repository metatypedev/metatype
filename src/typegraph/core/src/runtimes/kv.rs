use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::{MaterializerId, RuntimeId},
        runtimes::{BaseMaterializer, KvMaterializer, KvRuntimeData},
    },
};

use super::{Materializer, Runtime};

pub fn register_kv_runtime(data: KvRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::Kv(data.into())))
}

pub fn kv_operation(base: BaseMaterializer, data: KvMaterializer) -> Result<MaterializerId> {
    let mat = Materializer::kv(base.runtime, data, base.effect);
    Ok(Store::register_materializer(mat))
}
