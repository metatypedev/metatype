pub fn get_version() -> String {
    let version = env!("CARGO_PKG_VERSION").to_string();
    if cfg!(debug_assertions) {
        let commit = git_version::git_version!();
        format!("{version}+{commit}2222")
    } else {
        version
    }
}
