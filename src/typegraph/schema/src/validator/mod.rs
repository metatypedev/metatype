// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod common;
mod injection;
mod input;
mod types;
mod value;

use self::injection::InjectionValidationContext;

use super::visitor::{
    visit_child, ChildNode, CurrentNode, ParentFn, Path, PathSegment, TypeVisitor,
    TypeVisitorContext, VisitLayer, VisitResult, VisitorResult,
};
use crate::{TypeNode, Typegraph};
use std::collections::{hash_map, HashMap};

use self::types::{EnsureSubtypeOf, ErrorCollector, ExtendedTypeNode};

#[allow(dead_code)]
fn assert_unique_titles(types: &[TypeNode]) -> Vec<ValidatorError> {
    let mut duplicates = vec![];
    let mut map: HashMap<String, usize> = HashMap::new();
    for (i, t) in types.iter().enumerate() {
        let entry = map.entry(t.base().title.clone());
        match entry {
            hash_map::Entry::Occupied(o) => {
                duplicates.push((t.base().title.clone(), *o.get(), i));
            }
            hash_map::Entry::Vacant(v) => {
                v.insert(i);
            }
        }
    }
    duplicates
        .into_iter()
        .map(|(title, i, j)| ValidatorError {
            path: "<types>".to_owned(),
            message: format!("Duplicate title '{}' in types #{} and #{}", title, i, j),
        })
        .collect()
}

pub fn validate_typegraph(tg: &Typegraph) -> Vec<ValidatorError> {
    let mut errors = vec![];
    // FIXME temporarily disabled, will be re-enabled after all changes on the
    // typegraph are merged
    // errors.extend(assert_unique_titles(&tg.types));
    let context = ValidatorContext { typegraph: tg };
    let validator = Validator::default();

    errors.extend(tg.traverse_types(validator, &context, Layer, 0).unwrap());
    errors
}

#[derive(Debug)]
pub struct ValidatorError {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct ValidatorContext<'a> {
    typegraph: &'a Typegraph,
}

#[derive(Debug, Default)]
struct Validator {
    errors: Vec<ValidatorError>,
}

#[derive(Clone)]
struct Layer;

impl<'a> VisitLayer<'a, Validator> for Layer {
    fn visit(
        &self,
        traversal: &mut super::visitor::TypegraphTraversal<'a, Validator, Self>,
        source: impl Iterator<Item = ChildNode>,
        context: &'a ValidatorContext<'a>,
    ) -> Option<<Validator as TypeVisitor>::Return> {
        let mut errors = vec![];
        for ChildNode(path_seg, idx) in source {
            if let Some(err) = visit_child(traversal, path_seg, idx, context) {
                errors.extend(err);
            }
        }
        if errors.is_empty() {
            None
        } else {
            Some(errors)
        }
    }
}

impl Validator {
    fn push_error(&mut self, path: &[PathSegment], message: impl Into<String>) {
        self.errors.push(ValidatorError {
            path: Path(path).to_string(),
            message: message.into(),
        });
    }
}

impl VisitorResult for Vec<ValidatorError> {
    fn from_error(path: String, message: String) -> Self {
        vec![ValidatorError { path, message }]
    }
}

impl<'a> TypeVisitorContext for ValidatorContext<'a> {
    fn get_typegraph(&self) -> &Typegraph {
        self.typegraph
    }
}

