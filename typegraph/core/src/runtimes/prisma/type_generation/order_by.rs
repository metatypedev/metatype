// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::context::PrismaContext;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::model::{Property, ScalarType};
use crate::runtimes::prisma::relationship::Cardinality;
use crate::t::{ConcreteTypeBuilder, TypeBuilder};
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
            match prop {
                Property::Model(prop) => {
                    let rel_name = model
                        .relationships
                        .get(k)
                        .ok_or_else(|| errors::unregistered_relationship(&model.type_name, k))?;

                    if self.skip_rel.contains(rel_name) {
                        continue;
                    }

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
                }

                Property::Scalar(prop) => {
                    if prop.quantifier != Cardinality::Many {
                        builder.prop(
                            k,
                            context.generate(&Sort {
                                nullable: prop.quantifier == Cardinality::Optional,
                            })?,
                        );
                    }
                }

                Property::Unmanaged(_) => {}
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
        let model = context.model(self.model_id)?;
        let model = model.borrow();

        let mut agg_builder = t::struct_();
        let mut count_builder = t::struct_();

        for (k, prop) in model.iter_props() {
            match prop {
                Property::Scalar(prop) => {
                    count_builder.prop(
                        k,
                        context.generate(&Sort {
                            nullable: prop.quantifier == Cardinality::Optional,
                        })?,
                    );
                    match prop.prop_type {
                        ScalarType::Integer | ScalarType::Float => {
                            agg_builder.prop(
                                k,
                                context.generate(&Sort {
                                    nullable: prop.quantifier == Cardinality::Optional,
                                })?,
                            );
                        }
                        // skip
                        _ => {}
                    }
                }
                Property::Model(prop) => {
                    count_builder.prop(
                        k,
                        context.generate(&Sort {
                            nullable: prop.quantifier == Cardinality::Optional,
                        })?,
                    );
                }

                Property::Unmanaged(_) => {}
            }
        }

        let mut builder = t::struct_();
        let count = t::optionalx(count_builder)?.build()?;
        let others = t::optionalx(agg_builder)?.build()?;
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
