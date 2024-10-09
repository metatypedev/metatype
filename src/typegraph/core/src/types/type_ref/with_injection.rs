use super::{RefAttrs, TypeRef};
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
            RefAttrs::default().with_injection(injection),
        )
    }
}

impl TypeRef {
    pub fn get_injection(&self) -> Option<&Injection> {
        self.attributes
            .as_ref()
            .and_then(|attrs| attrs.injection.as_ref())
    }
}
