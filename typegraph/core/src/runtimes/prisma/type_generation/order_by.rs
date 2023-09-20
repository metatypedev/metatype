// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{ConcreteTypeBuilder, TypeBuilder};
use crate::types::Type;
use crate::{t, types::TypeId};

use super::{TypeGen, TypeGenContext};

pub struct OrderBy {
    model_id: TypeId,
    skip_rel: Vec<String>,
    aggregates: bool,
}

impl OrderBy {
    pub fn new(model_id: TypeId) -> Self {
        Self {
            model_id,
            skip_rel: vec![],
            aggregates: false,
        }
    }

    pub fn skip(mut self, rel_names: Vec<String>) -> Self {
        self.skip_rel = rel_names;
        self
    }

    pub fn with_aggregates(self) -> Self {
        Self {
            aggregates: true,
            ..self
        }
    }
}

impl TypeGen for OrderBy {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        enum PropType {
            Optional,
            NonOptional,
            Aggregates,
            OrderBy(TypeId, String),
        }

        let props = self
            .model_id
            .as_struct()
            .unwrap()
            .data
            .props
            .iter()
            .filter_map(|(k, ty)| {
                let (ty, opt) = if let Type::Optional(typ) = TypeId(*ty).as_type().unwrap() {
                    (typ.data.of, true)
                } else {
                    (*ty, false)
                };

                let registry_entry = context.registry.models.get(&self.model_id).unwrap();
                let rel = registry_entry.relationships.get(k);
                if let Some(rel_name) = rel {
                    return if self.skip_rel.contains(rel_name) {
                        None
                    } else {
                        let rel = context.registry.relationships.get(rel_name).unwrap();
                        let relationship_model = rel.get_opposite_of(self.model_id, k).unwrap();
                        match relationship_model.cardinality {
                            Cardinality::Optional | Cardinality::One => Some((
                                k.clone(),
                                PropType::OrderBy(relationship_model.model_type, rel_name.clone()),
                            )),
                            Cardinality::Many => Some((k.clone(), PropType::Aggregates)),
                        }
                    };
                }

                match TypeId(ty).as_type().unwrap() {
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
                    Type::Array(_) => None, // TODO: can we order by an array?
                    _ => panic!("type not supported"),
                }
            })
            .collect::<Vec<_>>();

        let mut builder = if self.aggregates {
            t::struct_extends(context.generate(&AggregateSorting::new(self.model_id))?)?
        } else {
            t::struct_()
        };
        for (k, v) in props {
            builder.prop(
                k,
                match v {
                    PropType::Optional => context.generate(&Sort { nullable: true })?,
                    PropType::NonOptional => context.generate(&Sort { nullable: false })?,
                    PropType::Aggregates => context.generate(&SortByAggregates)?,
                    PropType::OrderBy(ty, rel_name) => {
                        let mut skip_rel = self.skip_rel.clone();
                        skip_rel.push(rel_name);
                        t::optional(context.generate(&OrderBy::new(ty).skip(skip_rel))?).build()?
                    }
                },
            );
        }

        t::array(builder.build()?).named(self.name(context)).build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let name = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        let suffix = if self.skip_rel.is_empty() {
            "".to_string()
        } else {
            format!("_excluding_{}", self.skip_rel.join("_"))
        };
        let suffix2 = if self.aggregates {
            "_with_aggregates"
        } else {
            ""
        };
        format!("_{}_OrderBy{suffix}{suffix2}", name)
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

    fn name(&self, _context: &TypeGenContext) -> String {
        "_SortByAggregates".to_string()
    }
}

struct AggregateSorting {
    model_id: TypeId,
}

impl AggregateSorting {
    fn new(model_id: TypeId) -> Self {
        Self { model_id }
    }
}

impl TypeGen for AggregateSorting {
    fn generate(&self, context: &mut TypeGenContext) -> Result<TypeId> {
        use AggregateSortingProp as Prop;

        let props = self
            .model_id
            .as_struct()?
            .data
            .props
            .iter()
            .map(|(k, type_id)| -> Result<_> {
                let attrs = TypeId(*type_id).attrs()?;
                let typ = attrs.concrete_type.as_type()?;
                let (typ, is_optional) = match typ {
                    Type::Optional(inner) => (
                        TypeId(inner.data.of).attrs()?.concrete_type.as_type()?,
                        true,
                    ),
                    _ => (typ, false),
                };
                match typ {
                    Type::Integer(_) | Type::Float(_) => Ok(Prop {
                        key: k.clone(),
                        number_type: true,
                        optional: is_optional,
                    }),
                    _ => Ok(Prop {
                        key: k.clone(),
                        number_type: false,
                        optional: is_optional,
                    }),
                }
            })
            .collect::<Result<Vec<_>>>()?;

        let mut builder = t::struct_();
        let count = t::optional(
            t::struct_from(props.iter().filter_map(|p| {
                p.generate(context, true)
                    .unwrap()
                    .map(|ty| (p.key.clone(), ty))
            }))
            .build()?,
        )
        .build()?;
        let others = t::optional(
            t::struct_from(props.iter().filter_map(|p| {
                p.generate(context, false)
                    .unwrap()
                    .map(|ty| (p.key.clone(), ty))
            }))
            .build()?,
        )
        .build()?;
        builder
            .prop("_count", count)
            .prop("_avg", others)
            .prop("_sum", others)
            .prop("_min", others)
            .prop("_max", others)
            .named(self.name(context))
            .build()
    }

    fn name(&self, context: &TypeGenContext) -> String {
        let name = context
            .registry
            .models
            .get(&self.model_id)
            .unwrap()
            .name
            .clone();
        format!("_{}_AggregateSorting", name)
    }
}

struct AggregateSortingProp {
    key: String,
    number_type: bool,
    optional: bool,
}

impl AggregateSortingProp {
    fn generate(&self, context: &mut TypeGenContext, count: bool) -> Result<Option<TypeId>> {
        Ok(match count {
            true => Some(context.generate(&Sort {
                nullable: self.optional,
            })?),
            false => {
                if self.number_type {
                    Some(context.generate(&Sort {
                        nullable: self.optional,
                    })?)
                } else {
                    None
                }
            }
        })
    }
}
