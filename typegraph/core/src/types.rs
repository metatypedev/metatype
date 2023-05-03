use enum_dispatch::enum_dispatch;
use serde::Serialize;
use std::collections::HashMap;

use crate::core::Tpe;

#[enum_dispatch]
pub trait TypeFun {
    fn getattr(&self, field: String) -> Option<Tpe>;
}

#[derive(Debug)]
#[enum_dispatch(TypeFun)]
pub enum T {
    Struct(Struct),
    Integer(Integer),
}

#[derive(Debug, Default, Serialize)]
pub struct Struct {
    pub props: HashMap<String, u32>,
}

impl TypeFun for Struct {
    fn getattr(&self, field: String) -> Option<Tpe> {
        self.props.get(&field).map(|x| Tpe { id: *x })
    }
}

#[derive(Debug, Default, Serialize, Clone)]
pub struct Integer {
    pub min: Option<i32>,
    pub max: Option<i32>,
}

impl TypeFun for Integer {
    fn getattr(&self, _field: String) -> Option<Tpe> {
        None
    }
}
