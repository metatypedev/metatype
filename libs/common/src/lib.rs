pub mod typegraph;

pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn get_commit() -> String {
    git_version::git_version!().to_string()
}

pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}
