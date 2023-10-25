// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use common::typegraph::{Auth, AuthProtocol};
use serde_json::json;

use crate::errors::Result;
use crate::global_store::Store;
use crate::runtimes::{DenoMaterializer, Materializer};
use crate::t::TypeBuilder;
use crate::types::TypeId;
use crate::wit::core::{Guest, TypeBase, TypeId as CoreTypeId, TypeStruct, TypeWithInjection};
use crate::wit::runtimes::MaterializerDenoFunc;
use crate::wit::utils::Auth as WitAuth;
use crate::{t, Lib};

pub mod apply;

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

macro_rules! gen_profiler_func {
    ($inp:expr, $out: expr, $profiler:expr) => {{
        let deno_mat = DenoMaterializer::Inline(MaterializerDenoFunc {
            code: $profiler.to_string(),
            secrets: vec![],
        });
        let mat = Materializer::deno(deno_mat, crate::wit::runtimes::Effect::Read);
        t::func($inp, $out, Store::register_materializer(mat))
    }};
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
                let apply_value = path_infos.value.clone();
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

    fn oauth2(service_name: String, scopes: String) -> Result<String> {
        let (name, scopes) = (service_name.as_ref(), scopes.as_ref());
        match name {
            "digitalocean" => {
                let mut account = t::struct_();
                let inp = t::struct_()
                    .propx("account", account.propx("uuid", t::string())?)?
                    .build()?;
                let out = t::struct_().propx("id", t::integer())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.account.uuid})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://cloud.digitalocean.com/v1/oauth/authorize",
                    access_url: "https://cloud.digitalocean.com/v1/oauth/token",
                    // https://docs.digitalocean.com/reference/api/api-reference/#operation/account_get
                    scopes,
                    profile_url: Some("https://api.digitalocean.com/v2/account"),
                    profiler: Some(func),
                })
            }
            "discord" => {
                let inp = t::struct_().propx("id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://discord.com/api/oauth2/authorize",
                    access_url: "https://discord.com/api/oauth2/token",
                    // https://discord.com/developers/docs/resources/user
                    scopes,
                    profile_url: Some("https://discord.com/api/users/@me"),
                    profiler: Some(func),
                })
            }
            "dropbox" => {
                let inp = t::struct_().propx("account_id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.account_id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://www.dropbox.com/oauth2/authorize",
                    access_url: "https://api.dropboxapi.com/oauth2/token",
                    // https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
                    scopes,
                    profile_url: Some("https://api.dropboxapi.com/2/users/get_current_account"),
                    profiler: Some(func),
                })
            }
            "facebook" => {
                let inp = t::struct_().propx("id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://www.facebook.com/v16.0/dialog/oauth",
                    access_url: "https://graph.facebook.com/v16.0/oauth/access_token",
                    // https://developers.facebook.com/docs/graph-api/overview#me
                    // https://developers.facebook.com/docs/graph-api/reference/user/
                    scopes,
                    profile_url: Some("https://graph.facebook.com/me"),
                    profiler: Some(func),
                })
            }
            "github" => {
                let inp = t::struct_().propx("id", t::integer())?.build()?;
                let out = t::struct_().propx("id", t::integer())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://github.com/login/oauth/authorize",
                    access_url: "https://github.com/login/oauth/access_token",
                    // https://docs.github.com/en/rest/reference/users?apiVersion=2022-11-28#get-the-authenticated-user
                    scopes,
                    profile_url: Some("https://api.github.com/user"),
                    profiler: Some(func),
                })
            }
            "gitlab" => {
                let inp = t::struct_().propx("id", t::integer())?.build()?;
                let out = t::struct_().propx("id", t::integer())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://gitlab.com/oauth/authorize",
                    access_url: "https://gitlab.com/oauth/token",
                    // https://docs.gitlab.com/ee/api/users.html#list-current-user
                    scopes,
                    profile_url: Some("https://gitlab.com/api/v3/user"),
                    profiler: Some(func),
                })
            }
            "google" => {
                let inp = t::struct_().propx("localId", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.localId})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
                    access_url: "https://oauth2.googleapis.com/token",
                    // https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
                    scopes,
                    profile_url: Some("https://openidconnect.googleapis.com/v1/userinfo"),
                    profiler: Some(func),
                })
            }
            "instagram" => {
                let inp = t::struct_().propx("id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://api.instagram.com/oauth/authorize",
                    access_url: "https://api.instagram.com/oauth/access_token",
                    // https://developers.facebook.com/docs/instagram-basic-display-api/reference/me
                    // https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#reading
                    scopes,
                    profile_url: Some("https://graph.instagram.com/me"),
                    profiler: Some(func),
                })
            }
            "linkedin" => {
                let inp = t::struct_().propx("id", t::integer())?.build()?;
                let out = t::struct_().propx("id", t::integer())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://www.linkedin.com/oauth/v2/authorization",
                    access_url: "https://www.linkedin.com/oauth/v2/accessToken",
                    // https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api#retrieve-current-members-profile
                    scopes,
                    profile_url: Some("https://api.linkedin.com/v2/me"),
                    profiler: Some(func),
                })
            }
            "microsoft" => {
                let inp = t::struct_().propx("id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                    access_url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                    // https://learn.microsoft.com/en-us//javascript/api/@microsoft/teams-js/app.userinfo?view=msteams-client-js-latest
                    scopes,
                    profile_url: Some("https://graph.microsoft.com/oidc/userinfo"),
                    profiler: Some(func),
                })
            }
            "reddit" => {
                let inp = t::struct_()
                    .propx("id", t::eitherx!(t::integer(), t::string()))?
                    .build()?;
                let out = t::struct_()
                    .propx("id", t::eitherx!(t::integer(), t::string()))?
                    .build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://www.reddit.com/api/v1/authorize",
                    access_url: "https://www.reddit.com/api/v1/access_token",
                    // https://www.reddit.com/dev/api/#GET_api_v1_me
                    scopes,
                    profile_url: Some("https://oauth.reddit.com/api/v1/me"),
                    profiler: Some(func),
                })
            }
            "slack" => {
                let inp = t::struct_().propx("user_id", t::string())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.user_id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://slack.com/oauth/v2/authorize",
                    access_url: "https://slack.com/api/oauth.v2.access",
                    // https://api.slack.com/methods/auth.test
                    scopes,
                    profile_url: Some("https://slack.com/api/auth.test"),
                    profiler: Some(func),
                })
            }
            "stackexchange" => {
                let inp = t::struct_().propx("account_id", t::integer())?.build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: `${p.account_id}`})")?;
                Ok(Oauth2Params {
                    name: "stackexchange",
                    authorize_url: "https://stackoverflow.com/oauth",
                    access_url: "https://stackoverflow.com/oauth/access_token/json",
                    // https://api.stackexchange.com/docs/me
                    scopes,
                    profile_url: Some("https://api.stackexchange.com/2.3/me"),
                    profiler: Some(func),
                })
            }
            "twitter" => {
                let mut data = t::struct_();
                let inp = t::struct_()
                    .propx("data", data.propx("id", t::string())?)?
                    .build()?;
                let out = t::struct_().propx("id", t::string())?.build()?;
                let func = gen_profiler_func!(inp, out, "(p) => ({id: p.data.id})")?;
                Ok(Oauth2Params {
                    name,
                    authorize_url: "https://twitter.com/i/oauth2/authorize",
                    access_url: "https://api.twitter.com/2/oauth2/token",
                    // https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
                    scopes,
                    profile_url: Some("https://api.twitter.com/2/users/me"),
                    profiler: Some(func),
                })
            }
            _ => Err(format!("service named {:?} not supported", name)),
        }?
        .try_into()
    }
}
