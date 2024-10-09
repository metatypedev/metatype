use super::{RefAttr, TypeRef};
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
        TypeRef::new(self.try_into()?, Some(RefAttr::Injection(injection)))
    }
}
