// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use common::typegraph::{Auth, AuthProtocol};
use indexmap::IndexMap;

use crate::errors::Result;
use crate::global_store::Store;
use crate::runtimes::{DenoMaterializer, Materializer};
use crate::t::TypeBuilder;
use crate::types::TypeId;
use crate::wit::core::{Guest, TypeBase, TypeId as CoreTypeId, TypeStruct, TypeWithInjection};
use crate::wit::runtimes::MaterializerDenoFunc;
use crate::wit::utils::Auth as WitAuth;
use crate::{t, Lib};

mod apply;

fn find_missing_props(
    supertype_id: TypeId,
    new_props: &Vec<(String, u32)>,
) -> Result<Vec<(String, u32)>> {
    let old_props = supertype_id
        .as_struct()?
        .iter_props()
        .map(|(k, v)| (k.to_string(), v))
        .collect::<Vec<_>>();

    let mut missing_props = vec![];
    for (k_old, v_old) in old_props {
        let mut is_missing = true;
        for (k_new, _) in new_props {
            if k_old.eq(k_new) {
                is_missing = false;
                break;
            }
        }
        if is_missing {
            missing_props.push((k_old, v_old.into()));
        }
    }

    Ok(missing_props)
}

struct Oauth2Params {
    name: String,
    authorize_url: String,
    access_url: String,
    scopes: String,
    profile_url: Option<String>,
    profiler: Option<TypeId>,
}

fn gen_oauth2(params: Oauth2Params) -> Auth {
    let mut auth_data = IndexMap::new();

    auth_data.insert(
        "authorize_url".to_string(),
        serde_json::to_value(params.authorize_url).unwrap(),
    );
    auth_data.insert(
        "access_url".to_string(),
        serde_json::to_value(params.access_url).unwrap(),
    );
    auth_data.insert(
        "scopes".to_string(),
        serde_json::to_value(params.scopes).unwrap(),
    );
    auth_data.insert(
        "profile_url".to_string(),
        serde_json::to_value(params.profile_url).unwrap(),
    );
    auth_data.insert(
        "profiler".to_string(),
        params
            .profiler
            .map(|p| p.into())
            .unwrap_or(serde_json::Value::Null),
    );

    Auth {
        name: params.name,
        protocol: AuthProtocol::OAuth2,
        auth_data,
    }
}

impl crate::wit::utils::Guest for crate::Lib {
    fn gen_applyb(supertype_id: CoreTypeId, apply: crate::wit::utils::Apply) -> Result<CoreTypeId> {
        if apply.paths.is_empty() {
            return Err("apply object is empty".into());
        }
        let apply_tree = apply::PathTree::build_from(&apply)?;
        let mut item_list = apply::flatten_to_sorted_items_array(&apply_tree)?;
        let p2c_indices = apply::build_parent_to_child_indices(&item_list);
        // item_list index => (node name, store id)
        let mut idx_to_store_id_cache: HashMap<u32, (String, u32)> = HashMap::new();

        while !item_list.is_empty() {
            let item = match item_list.pop() {
                Some(value) => value,
                None => break,
            };

            if item.node.is_leaf() {
                let path_infos = item.node.path_infos.clone();
                let apply_value = path_infos.value;
                let id = Store::get_type_by_path(supertype_id.into(), &path_infos.path)?.1;

                if apply_value.inherit && apply_value.payload.is_none() {
                    // if inherit and no injection, keep original id
                    idx_to_store_id_cache.insert(item.index, (item.node.name.clone(), id.into()));
                } else {
                    // has injection
                    let payload = apply_value.payload.ok_or(format!(
                        "cannot set undefined value at {:?}",
                        path_infos.path.join(".")
                    ))?;
                    let new_id = Lib::with_injection(TypeWithInjection {
                        tpe: id.into(),
                        injection: payload,
                    })?;

                    idx_to_store_id_cache.insert(item.index, (item.node.name.clone(), new_id));
                }
            } else {
                // parent node => must be a struct
                let child_indices = p2c_indices.get(&item.index).unwrap();
                if child_indices.is_empty() {
                    return Err(format!("parent item at index {} has no child", item.index).into());
                }

                let mut props = vec![];
                for idx in child_indices {
                    // cache must hit
                    let prop = idx_to_store_id_cache.get(idx).ok_or(format!(
                        "store id for item at index {idx} was not yet generated"
                    ))?;
                    props.push(prop.clone());
                }

                if item.parent_index.is_none() {
                    // if root, props g.inherit() should be implicit
                    let missing_props = find_missing_props(supertype_id.into(), &props)?;
                    for pair in missing_props {
                        props.push(pair);
                    }
                }

                let id = Lib::structb(
                    TypeStruct {
                        props,
                        ..Default::default()
                    },
                    TypeBase::default(),
                )?;
                idx_to_store_id_cache.insert(item.index, (item.node.name.clone(), id));
            }
        }

        let (_root_name, root_id) = idx_to_store_id_cache
            .get(&0)
            .ok_or("root type does not have any field".to_string())?;

        Ok(*root_id)
    }

    fn add_graphql_endpoint(graphql: String) -> Result<u32> {
        Store::add_graphql_endpoint(graphql)
    }

    fn add_auth(data: WitAuth) -> Result<u32> {
        Store::add_auth(data)
    }

    fn add_raw_auth(data: String) -> Result<u32> {
        let raw_auth: Auth = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        Store::add_raw_auth(raw_auth)
    }

    fn oauth2_github(scopes: String) -> Result<String> {
        let inp = t::struct_().propx("id", t::integer())?.build()?;
        let out = t::struct_().propx("id", t::integer())?.build()?;
        let deno_mat = DenoMaterializer::Inline(MaterializerDenoFunc {
            code: "(p) => ({id: p.id})".to_string(),
            secrets: vec![],
        });
        let mat = Materializer::deno(deno_mat, crate::wit::runtimes::Effect::Read);
        let func_idx = t::func(inp, out, Store::register_materializer(mat))?;

        let oauth = gen_oauth2(Oauth2Params {
            name: "github".to_string(),
            authorize_url: "https://github.com/login/oauth/authorize".to_string(),
            access_url: "https://github.com/login/oauth/access_token".to_string(),
            scopes,
            // https://docs.github.com/en/rest/reference/users?apiVersion=2022-11-28#get-the-authenticated-user
            profile_url: Some("https://api.github.com/user".to_string()),
            profiler: Some(func_idx),
        });
        Ok(serde_json::to_string(&oauth).map_err(|e| e.to_string())?)
    }
}
