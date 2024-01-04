// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::t::{self, TypeBuilder};
use crate::types::TypeId;
use crate::utils::Oauth2Params;

use super::OAuth2Profiler;

pub struct StaticParams {
    name: &'static str,
    authorize_url: &'static str,
    access_url: &'static str,
    profile_url: Option<&'static str>,
}

pub trait StdOauth2Provider {
    fn get_static_params(&self) -> StaticParams;
    fn default_profiler(&self) -> Result<OAuth2Profiler>;

    fn extended_profiler(&self, _extension: &str) -> Result<OAuth2Profiler> {
        self.default_profiler()
    }
}

enum ProfilerSource {
    None,
    Default,
    Extended(String),
    Provided(TypeId),
}

pub struct Oauth2Builder {
    scopes: String,
    profiler_source: ProfilerSource,
}

impl Oauth2Builder {
    pub fn new(scopes: String) -> Self {
        Self {
            scopes,
            profiler_source: ProfilerSource::Default,
        }
    }

    pub fn no_profiler(mut self) -> Self {
        self.profiler_source = ProfilerSource::None;
        self
    }

    pub fn with_extended_profiler(mut self, extension: String) -> Self {
        self.profiler_source = ProfilerSource::Extended(extension);
        self
    }

    pub fn with_profiler(mut self, profiler: TypeId) -> Self {
        self.profiler_source = ProfilerSource::Provided(profiler);
        self
    }

    pub fn build(self, provider: Box<dyn StdOauth2Provider>) -> Result<String> {
        let StaticParams {
            name,
            authorize_url,
            access_url,
            profile_url,
        } = provider.get_static_params();

        let profiler = match self.profiler_source {
            ProfilerSource::None => None,
            ProfilerSource::Default => Some(provider.default_profiler()?.try_into()?),
            ProfilerSource::Extended(extension) => {
                Some(provider.extended_profiler(&extension)?.try_into()?)
            }
            ProfilerSource::Provided(profiler) => Some(profiler),
        };

        let params = Oauth2Params {
            name,
            scopes: &self.scopes,
            profiler,
            authorize_url,
            access_url,
            profile_url,
        };

        params.try_into()
    }
}

pub struct DigitalOcean;

impl StdOauth2Provider for DigitalOcean {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "digitalocean",
            authorize_url: "https://cloud.digitalocean.com/v1/oauth/authorize",
            access_url: "https://cloud.digitalocean.com/v1/oauth/token",
            // https://docs.digitalocean.com/reference/api/api-reference/#operation/account_get
            profile_url: Some("https://api.digitalocean.com/v2/account"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let mut account = t::struct_();
        let inp = t::struct_()
            .propx("account", account.propx("uuid", t::string())?)?
            .build()?;
        let out = t::struct_().propx("id", t::integer())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.account.uuid})".to_string(),
        })
    }
}

pub struct Discord;

impl StdOauth2Provider for Discord {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "discord",
            authorize_url: "https://discord.com/api/oauth2/authorize",
            access_url: "https://discord.com/api/oauth2/token",
            // https://discord.com/developers/docs/resources/user
            profile_url: Some("https://discord.com/api/users/@me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}
pub struct Dropbox;

impl StdOauth2Provider for Dropbox {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "dropbox",
            authorize_url: "https://www.dropbox.com/oauth2/authorize",
            access_url: "https://api.dropboxapi.com/oauth2/token",
            // https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
            profile_url: Some("https://api.dropboxapi.com/2/users/get_current_account"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("account_id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.account_id})".to_string(),
        })
    }
}
pub struct Facebook;

impl StdOauth2Provider for Facebook {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "facebook",
            authorize_url: "https://www.facebook.com/v16.0/dialog/oauth",
            access_url: "https://graph.facebook.com/v16.0/oauth/access_token",
            // https://developers.facebook.com/docs/graph-api/overview#me
            // https://developers.facebook.com/docs/graph-api/reference/user/
            profile_url: Some("https://graph.facebook.com/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}
pub struct Github;

impl StdOauth2Provider for Github {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "github",
            authorize_url: "https://github.com/login/oauth/authorize",
            access_url: "https://github.com/login/oauth/access_token",
            // https://docs.github.com/en/rest/reference/users?apiVersion=2022-11-28#get-the-authenticated-user
            profile_url: Some("https://api.github.com/user"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        // ?? are these input types correct?
        let inp = t::struct_().propx("id", t::integer())?.build()?;
        let out = t::struct_().propx("id", t::integer())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }

    fn extended_profiler(&self, extension: &str) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::integer())?.build()?;

        let additional_fields: Vec<String> =
            serde_json::from_str(extension).map_err(|_| -> crate::errors::TgError {
                format!(
                    "Failed to parse profiler extension: expected a JSON list of strings, got `{}`",
                    extension
                )
                .into()
            })?;

        let mut out = t::struct_();
        out.propx("id", t::integer())?;

        for field in additional_fields.iter() {
            match field.as_str() {
                "login" => out.propx("login", t::string())?,
                "avatar_url" => out.propx("avatar_url", t::string())?,
                "email" => out.propx("email", t::string().format("email").optional()?)?,
                _ => {
                    return Err(format!(
                        "Unknown field `{}` in profiler extension: `{}`",
                        field, extension
                    )
                    .into())
                }
            };
        }

        let out = out.build()?;

        let js_code = format!(
            "(p) => ({{ id: p.id, {} }})",
            additional_fields
                .iter()
                .map(|f| format!("{}: p.{}", f, f))
                .collect::<Vec<_>>()
                .join(",\n")
        );

        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code,
        })
    }
}
pub struct Gitlab;

