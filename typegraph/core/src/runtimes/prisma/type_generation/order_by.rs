// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{ConcreteTypeBuilder, TypeBuilder};
use crate::types::Type;
use crate::{t, types::TypeId};

use super::TypeGen;

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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = if self.aggregates {
            t::struct_extends(context.generate(&AggregateSorting::new(self.model_id))?)?
        } else {
            t::struct_()
        };

        let model = context.model(self.model_id)?;
        let model = model.borrow();

        for (k, prop) in model.iter_props() {
            if let Some(rel_name) = model.relationships.get(k) {
                if self.skip_rel.contains(rel_name) {
                    continue;
                }

                let prop = prop.as_relationship_property().unwrap();

                // TODO does this work for self relationship?
                match prop.quantifier {
                    Cardinality::Many => {
                        builder.prop(k, context.generate(&SortByAggregates)?);
                    }
                    Cardinality::Optional | Cardinality::One => {
                        let mut skip_rel = self.skip_rel.clone();
                        skip_rel.push(rel_name.clone());
                        let inner =
                            context.generate(&OrderBy::new(prop.model_id).skip(skip_rel))?;
                        builder.propx(k, t::optional(inner))?;
                    }
                }
            } else {
                let Some(prop) = prop.as_scalar_property() else {
                    continue;
                };
                if prop.quantifier != Cardinality::Many {
                    builder.prop(
                        k,
                        context.generate(&Sort {
                            nullable: prop.quantifier == Cardinality::Optional,
                        })?,
                    );
                }
            }
        }

        t::arrayx(builder)?.named(self.name()).build()
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
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
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
    fn generate(&self, _context: &PrismaContext) -> Result<TypeId> {
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let sort_order = context.generate(&SortOrder)?;
        let nulls_order = context.generate(&NullsOrder)?;
        let mut builder = t::struct_();
        builder.prop("sort", sort_order);
        if self.nullable {
            builder.prop("nulls", nulls_order);
        }

        t::optionalx(t::unionx![builder, sort_order])?
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
        let mut builder = t::struct_();
        let sort = context.generate(&Sort { nullable: false })?;
        builder.prop("_count", sort);
        builder.prop("_avg", sort);
        builder.prop("_sum", sort);
        builder.prop("_min", sort);
        builder.prop("_max", sort);

        t::optionalx(builder)?.named(self.name()).build()
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
    fn generate(&self, context: &PrismaContext) -> Result<TypeId> {
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
        let count = t::optionalx(t::struct_from(props.iter().filter_map(|p| {
            p.generate(context, true)
                .unwrap()
                .map(|ty| (p.key.clone(), ty))
        })))?
        .build()?;
        let others = t::optionalx(t::struct_from(props.iter().filter_map(|p| {
            p.generate(context, false)
                .unwrap()
                .map(|ty| (p.key.clone(), ty))
        })))?
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
    fn generate(&self, context: &PrismaContext, count: bool) -> Result<Option<TypeId>> {
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
