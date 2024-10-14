use serde_json::Value;

use super::types::{EnsureSubtypeOf as _, ErrorCollector, ExtendedTypeNode};
use super::{Validator, ValidatorContext};
use crate::typegraph::visitor::{Edge, PathSegment, TypeVisitorContext as _};
use crate::typegraph::{Injection, InjectionNode, ObjectTypeData, TypeId, TypeNode};

pub struct InjectionValidationContext<'a> {
    pub fn_path: Vec<PathSegment>,
    pub fn_idx: TypeId,
    pub input_idx: TypeId,
    pub parent_object: &'a ObjectTypeData,
    pub validator: &'a ValidatorContext<'a>,
}

impl<'a> InjectionValidationContext<'a> {
    fn get_path(&self, path: &[String]) -> Vec<PathSegment> {
        let mut res = self.fn_path.clone();
        res.push(PathSegment {
            from: self.fn_idx,
            edge: Edge::FunctionInput,
        });
        res.push(PathSegment {
            from: self.input_idx,
            edge: Edge::ObjectProp(path.join(".")),
        });
        res
    }
}

impl Validator {
    pub fn validate_injection(
        &mut self,
        path: &mut Vec<String>,
        type_idx: TypeId,
        injection_node: &InjectionNode,
        cx: &InjectionValidationContext<'_>,
    ) {
        let tg = cx.validator.get_typegraph();
        match injection_node {
            InjectionNode::Leaf { injection } => match injection {
                Injection::Static(data) => {
                    for value in data.values().iter() {
                        match serde_json::from_str::<Value>(value) {
                            Ok(val) => match tg.validate_value(type_idx, &val) {
                                Ok(_) => {}
                                Err(err) => self.push_error(&cx.get_path(path), err.to_string()),
                            },
                            Err(e) => {
                                self.push_error(
                                    &cx.get_path(path),
                                    format!(
                                    "Error while parsing static injection value {value:?}: {e:?}",
                                    value = value
                                ),
                                );
                            }
                        }
                    }
                }
                Injection::Parent(data) => {
                    let sources = data.values();
                    for source_key in sources.iter() {
                        self.validate_parent_injection(source_key, type_idx, path, cx);
                    }
                }
                _ => (),
            },
            InjectionNode::Parent { children } => {
                let type_idx = tg.resolve_quant(type_idx);
                let type_node = &cx.validator.get_typegraph().types[type_idx as usize];
                match type_node {
                    TypeNode::Object { data, .. } => {
                        for (key, node) in children.iter() {
                            path.push(key.clone());
                            match data.properties.get(key) {
                                Some(type_idx) => {
                                    self.validate_injection(path, *type_idx, node, cx);
                                }
                                None => {
                                    self.push_error(
                                        &cx.get_path(path),
                                        format!(
                                            "unexpected injection path prefix: {:?}",
                                            path.join(".")
                                        ),
                                    );
                                }
                            }
                            path.pop();
                        }
                    }
                    _ => {
                        self.push_error(
                            &cx.get_path(path),
                            format!("unexpected injection path prefix: {:?}", path.join(".")),
                        );
                    }
                }
            }
        }
    }

    fn validate_parent_injection(
        &mut self,
        source_key: &str,
        in_type_idx: TypeId,
        in_path: &[String],
        cx: &InjectionValidationContext<'_>,
    ) {
        let tg = cx.validator.get_typegraph();
        let source_idx = {
            let source_idx = cx.parent_object.properties.get(source_key);
            match source_idx {
                Some(idx) => *idx,
                None => {
                    let keys = cx.parent_object.properties.keys().collect::<Vec<_>>();
                    self.push_error(
                        &cx.get_path(in_path),
                        format!(
                            "from_parent injection: source key {source_key} not found in parent; available keys: {keys:?}",
                            source_key = source_key
                        ),
                    );
                    return;
                }
            }
        };

        let source = ExtendedTypeNode::new(tg, source_idx);
        let target = ExtendedTypeNode::new(tg, in_type_idx);
        let mut errors = ErrorCollector::default();
        source.ensure_subtype_of(&target, tg, &mut errors);
        for error in errors.errors.into_iter() {
            self.push_error(
                &cx.get_path(in_path),
                format!("from_parent injection: {error}", error = error),
            );
        }
    }
}
