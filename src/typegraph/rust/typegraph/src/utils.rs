use serde::Serialize;

pub fn json_stringify<S>(value: &S) -> String
where
    S: Serialize + ?Sized,
{
    serde_json::to_string(value).unwrap()
}
