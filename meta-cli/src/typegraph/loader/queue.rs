// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::{collections::VecDeque, future::ready, path::PathBuf};

#[derive(Default)]
pub struct Queue(VecDeque<Option<PathBuf>>);

impl Queue {
    pub fn push(&mut self, path: PathBuf) {
        let found = self.0.iter_mut().find(|p| p.as_ref() == Some(&path));
        if let Some(found) = found {
            // remove existing item
            found.take().unwrap();
        }
        self.0.push_back(Some(path));
    }

    pub async fn next(&mut self) -> Option<PathBuf> {
        loop {
            match self.0.pop_front() {
                Some(next) => {
                    if next.is_none() {
                        // item has been removed (requeued) -- skip
                        continue;
                    }
                    break ready(next).await;
                }
                // queue is empty
                None => break ready(None).await,
            }
        }
    }
}
