// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use common::typegraph::{Auth, AuthProtocol};
use serde_json::json;

use crate::errors::Result;
use crate::global_store::Store;
use crate::types::TypeId;
use crate::wit::core::{Guest, TypeBase, TypeId as CoreTypeId, TypeStruct};
use crate::wit::utils::Auth as WitAuth;
use crate::Lib;

use self::oauth2::std::{named_provider, Oauth2Builder};

mod oauth2;
pub mod reduce;

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

struct Oauth2Params<'a> {
    name: &'a str,
    authorize_url: &'a str,
    access_url: &'a str,
    scopes: &'a str,
    profile_url: Option<&'a str>,
    profiler: Option<TypeId>,
}

impl TryFrom<Oauth2Params<'_>> for String {
    type Error = crate::wit::core::Error;
    fn try_from(value: Oauth2Params) -> Result<Self> {
        let auth_data = json!({
            "authorize_url": serde_json::to_value(value.authorize_url).unwrap(),
            "access_url": serde_json::to_value(value.access_url).unwrap(),
            "scopes": serde_json::to_value(value.scopes).unwrap(),
            "profile_url": serde_json::to_value(value.profile_url).unwrap(),
            "profiler": value
                .profiler
                .map(|p| p.into())
                .unwrap_or(serde_json::Value::Null),
        });

        let ret = serde_json::to_string(&Auth {
            name: value.name.to_string(),
            protocol: AuthProtocol::OAuth2,
            auth_data: serde_json::from_value(auth_data).unwrap(),
        })
        .map_err(|e| e.to_string())?;

        Ok(ret)
    }
}

impl crate::wit::utils::Guest for crate::Lib {
    fn gen_reduceb(
        supertype_id: CoreTypeId,
        reduce: crate::wit::utils::Reduce,
    ) -> Result<CoreTypeId> {
        if reduce.paths.is_empty() {
            return Err("reduce object is empty".into());
        }
        let reduce_tree = reduce::PathTree::build_from(&reduce)?;
        let mut item_list = reduce::flatten_to_sorted_items_array(&reduce_tree)?;
        let p2c_indices = reduce::build_parent_to_child_indices(&item_list);
        // item_list index => (node name, store id)
        let mut idx_to_store_id_cache: HashMap<u32, (String, u32)> = HashMap::new();

        while !item_list.is_empty() {
            let item = match item_list.pop() {
                Some(value) => value,
                None => break,
            };

            if item.node.is_leaf() {
                let path_infos = item.node.path_infos.clone();
                let reduce_value = path_infos.value.clone();
                let id = Store::get_type_by_path(supertype_id.into(), &path_infos.path)?.1;

                if reduce_value.inherit && reduce_value.payload.is_none() {
                    // if inherit and no injection, keep original id
                    idx_to_store_id_cache.insert(item.index, (item.node.name.clone(), id.into()));
                } else {
                    // has injection
                    let payload = reduce_value.payload.ok_or(format!(
                        "cannot set undefined value at {:?}",
                        path_infos.path.join(".")
                    ))?;
                    let new_id = Lib::with_injection(id.into(), payload)?;

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

    fn oauth2(service_name: String, scopes: String) -> Result<String> {
        Oauth2Builder::new(scopes).build(named_provider(&service_name)?)
    }

    fn oauth2_without_profiler(service_name: String, scopes: String) -> Result<String> {
        Oauth2Builder::new(scopes)
            .no_profiler()
            .build(named_provider(&service_name)?)
    }

    fn oauth2_with_extended_profiler(
        service_name: String,
        scopes: String,
        extension: String,
    ) -> Result<String> {
        Oauth2Builder::new(scopes)
            .with_extended_profiler(extension)
            .build(named_provider(&service_name)?)
    }

    fn oauth2_with_custom_profiler(
        service_name: String,
        scopes: String,
        profiler: CoreTypeId,
    ) -> Result<String> {
        Oauth2Builder::new(scopes)
            .with_profiler(profiler.into())
            .build(named_provider(&service_name)?)
    }
}
