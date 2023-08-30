use crate::errors::Result;
use crate::global_store::with_store;
use crate::t::{ConcreteTypeBuilder, TypeBuilder};
use crate::types::Type;
use crate::{t, types::TypeId};

use super::{TypeGen, TypeGenContext};

pub struct OrderBy(pub TypeId);

impl TypeGen for OrderBy {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        enum PropType {
            Optional,
            NonOptional,
            Aggregates,
            OrderBy(TypeId),
        }

        let props = with_store(|s| {
            self.0
                .as_struct(s)
                .unwrap()
                .data
                .props
                .iter()
                .filter_map(|(k, ty)| {
                    let (ty, opt) = if let Type::Optional(typ) = TypeId(*ty).as_type(s).unwrap() {
                        (typ.data.of, true)
                    } else {
                        (*ty, false)
                    };
                    match TypeId(ty).as_type(s).unwrap() {
                        Type::Boolean(_) | Type::Integer(_) | Type::Float(_) | Type::String(_) => {
                            Some((
                                k.clone(),
                                if opt {
                                    PropType::Optional
                                } else {
                                    PropType::NonOptional
                                },
                            ))
                        }
                        Type::Struct(_) => Some((k.clone(), PropType::OrderBy(ty.into()))),
                        Type::Array(arr) => {
                            if let Type::Struct(_) = TypeId(arr.data.of).as_type(s).unwrap() {
                                Some((k.clone(), PropType::OrderBy(arr.data.of.into())))
                            } else {
                                panic!("array of scalar type not supported by prisma")
                            }
                        }
                        _ => panic!("type not supported"),
                    }
                })
                .collect::<Vec<_>>()
        });

        let mut builder = t::struct_();
        for (k, v) in props {
            builder.prop(
                k,
                match v {
                    PropType::Optional => context.generate(&Sort { nullable: true })?,
                    PropType::NonOptional => context.generate(&Sort { nullable: false })?,
                    PropType::Aggregates => context.generate(&SortByAggregates)?,
                    PropType::OrderBy(ty) => {
                        t::optional(context.generate(&OrderBy(ty))?).build()?
                    }
                },
            );
        }

        t::array(builder.build()?).named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let model_name = &context.registry.models.get(&self.0).unwrap().name;
        format!("_{model_name}_OrderBy")
    }
}

struct SortOrder;

impl TypeGen for SortOrder {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::string()
            .enum_(vec!["asc".to_string(), "desc".to_string()])
            .named(self.name(context))
            .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_SortOrder".to_string()
    }
}

struct NullsOrder;

impl TypeGen for NullsOrder {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        t::string()
            .enum_(vec!["first".to_string(), "last".to_string()])
            .named(self.name(context))
            .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        "_NullsOrder".to_string()
    }
}

struct Sort {
    nullable: bool,
}

impl TypeGen for Sort {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let sort_order = context.generate(&SortOrder)?;
        let nulls_order = context.generate(&NullsOrder)?;
        let mut builder = t::struct_();
        builder.prop("sort", sort_order);
        if self.nullable {
            builder.prop("nulls", nulls_order);
        }

        t::optional(t::union([builder.build()?, sort_order]).build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, _context: &TypeGenContext) -> String {
        let nullable = if self.nullable { "_nullable" } else { "" };
        format!("_Sort{}", nullable)
    }
}

struct SortByAggregates;

impl TypeGen for SortByAggregates {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let sort = context.generate(&Sort { nullable: false })?;
        builder.prop("_count", sort);
        builder.prop("_avg", sort);
        builder.prop("_sum", sort);
        builder.prop("_min", sort);
        builder.prop("_max", sort);

        t::optional(builder.build()?)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        "_SortByAggregates".to_string()
    }
}
