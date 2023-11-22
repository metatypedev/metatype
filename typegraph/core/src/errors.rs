// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub use crate::wit::core::Error as TgError;

pub type Result<T, E = TgError> = std::result::Result<T, E>;

impl From<String> for TgError {
    fn from(s: String) -> Self {
        Self { stack: vec![s] }
    }
}

impl PartialEq for TgError {
    fn eq(&self, other: &Self) -> bool {
        self.stack == other.stack
    }
}

impl From<&str> for TgError {
    fn from(s: &str) -> Self {
        s.to_string().into()
    }
}

pub trait ErrorContext {
    fn context(self, ctx: impl ToString) -> Self;
    fn with_context(self, ctx: impl Fn() -> String) -> Self;
}

impl<T> ErrorContext for Result<T> {
    fn context(self, ctx: impl ToString) -> Self {
        let ctx = ctx.to_string();
        self.map_err(|mut e| {
            e.stack.push(ctx);
            e
        })
    }

    fn with_context(self, ctx: impl Fn() -> String) -> Self {
        self.context(ctx())
    }
}

pub fn invalid_max_value() -> TgError {
    "min must be less than or equal to max".into()
}

pub fn duplicate_key(name: &str) -> TgError {
    format!("duplicate key '{name}' in properties").into()
}

pub fn invalid_input_type(got: &str) -> TgError {
    format!("expected a Struct as input type but got {got}").into()
}

pub fn invalid_type(expected: &str, got: &str) -> TgError {
    format!("expected {expected} but got {got}").into()
}

pub fn nested_typegraph_context(active: &str) -> TgError {
    format!("cannot init typegraph: typegraph '{active}' is still active").into()
}

pub fn expected_typegraph_context() -> TgError {
    "no active typegraph context".into()
}

pub fn invalid_export_type(name: &str, got: &str) -> TgError {
    format!("expected a Func to be exposed, got {got} under the name '{name}'").into()
}

pub fn invalid_export_name(name: &str) -> TgError {
    format!("invalid export name '{name}': allowed characters are ascii letters and underscores")
        .into()
}

pub fn duplicate_export_name(name: &str) -> TgError {
    format!("duplicate export name '{name}'").into()
}

pub fn unregistered_type_name(name: &str) -> TgError {
    format!("type name '{name}' has not been registered").into()
}

pub fn object_not_found(kind: &str, id: u32) -> TgError {
    format!("{kind} #{id} not found").into()
}

pub fn invalid_path(pos: usize, path: &[String], curr_keys: &[String]) -> TgError {
    let mut path_with_cursor = vec![];
    for (i, chunk) in path.iter().enumerate() {
        if i == pos {
            path_with_cursor.push(format!("[{}]", chunk));
        } else {
            path_with_cursor.push(chunk.clone());
        }
    }
    format!(
        "invalid path {:?}, none of {} match the chunk {:?}",
        path_with_cursor.join("."),
        curr_keys.join(", "),
        path.get(pos).unwrap_or(&"".to_string()),
    )
    .into()
}

pub fn expect_object_at_path(path: &[String], actual: &str) -> TgError {
    format!(
        "object was expected at path {:?}; but got: {actual}",
        path.join(".")
    )
    .into()
}

pub fn unknown_predefined_function(name: &str, runtime: &str) -> TgError {
    format!("unknown predefined function {name} for runtime {runtime}").into()
}

pub fn duplicate_policy_name(name: &str) -> TgError {
    format!("duplicate policy name '{name}'").into()
}

pub fn nested_type_ref(name: &str, nested: &str) -> TgError {
    format!("nested type reference is not allowed: -> '{name}' -> '{nested}'").into()
}
