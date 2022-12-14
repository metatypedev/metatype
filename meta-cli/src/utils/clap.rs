// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use clap::{
    builder::TypedValueParser,
    error::{ContextKind, ContextValue, ErrorKind},
    Error,
};
use colored::Colorize;
use reqwest::Url;

#[derive(Clone)]
pub struct UrlValueParser {
    valid_schemes: Vec<String>,
}

impl UrlValueParser {
    pub fn new() -> Self {
        Self {
            valid_schemes: vec![],
        }
    }

    pub fn with_schemes(mut self, schemes: Vec<String>) -> Self {
        self.valid_schemes = schemes;
        self
    }

    pub fn http(self) -> Self {
        self.with_schemes(vec!["http".into(), "https".into()])
    }
}

impl TypedValueParser for UrlValueParser {
    type Value = Url;

    fn parse_ref(
        &self,
        cmd: &clap::Command,
        arg: Option<&clap::Arg>,
        value: &std::ffi::OsStr,
    ) -> Result<Self::Value, clap::Error> {
        let value = value
            .to_str()
            .ok_or_else(|| Error::new(ErrorKind::InvalidUtf8).with_cmd(cmd))?;
        let url = Url::parse(value).map_err(|_e| {
            let mut err = Error::new(ErrorKind::InvalidValue);
            err.insert(
                ContextKind::InvalidValue,
                ContextValue::String(value.into()),
            );
            if let Some(arg) = arg {
                err.insert(
                    ContextKind::InvalidArg,
                    ContextValue::String(arg.get_id().to_string()),
                );
            }
            err
        })?;

        // check scheme
        if !self.valid_schemes.is_empty() && !self.valid_schemes.contains(&url.scheme().into()) {
            let mut err = Error::new(ErrorKind::InvalidValue);
            err.insert(
                ContextKind::InvalidValue,
                ContextValue::String(value.into()),
            );
            if let Some(arg) = arg {
                err.insert(
                    ContextKind::InvalidArg,
                    ContextValue::String(arg.get_id().to_string()),
                );
            }

            err.insert(
                ContextKind::Suggested,
                ContextValue::StyledStrs(vec![format!(
                    "Valid schemes are: {}",
                    self.valid_schemes.join(", ").green()
                )
                .into()]),
            );

            return Err(err);
        }

        Ok(url)
    }
}
