// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::typegraph::{TypeNode, Typegraph};

use super::{
    visitor::{Path, PathSegment, TypeVisitor, VisitResult},
    InjectionSource,
};

pub fn validate_typegraph(tg: &Typegraph) -> Vec<ValidatorError> {
    let validator = Validator::default();
    tg.traverse_types(validator).unwrap()
}

pub struct ValidatorError {
    pub path: String,
    pub message: String,
}

#[derive(Default)]
struct Validator {
    errors: Vec<ValidatorError>,
}

impl Validator {
    fn push_error(&mut self, path: &[PathSegment], message: String) {
        self.errors.push(ValidatorError {
            path: Path(path).to_string(),
            message,
        });
    }
}

impl TypeVisitor for Validator {
    type Return = Vec<ValidatorError>;

    fn visit(&mut self, node: &TypeNode, path: &[PathSegment]) -> VisitResult<Self::Return> {
        if let Some(injection) = &node.base().injection {
            if injection.cases.is_empty() && injection.default.is_none() {
                self.push_error(path, "Invalid injection: Injection has no case".to_string());
            } else {
                for (eff, inj) in injection.cases() {
                    match inj {
                        InjectionSource::Static(value) => match serde_json::to_value(value) {
                            Ok(val) => {
                                eprintln!("({}) static injection: {val}", Path(path));
                            }
                            Err(e) => {
                                self.push_error(
                                        path,
                                        format!(
                                            "Error while parsing static injection value {value:?} for {}: {e:?}",
                                            eff.map(|eff| format!("{:?}", eff)).unwrap_or_else(|| "default".to_string())
                                        ),
                                    );
                            }
                        },
                        InjectionSource::Parent(_type_idx) => {
                            // TODO
                        }
                        _ => (),
                    }
                }
            }
            //
            VisitResult::Continue(false)
        } else {
            VisitResult::Continue(true)
        }
    }

    fn get_result(self) -> Option<Self::Return> {
        Some(self.errors)
    }
}