impl StdOauth2Provider for Gitlab {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "gitlab",
            authorize_url: "https://gitlab.com/oauth/authorize",
            access_url: "https://gitlab.com/oauth/token",
            // https://docs.gitlab.com/ee/api/users.html#list-current-user
            profile_url: Some("https://gitlab.com/api/v3/user"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::integer())?.build()?;
        let out = t::struct_().propx("id", t::integer())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}

pub struct Google;

impl StdOauth2Provider for Google {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "google",
            authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
            access_url: "https://oauth2.googleapis.com/token",
            // https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
            profile_url: Some("https://openidconnect.googleapis.com/v1/userinfo"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("localId", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.localId})".to_string(),
        })
    }
}

pub struct Instagram;

impl StdOauth2Provider for Instagram {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "instagram",
            authorize_url: "https://api.instagram.com/oauth/authorize",
            access_url: "https://api.instagram.com/oauth/access_token",
            // https://developers.facebook.com/docs/instagram-basic-display-api/reference/me
            // https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#reading
            profile_url: Some("https://graph.instagram.com/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}

pub struct LinkedIn;

impl StdOauth2Provider for LinkedIn {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "linkedin",
            authorize_url: "https://www.linkedin.com/oauth/v2/authorization",
            access_url: "https://www.linkedin.com/oauth/v2/accessToken",
            // https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api#retrieve-current-members-profile
            profile_url: Some("https://api.linkedin.com/v2/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::integer())?.build()?;
        let out = t::struct_().propx("id", t::integer())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}

pub struct Microsoft;

impl StdOauth2Provider for Microsoft {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "microsoft",
            authorize_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            access_url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            // https://learn.microsoft.com/en-us//javascript/api/@microsoft/teams-js/app.userinfo?view=msteams-client-js-latest
            profile_url: Some("https://graph.microsoft.com/oidc/userinfo"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}

pub struct Reddit;

impl StdOauth2Provider for Reddit {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "reddit",
            authorize_url: "https://www.reddit.com/api/v1/authorize",
            access_url: "https://www.reddit.com/api/v1/access_token",
            // https://www.reddit.com/dev/api/#GET_api_v1_me
            profile_url: Some("https://oauth.reddit.com/api/v1/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_()
            .propx("id", t::eitherx!(t::integer(), t::string()))?
            .build()?;
        let out = t::struct_()
            .propx("id", t::eitherx!(t::integer(), t::string()))?
            .build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.id})".to_string(),
        })
    }
}

pub struct Slack;

impl StdOauth2Provider for Slack {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "slack",
            authorize_url: "https://slack.com/oauth/v2/authorize",
            access_url: "https://slack.com/api/oauth.v2.access",
            // https://api.slack.com/methods/auth.test
            profile_url: Some("https://slack.com/api/auth.test"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("user_id", t::string())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.user_id})".to_string(),
        })
    }
}

pub struct StackExchange;

impl StdOauth2Provider for StackExchange {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "stackexchange",
            authorize_url: "https://stackoverflow.com/oauth",
            access_url: "https://stackoverflow.com/oauth/access_token/json",
            // https://api.stackexchange.com/docs/me
            profile_url: Some("https://api.stackexchange.com/2.3/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let inp = t::struct_().propx("account_id", t::integer())?.build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: `${p.account_id}`})".to_string(),
        })
    }
}

pub struct Twitter;

impl StdOauth2Provider for Twitter {
    fn get_static_params(&self) -> StaticParams {
        StaticParams {
            name: "twitter",
            authorize_url: "https://twitter.com/i/oauth2/authorize",
            access_url: "https://api.twitter.com/2/oauth2/token",
            // https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
            profile_url: Some("https://api.twitter.com/2/users/me"),
        }
    }

    fn default_profiler(&self) -> Result<OAuth2Profiler> {
        let mut data = t::struct_();
        let inp = t::struct_()
            .propx("data", data.propx("id", t::string())?)?
            .build()?;
        let out = t::struct_().propx("id", t::string())?.build()?;
        Ok(OAuth2Profiler {
            input: inp,
            output: out,
            js_code: "(p) => ({id: p.data.id})".to_string(),
        })
    }
}

pub fn named_provider(name: &str) -> Result<Box<dyn StdOauth2Provider>> {
    match name {
        "digitalocean" => Ok(Box::new(DigitalOcean)),
        "discord" => Ok(Box::new(Discord)),
        "dropbox" => Ok(Box::new(Dropbox)),
        "facebook" => Ok(Box::new(Facebook)),
        "github" => Ok(Box::new(Github)),
        "gitlab" => Ok(Box::new(Gitlab)),
        "google" => Ok(Box::new(Google)),
        "instagram" => Ok(Box::new(Instagram)),
        "linkedin" => Ok(Box::new(LinkedIn)),
        "microsoft" => Ok(Box::new(Microsoft)),
        "reddit" => Ok(Box::new(Reddit)),
        "slack" => Ok(Box::new(Slack)),
        "stackexchange" => Ok(Box::new(StackExchange)),
        "twitter" => Ok(Box::new(Twitter)),
        _ => Err(format!("Unknown provider: {}", name).into()),
    }
}
