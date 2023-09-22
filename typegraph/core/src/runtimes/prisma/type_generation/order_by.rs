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
        let mut builder = if self.aggregates {
            t::struct_extends(context.generate(&AggregateSorting::new(self.model_id))?)?
        } else {
            t::struct_()
        };

        for (k, type_id) in self.model_id.as_struct()?.iter_props() {
            let registry_entry = context.registry.models.get(&self.model_id).unwrap();
            let rel = registry_entry.relationships.get(k);
            if let Some(rel_name) = rel {
                if self.skip_rel.contains(rel_name) {
                    continue;
                }

                let rel = context
                    .registry
                    .relationships
                    .get(rel_name)
                    .cloned()
                    .unwrap();

                // TODO does this work for self relationship?
                let relationship_model = rel.get_opposite_of(self.model_id, k).unwrap();
                match relationship_model.cardinality {
                    Cardinality::Many => {
                        builder.prop(k, context.generate(&SortByAggregates)?);
                    }
                    Cardinality::Optional | Cardinality::One => {
                        let mut skip_rel = self.skip_rel.clone();
                        skip_rel.push(rel_name.clone());
                        let inner = context.generate(
                            &OrderBy::new(relationship_model.model_type).skip(skip_rel),
                        )?;
                        builder.prop(k, t::optional(inner).build()?);
                    }
                }
            } else {
                let typ = type_id.as_type()?;
                let (typ, nullable) = if let Type::Optional(inner) = typ {
                    (inner.item().as_type()?, true)
                } else {
                    (typ, false)
                };
                match typ {
                    Type::Boolean(_) | Type::Integer(_) | Type::Float(_) | Type::String(_) => {
                        builder.prop(k, context.generate(&Sort { nullable })?);
                    }
                    Type::Array(_) => {}
                    _ => Err(format!("Cannot order by type {:?}", typ))?,
                }
            }
        }

        t::array(builder.build()?).named(self.name()).build()
    }

    fn name(&self) -> String {
        let name = self.model_id.type_name().unwrap().unwrap();
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
    fn generate(&self, _context: &mut TypeGenContext) -> Result<TypeId> {
        t::string()
            .enum_(vec!["asc".to_string(), "desc".to_string()])
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        "_SortOrder".to_string()
    }
}

struct NullsOrder;

impl TypeGen for NullsOrder {
    fn generate(&self, _context: &mut TypeGenContext) -> Result<TypeId> {
        t::string()
            .enum_(vec!["first".to_string(), "last".to_string()])
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
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
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
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

        t::optional(builder.build()?).named(self.name()).build()
    }

    fn name(&self) -> String {
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
            .iter_props()
            .map(|(k, type_id)| -> Result<_> {
                let attrs = type_id.attrs()?;
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
                        key: k.to_string(),
                        number_type: true,
                        optional: is_optional,
                    }),
                    _ => Ok(Prop {
                        key: k.to_string(),
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
            .named(self.name())
            .build()
    }

    fn name(&self) -> String {
        let model_name = self.model_id.type_name().unwrap().unwrap();
        format!("_{model_name}_AggregateSorting")
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