impl<'a> TypeVisitor<'a> for Validator {
    type Return = Vec<ValidatorError>;
    type Context = ValidatorContext<'a>;

    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return> {
        let type_node = current_node.type_node;

        let tg = context.get_typegraph();

        let get_type_name = |idx: u32| tg.types.get(idx as usize).unwrap().type_name();

        if let TypeNode::Function { data, .. } = type_node {
            let parent_idx = current_node.path.last().unwrap().from;
            let parent_object = match &context.get_typegraph().types[parent_idx as usize] {
                TypeNode::Object { data, .. } => data,
                _ => {
                    self.push_error(
                        current_node.path,
                        "function parent is not an object".to_owned(),
                    );
                    return VisitResult::Continue(false);
                }
            };
            let mut path = vec![];
            let inj_cx = InjectionValidationContext {
                fn_path: current_node.path.to_vec(),
                fn_idx: current_node.type_idx,
                input_idx: data.input,
                parent_object,
                validator: context,
            };
            let input_object = match &context.get_typegraph().types[data.input as usize] {
                TypeNode::Object { data, .. } => data,
                _ => {
                    self.push_error(
                        current_node.path,
                        "function input is not an object".to_owned(),
                    );
                    return VisitResult::Continue(false);
                }
            };
            for (k, inj) in data.injections.iter() {
                path.push(k.clone());
                self.validate_injection(
                    &mut path,
                    *input_object.properties.get(k).unwrap(),
                    inj,
                    &inj_cx,
                );
                path.pop();
            }
            // TODO validate outjection
            // if !data.outjections.is_empty() {
            //     let outj_cx = InjectionValidationContext {
            //         fn_path: current_node.path.to_vec(),
            //         fn_idx: current_node.type_idx,
            //         input_idx: data.output,
            //         parent_object,
            //         validator: context,
            //     };
            //     for (k, outj) in data.outjections.iter() {
            //         path.push(k.clone());
            //         self.validate_injection(
            //             &mut path,
            //             *parent_object.properties.get(k).unwrap(),
            //             outj,
            //             &outj_cx,
            //         );
            //         path.pop();
            //     }
            // }
        } else if let TypeNode::Either { data, .. } = type_node {
            let variants = data.one_of.clone();
            for i in 0..variants.len() {
                for j in (i + 1)..variants.len() {
                    let type1 = ExtendedTypeNode::new(tg, variants[i]);
                    let type2 = ExtendedTypeNode::new(tg, variants[j]);

                    let mut subtype_errors = ErrorCollector::default();
                    type1.ensure_subtype_of(&type2, tg, &mut subtype_errors);

                    if subtype_errors.errors.is_empty() {
                        self.push_error(
                            current_node.path,
                            format!(
                                "Invalid either type: variant #{i} ('{}') is a subtype of variant #{j} ('{}')",
                                get_type_name(variants[i]),
                                get_type_name(variants[j]),
                            ),
                        );
                    }

                    let mut subtype_errors = ErrorCollector::default();
                    type2.ensure_subtype_of(&type1, tg, &mut subtype_errors);

                    if subtype_errors.errors.is_empty() {
                        self.push_error(
                            current_node.path,
                            format!(
                                "Invalid either type: variant #{j} ('{}') is a subtype of variant #{i} ('{}')",
                                get_type_name(variants[j]),
                                get_type_name(variants[i]),
                            ),
                        );
                    }
                }
            }
        } else if let TypeNode::Union { data, .. } = type_node {
            let variants = data.any_of.clone();

            for i in 0..variants.len() {
                for j in (i + 1)..variants.len() {
                    if variants[i] == variants[j] {
                        self.push_error(
                            current_node.path,
                            format!(
                                "Invalid union type: variant #{i} ('{}') is the same type as variant #{j} ('{}')",
                                get_type_name(variants[i]),
                                get_type_name(variants[j]),
                            ),
                        );
                    }
                }
            }
        }

        if let Some(enumeration) = &type_node.base().enumeration {
            match context
                .get_typegraph()
                .check_enum_values(current_node.type_idx, enumeration)
            {
                Ok(_) => {}
                Err(err) => {
                    for e in err {
                        self.push_error(current_node.path, e);
                    }
                }
            }
        }

        VisitResult::Continue(true)
    }

    fn visit_input_type(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
        _parent_fn: ParentFn,
    ) -> VisitResult<Self::Return> {
        self.visit_input_type_impl(current_node, context)
    }

    fn take_result(&mut self) -> Option<Self::Return> {
        Some(std::mem::take(&mut self.errors))
    }
}
