// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use thiserror::Error;

#[derive(Error, Debug)]
pub enum RuntimeError {
    #[error("fatal error in {runtime}: {}", source)]
    _Fatal {
        source: anyhow::Error,
        runtime: String,
    },
    #[error("tolerable error in {runtime}: {}", source)]
    Tolerable {
        source: anyhow::Error,
        runtime: String,
    },
}
