// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{DirectedGraph as _, TypeIdx};
use std::{collections::HashMap, rc::Rc, sync::Arc};
use tg_schema::Typegraph;

pub struct KosarajuOne {
    pub tg: Arc<Typegraph>,
    transpose: Vec<Vec<TypeIdx>>,
    list: Vec<TypeIdx>,
    visited: Vec<bool>,
}

impl KosarajuOne {
    pub fn new(tg: Arc<Typegraph>) -> Self {
        let mut transpose = Vec::new();
        transpose.resize_with(tg.types.len(), Vec::new);
        let mut visited = Vec::new();
        visited.resize(tg.types.len(), false);
        Self {
            tg,
            transpose,
            list: Vec::new(),
            visited,
        }
    }

    fn run(&mut self) {
        for idx in 0..self.tg.types.len() {
            let idx = TypeIdx(idx as u32);
            self.visit(idx);
        }
    }

    fn visit(&mut self, idx: TypeIdx) {
        if self.is_visited(idx) {
        } else {
            self.set_visited(idx);
            for v in self.tg.out_neighbours(&idx) {
                self.visit(v);
                self.register_in_neighbour(v, idx);
            }
            self.list.push(idx);
        }
    }

    fn register_in_neighbour(&mut self, idx: TypeIdx, neighbour: TypeIdx) {
        self.transpose[idx.size()].push(neighbour);
    }

    fn is_visited(&self, type_idx: TypeIdx) -> bool {
        self.visited[type_idx.size()]
    }

    fn set_visited(&mut self, type_idx: TypeIdx) {
        self.visited[type_idx.size()] = true;
    }
}

pub struct Kosaraju {
    pub one: Rc<KosarajuOne>,
    pub components: HashMap<TypeIdx, Vec<TypeIdx>>,
    pub component_roots: Vec<Option<TypeIdx>>,
}

impl Kosaraju {
    pub fn new(tg: Arc<Typegraph>) -> Self {
        let mut one = KosarajuOne::new(tg);
        one.run();
        let mut assigned = Vec::new();
        assigned.resize(one.tg.types.len(), None);

        Self {
            one: one.into(),
            components: HashMap::new(),
            component_roots: assigned,
        }
    }

    pub fn run(&mut self) {
        let one = self.one.clone();
        for idx in one.list.iter().rev().cloned() {
            self.assign(idx, idx);
        }
    }

    fn assign(&mut self, vertex: TypeIdx, root: TypeIdx) {
        if !self.is_assigned(vertex) {
            self.component_roots[vertex.size()] = Some(root);
            self.components
                .entry(root)
                .and_modify(|l| l.push(vertex))
                .or_insert_with(|| vec![vertex]);
            let one = self.one.clone();
            for idx in &one.transpose[vertex.size()] {
                self.assign(*idx, root);
            }
        }
    }

    fn is_assigned(&self, vertex: TypeIdx) -> bool {
        self.component_roots[vertex.size()].is_some()
    }
}
