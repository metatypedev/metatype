use super::{RefAttrs, ResolveRef as _, TypeRef};
use crate::errors::Result;
use crate::types::Type;
use common::typegraph::Injection;

pub trait WithInjection {
    fn with_injection(self, injection: Injection) -> Result<TypeRef>;
}

impl<T> WithInjection for T
where
    T: TryInto<Type>,
    crate::errors::TgError: From<<T as TryInto<Type>>::Error>,
{
    fn with_injection(self, injection: Injection) -> Result<TypeRef> {
        TypeRef::new(
            self.try_into()?,
            vec![(
                "injection".to_owned(),
                serde_json::to_string(&injection).unwrap(),
            )],
        )
    }
}

impl TypeRef {
    pub fn get_injection(&self) -> Result<Option<Injection>> {
        let (_, attrs) = self.resolve_ref()?;
        attrs.get_injection()
    }
}

impl RefAttrs {
    pub fn get_injection(&self) -> Result<Option<Injection>> {
        let injection = self.get("injection");
        let injection = match injection {
            Some(injection) => Some(
                serde_json::from_str(injection)
                    .map_err(|e| format!("Invalid value for 'injection' attribute: {}", e))?,
            ),
            None => None,
        };
        Ok(injection)
    }
}
