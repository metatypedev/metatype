// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod subgraph;
pub mod type_def;
pub mod type_id;
pub mod type_ref;

pub use type_def::*;
pub use type_id::*;
pub use type_ref::*;

pub mod core {
    pub use crate::wit::core::{
        Artifact, ContextCheck, Cors, Error, FuncParams, MaterializerId, MigrationAction,
        ParameterTransform, Policy, PolicyId, PolicyPerEffect, PolicySpec, PrismaMigrationConfig,
        Rate, RuntimeId, SerializeParams, TypeId, TypegraphInitParams,
    };
}

pub mod runtimes {
    pub use crate::wit::runtimes::{
        BaseMaterializer, Effect, GraphqlRuntimeData, HttpMethod, HttpRuntimeData, KvMaterializer,
        KvRuntimeData, MaterializerDenoFunc, MaterializerDenoImport, MaterializerDenoPredefined,
        MaterializerDenoStatic, MaterializerGraphqlQuery, MaterializerHttpRequest,
        MaterializerPythonDef, MaterializerPythonImport, MaterializerPythonLambda,
        MaterializerPythonModule, MaterializerRandom, MaterializerWasmReflectedFunc,
        MaterializerWasmWireHandler, PrismaLinkData, PrismaMigrationOperation, PrismaRuntimeData,
        RandomRuntimeData, SubstantialOperationData, SubstantialOperationType,
        SubstantialRuntimeData, TemporalOperationData, TemporalOperationType, TemporalRuntimeData,
        TypegateOperation, TypegraphOperation, WasmRuntimeData, Workflow, WorkflowKind,
    };
}

pub mod aws {
    pub use crate::wit::aws::{S3PresignGetParams, S3PresignPutParams, S3RuntimeData};
}

pub mod utils {
    pub use crate::wit::utils::{
        Auth, AuthProtocol, MdkConfig, MdkOutput, QueryDeployParams, Reduce, ReducePath,
        ReduceValue,
    };
}

#[derive(Clone, Debug)]
pub enum Type {
    Ref(TypeRef),
    Def(TypeDef),
}

impl From<TypeRef> for Type {
    fn from(r: TypeRef) -> Self {
        Self::Ref(r)
    }
}

impl From<TypeDef> for Type {
    fn from(d: TypeDef) -> Self {
        Self::Def(d)
    }
}

impl Type {
    fn name(&self) -> Option<&str> {
        match self {
            Type::Ref(typ) => Some(typ.name.as_str()),
            Type::Def(typ) => typ.name(),
        }
    }

    fn repr(&self) -> String {
        match self {
            Type::Ref(typ) => typ.repr(),
            Type::Def(typ) => typ.repr(),
        }
    }
}
