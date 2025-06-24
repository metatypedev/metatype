// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::cell::RefCell;

use indexmap::IndexSet;

use crate::errors::Result;
use crate::t::{self, TypeBuilder};

pub fn results_op_results_ty(out: u32) -> Result<crate::types::TypeId> {
    let count = t::integer().build()?;

    let result = t::struct_()
        .prop("status", t::string().build()?)
        .prop("value", t::optional(out.into()).build()?)
        .build()?;

    let ongoing_runs = t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("started_at", t::string().build()?)
            .build()?,
    )
    .build()?;

    let completed_runs = t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("started_at", t::string().build()?)
            .prop("ended_at", t::string().build()?)
            .prop("result", result)
            .build()?,
    )
    .build()?;

    t::struct_()
        .prop(
            "ongoing",
            t::struct_()
                .prop("count", count)
                .prop("runs", ongoing_runs)
                .build()?,
        )
        .prop(
            "completed",
            t::struct_()
                .prop("count", count)
                .prop("runs", completed_runs)
                .build()?,
        )
        .build()
}

thread_local! {
    static RECORDER: RefCell<IndexSet<String>> = Default::default();
}

fn loc_ref(name: &str) -> Result<crate::types::TypeId> {
    let name = format!("s_{name}").to_lowercase();
    t::ref_(name, Default::default()).build()
}

fn save(
    name: &str,
    builder: impl FnOnce(&str) -> Result<crate::types::TypeId>,
) -> Result<crate::types::TypeId> {
    let name = format!("s_{name}").to_lowercase();

    let has_name = RECORDER.with_borrow(|cache| cache.contains(&name));
    if has_name {
        return t::ref_(name, Default::default()).build();
    }

    RECORDER.with_borrow_mut(|cache| {
        let id = builder(&name)?;
        cache.insert(name.to_string());
        Ok(id)
    })
}

/// Term: `{ op: value } | { special: { op: value } }`
/// * op: "eq", "lt", "contains", ..
/// * special: "started_at", "status", ..
fn filter_term_variants() -> Result<Vec<crate::types::TypeId>> {
    // FIXME: a generic json would have been helpful here vs json string
    // let any_scalar = save("any_scalar", |n| {
    //     t::eitherx!(t::integer(), t::string(), t::boolean(), t::struct_()).build_named(n)
    // })?;
    // let value_to_comp_against = t::eitherx!(any_scalar, t::listx(any_scalar)).build()?;

    let value_to_comp_against = t::string().format("json").build()?;
    let ops = ["eq", "lt", "lte", "gt", "gte", "in", "contains"]
        .into_iter()
        .map(|op| {
            save(op, |n| {
                t::struct_()
                    .prop(op, value_to_comp_against)
                    .build_named_subs(n)
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let op_value = save("op", |n| {
        t::either(ops.clone().into_iter()).build_named_subs(n)
    })?;

    let special = ["run_id", "started_at", "ended_at", "status"]
        .into_iter()
        .map(|sp| save(sp, |n| t::struct_().prop(sp, op_value).build_named_subs(n)))
        .collect::<Result<Vec<_>>>()?;

    let mut variants = vec![];
    variants.extend(ops.iter());
    variants.extend(special.iter());

    Ok(variants)
}

/// Expr: `{ op: [...] } | Term`
/// * op: "and" or "or"
/// * ...: may contain itself, or a term
pub fn filter_expr_ty() -> Result<crate::types::TypeId> {
    let mut op_expr_variants = filter_term_variants()?;
    op_expr_variants.extend([
        loc_ref("and_expr")?,
        loc_ref("or_expr")?,
        loc_ref("not_expr")?,
    ]);

    let expr = save("expr", |n| t::either(op_expr_variants).build_named_subs(n))?;
    let expr_list = save("list_expr", |n| t::listx(expr).build_named_subs(n))?;

    let _and = save("and_expr", |n| {
        t::struct_().prop("and", expr_list).build_named_subs(n)
    })?;

    let _or = save("or_expr", |n| {
        t::struct_().prop("or", expr_list).build_named_subs(n)
    })?;

    let _not = save("not_expr", |n| {
        t::struct_().prop("not", expr).build_named_subs(n)
    })?;

    t::struct_()
        .prop("name", t::string().build()?)
        .prop(
            "filter", expr,
            // save("Filter", |n| t::unionx!(and, or, expr).build_named(n))?,
        )
        .build()
}

pub fn search_results_ty() -> Result<crate::types::TypeId> {
    t::list(
        t::struct_()
            .prop("run_id", t::string().build()?)
            .prop("status", t::string().build()?)
            .prop("started_at", t::string().optional().build()?)
            .prop("ended_at", t::string().optional().build()?)
            .prop("value", t::string().format("json").optional().build()?)
            .build()?,
    )
    .build()
}
