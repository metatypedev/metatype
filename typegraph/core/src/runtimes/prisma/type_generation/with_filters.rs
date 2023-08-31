// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::with_store,
    t::{self, ConcreteTypeBuilder, TypeBuilder},
    types::{Type, TypeFun, TypeId},
};

use super::{TypeGen, TypeGenContext};

pub struct WithFilters {
    type_id: TypeId,
    skip_rel: bool,
}

impl WithFilters {
    pub fn new(type_id: TypeId, skip_rel: bool) -> Self {
        Self { type_id, skip_rel }
    }
}

impl TypeGen for WithFilters {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        enum PropType {
            Boolean,
            Number(NumberType),
            String,
            Object,
        }
        struct Prop {
            key: String,
            type_id: TypeId,
            prop_type: PropType,
        }

        let mut props = vec![];

        with_store(|s| -> Result<_> {
            for (k, id) in self.type_id.as_struct(s).unwrap().data.props.iter() {
                let mut id: TypeId = (*id).into();
                let mut ty = s.get_type(id)?;
                if let Type::Optional(opt) = ty {
                    id = opt.data.of.into();
                    ty = s.get_type(id)?;
                }

                match ty {
                    Type::Struct(_) => {
                        if !self.skip_rel {
                            props.push(Prop {
                                key: k.to_string(),
                                type_id: id,
                                prop_type: PropType::Object,
                            });
                        }
                    }
                    Type::Optional(_) => return Err("optional of optional!?".to_string()),
                    Type::Boolean(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            type_id: id,
                            prop_type: PropType::Boolean,
                        });
                    }
                    Type::Integer(n) => {
                        props.push(Prop {
                            key: k.to_string(),
                            type_id: id,
                            prop_type: PropType::Number(NumberType::Integer),
                        });
                    }
                    Type::Float(n) => {
                        props.push(Prop {
                            key: k.to_string(),
                            type_id: id,
                            prop_type: PropType::Number(NumberType::Float),
                        });
                    }
                    Type::String(_) => {
                        props.push(Prop {
                            key: k.to_string(),
                            type_id: id,
                            prop_type: PropType::String,
                        });
                    }
                    _ => {
                        return Err(format!(
                            "type '{}' not supported by prisma",
                            ty.get_data().variant_name()
                        ));
                    }
                }
            }
            Ok(())
        })?;

        let mut builder = t::struct_();
        builder.named(self.name(context));
        for prop in props {
            let ty = match prop.prop_type {
                PropType::Boolean => context.generate(&CompleteFilter(BooleanFilter))?,
                PropType::Number(num) => context.generate(&CompleteFilter(NumberFilter(num)))?,
                PropType::String => context.generate(&CompleteFilter(StringFilter))?,
                PropType::Object => context.generate(&WithFilters {
                    type_id: prop.type_id,
                    skip_rel: true,
                })?,
            };
            builder.prop(prop.key, t::optional(ty).build()?);
        }

        Ok(builder.build()?)
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let suffix = if self.skip_rel { "_norel" } else { "" };
        format!("_{}WithFilters{}", self.type_id.0, suffix)
    }
}

struct CompleteFilter<T: TypeGen>(T);

impl<T: TypeGen> TypeGen for CompleteFilter<T> {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let inner = context.generate(&self.0)?;
        t::optional(t::union([inner, t::struct_().prop("not", inner).build()?]).build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        format!("{}_c", self.0.name(context))
    }
}

struct BooleanFilter;

impl TypeGen for BooleanFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::union([
            t::boolean().build()?,
            t::struct_().prop("equals", t::boolean().build()?).build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        "_boolean_filter".to_string()
    }
}

enum NumberType {
    Integer,
    Float,
}

struct NumberFilter(NumberType);

impl TypeGen for NumberFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let type_id = match self.0 {
            NumberType::Integer => t::integer().build()?,
            NumberType::Float => t::float().build()?,
        };
        let opt_type_id = t::optional(type_id).build()?;
        let array_type_id = t::array(type_id).build()?;
        t::union([
            type_id,
            t::struct_().prop("equals", type_id).build()?,
            t::struct_()
                .prop("lt", opt_type_id)
                .prop("gt", opt_type_id)
                .prop("lte", opt_type_id)
                .prop("gte", opt_type_id)
                .min(1)
                .build()?,
            t::struct_().prop("in", array_type_id).build()?,
            t::struct_().prop("notIn", array_type_id).build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        match self.0 {
            NumberType::Integer => "_integer_filter".to_string(),
            NumberType::Float => "_float_filter".to_string(),
        }
    }
}

struct StringFilter;

impl TypeGen for StringFilter {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let type_id = t::string().build()?;
        let opt_type_id = t::optional(type_id).build()?;
        let array_type_id = t::array(type_id).build()?;

        t::union([
            type_id,
            t::struct_().prop("equals", type_id).build()?,
            t::struct_().prop("in", array_type_id).build()?,
            t::struct_().prop("notIn", array_type_id).build()?,
            t::struct_()
                .prop("contains", type_id)
                .prop(
                    "mode",
                    t::optional(t::string().enum_(vec!["insensitive".to_string()]).build()?)
                        .build()?,
                )
                .build()?,
            // TODO optional feature -- previewFeatures = ["fullTextSearch"]
            t::struct_().prop("search", type_id).build()?,
            t::struct_()
                .prop("startsWith", opt_type_id)
                .prop("endsWith", opt_type_id)
                .min(1)
                .build()?,
        ])
        .named(self.name(context))
        .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        "_string_filter".to_string()
    }
}
