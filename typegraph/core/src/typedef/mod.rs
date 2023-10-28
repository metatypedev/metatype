// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod boolean;
pub mod either;
pub mod file;
pub mod float;
pub mod func;
pub mod integer;
pub mod list;
pub mod optional;
pub mod proxy;
pub mod string;
pub mod struct_;
pub mod union;
pub mod with_injection;
pub mod with_policy;

macro_rules! impl_into_type {
    ( concrete, $variant:ident ) => {
        fn into_type(
            self,
            type_id: $crate::types::TypeId,
            base: Option<$crate::wit::core::TypeBase>,
        ) -> $crate::errors::Result<$crate::types::Type> {
            Ok($crate::types::Type::$variant(std::rc::Rc::new(
                $crate::types::ConcreteType {
                    id: type_id,
                    base: base
                        .ok_or_else(|| $crate::errors::base_required(stringify!($variant)))?,
                    data: self,
                },
            )))
        }
    };

    ( wrapper, $variant:ident ) => {
        fn into_type(
            self,
            type_id: $crate::types::TypeId,
            base: Option<$crate::wit::core::TypeBase>,
        ) -> $crate::errors::Result<$crate::types::Type> {
            if base.is_some() {
                Err($crate::errors::base_not_allowed(stringify!($variant)))
            } else {
                Ok($crate::types::Type::$variant(std::rc::Rc::new(
                    $crate::types::WrapperType {
                        id: type_id,
                        data: self,
                    },
                )))
            }
        }
    };
}

pub(crate) use impl_into_type;
