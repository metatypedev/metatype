// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod policies;
pub mod runtimes;
pub mod types;
pub mod utils;

mod conversion;
mod errors;
mod global_store;
mod logger;
mod params;
mod t;
mod typedef;
mod typegraph;
mod validation;

#[cfg(test)]
mod test_utils;

pub use errors::{Result, TgError};
pub use typegraph::{init, serialize, set_seed};

use self::{
    params::apply,
    types::{
        core::{TransformData, TypeId as CoreTypeId},
        PolicySpec,
    },
};

pub fn get_transform_data(
    resolver_input: CoreTypeId,
    transform_tree: String,
) -> Result<TransformData> {
    apply::build_transform_data(
        resolver_input.into(),
        &serde_json::from_str(&transform_tree).map_err(|e| -> TgError {
            format!("Error while parsing transform tree: {e:?}").into()
        })?,
    )
}

pub fn expose(
    fns: Vec<(String, CoreTypeId)>,
    default_policy: Option<Vec<PolicySpec>>,
) -> Result<()> {
    typegraph::expose(
        fns.into_iter().map(|(k, ty)| (k, ty.into())).collect(),
        default_policy,
    )
}

#[cfg(test)]
mod tests {
    use crate as typegraph;

    use crate::{
        errors::{self, Result},
        global_store::Store,
        runtimes::deno::register_deno_func,
        t::{self, TypeBuilder},
        test_utils::setup,
    };

    use crate::types::core::{
        Cors, MigrationAction, PrismaMigrationConfig, SerializeParams, TypegraphInitParams,
    };

    use crate::types::runtimes::{Effect, MaterializerDenoFunc};

    impl Default for TypegraphInitParams {
        fn default() -> Self {
            Self {
                name: "".to_string(),
                dynamic: None,
                path: ".".to_string(),
                prefix: None,
                cors: Cors {
                    allow_origin: vec![],
                    allow_headers: vec![],
                    expose_headers: vec![],
                    allow_methods: vec![],
                    allow_credentials: false,
                    max_age_sec: None,
                },
                rate: None,
            }
        }
    }

    impl Default for SerializeParams {
        fn default() -> Self {
            Self {
                typegraph_path: "some/dummy/path".to_string(),
                prefix: None,
                artifact_resolution: false,
                codegen: false,
                pretty: true,
                prisma_migration: PrismaMigrationConfig {
                    migrations_dir: "".to_string(),
                    migration_actions: vec![],
                    default_migration_action: MigrationAction {
                        apply: false,
                        create: false,
                        reset: false,
                    },
                },
            }
        }
    }

    #[test]
    fn test_integer_invalid_max() {
        let res = t::integer().min(12).max(10).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = t::integer().x_min(12).x_max(12).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_number_invalid_max() {
        let res = t::float().min(12.34).max(12.3399).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
        let res = t::float().x_min(12.34).x_max(12.34).build();
        assert_eq!(res, Err(errors::invalid_max_value()));
    }

    #[test]
    fn test_struct_duplicate_key() -> Result<()> {
        let res = t::struct_()
            .prop("one", t::integer().build()?)
            .prop("two", t::integer().build()?)
            .prop("one", t::integer().build()?)
            .build();
        assert_eq!(res, Err(errors::duplicate_key("one")));
        Ok(())
    }

    #[test]
    fn test_invalid_input_type() -> Result<()> {
        let mat = register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;
        let inp = t::integer().build()?;
        let res = t::func(inp, t::integer().build()?, mat);

        assert_eq!(res, Err(errors::invalid_input_type(&inp.repr()?)),);
        Ok(())
    }

    #[test]
    fn test_nested_typegraph_context() -> Result<()> {
        Store::reset();
        setup(Some("test-1"))?;
        assert_eq!(
            crate::test_utils::setup(Some("test-2")),
            Err(errors::nested_typegraph_context("test-1"))
        );
        typegraph::serialize(Default::default())?;
        Ok(())
    }

    #[test]
    fn test_no_active_context() -> Result<()> {
        Store::reset();
        assert_eq!(
            typegraph::expose(vec![], None),
            Err(errors::expected_typegraph_context())
        );

        assert!(
            matches!(typegraph::serialize(Default::default()), Err(e) if e == errors::expected_typegraph_context())
        );

        Ok(())
    }

    #[test]
    fn test_expose_invalid_type() -> Result<()> {
        Store::reset();
        setup(None)?;
        let tpe = t::integer().build()?;
        let res = typegraph::expose(vec![("one".to_string(), tpe.into())], None);

        assert_eq!(res, Err(errors::invalid_export_type("one", &tpe.repr()?,)));

        Ok(())
    }

    #[test]
    fn test_expose_invalid_name() -> Result<()> {
        setup(None)?;

        let mat = register_deno_func(
            MaterializerDenoFunc::with_code("() => 12"),
            Effect::default(),
        )?;

        let res = typegraph::expose(
            vec![(
                "".to_string(),
                t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
            )],
            None,
        );
        assert_eq!(res, Err(errors::invalid_export_name("")));

        let res = typegraph::expose(
            vec![(
                "hello_world!".to_string(),
                t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
            )],
            None,
        );
        assert_eq!(res, Err(errors::invalid_export_name("hello_world!")));

        Ok(())
    }

    #[test]
    fn test_expose_duplicate() -> Result<()> {
        setup(None)?;

        let mat = register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;

        let res = typegraph::expose(
            vec![
                (
                    "one".to_string(),
                    t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
                ),
                (
                    "one".to_string(),
                    t::func(t::struct_().build()?, t::integer().build()?, mat)?.into(),
                ),
            ],
            None,
        );
        assert_eq!(res, Err(errors::duplicate_export_name("one")));

        Ok(())
    }

    #[test]
    fn test_successful_serialization() -> Result<()> {
        Store::reset();
        let a = t::integer().build()?;
        let b = t::integer().min(12).max(44).build()?;
        // -- optional(list(float))
        let num_idx = t::float().build()?;
        let list_idx = t::list(num_idx).build()?;
        let c = t::optional(list_idx).build()?;
        // --

        let s = t::struct_()
            .prop("one", a)
            .prop("two", b)
            .prop("three", c)
            .build()?;

        setup(None)?;
        let mat = register_deno_func(MaterializerDenoFunc::with_code("() => 12"), Effect::Read)?;
        typegraph::expose(vec![("one".to_string(), t::func(s, b, mat)?.into())], None)?;
        let typegraph = typegraph::serialize(Default::default())?;
        insta::assert_snapshot!(typegraph.0);
        Ok(())
    }
}
