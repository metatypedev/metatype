use once_cell::sync::Lazy;
use std::sync::{Mutex, MutexGuard};

use crate::core;
use crate::types::T;

static TG: Lazy<Mutex<TypeGraph>> = Lazy::new(|| Mutex::new(TypeGraph { types: Vec::new() }));

pub fn tg() -> MutexGuard<'static, TypeGraph> {
    TG.lock().unwrap()
}

pub struct TypeGraph {
    types: Vec<T>,
}

impl TypeGraph {
    pub fn get(&self, id: u32) -> &T {
        self.types
            .get(id as usize)
            .unwrap_or_else(|| panic!("type {} not found in {:?}", id, self.types))
    }
    pub fn add(&mut self, tpe: T) -> core::Tpe {
        let id = self.types.len() as u32;
        self.types.push(tpe);
        core::Tpe { id }
    }
}
