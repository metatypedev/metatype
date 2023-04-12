// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::{
    collections::{HashSet, VecDeque},
    path::{Path, PathBuf},
    sync::Arc,
};

use tokio::sync::{oneshot, Mutex, Notify};

#[derive(Default)]
struct QueueInner {
    queue: VecDeque<Option<PathBuf>>,
    blocked: HashSet<PathBuf>,
    wait_list: HashSet<PathBuf>, // waiting to be unblocked to
    notify: Option<oneshot::Sender<()>>,
}

#[derive(Clone)]
pub struct Queue(Arc<Mutex<QueueInner>>);

#[must_use]
pub struct QueueEntryBlockGuard {
    queue: Queue,
    path: PathBuf,
    unblocked: bool,
}

impl QueueEntryBlockGuard {
    pub async fn unblock(mut self) {
        let mut queue = self.queue.0.lock().await;
        let removed = queue.wait_list.take(&self.path);
        if let Some(path) = removed {
            queue.queue.push_back(Some(path));
            queue.notify();
        }
        self.unblocked = true;
    }
}

impl Drop for QueueEntryBlockGuard {
    fn drop(&mut self) {
        if !self.unblocked {
            let queue = self.queue.clone();
            let path = std::mem::take(&mut self.path);
            tokio::task::spawn(async move {
                QueueEntryBlockGuard {
                    queue,
                    path,
                    unblocked: false,
                }
                .unblock()
                .await
            });
        }
    }
}

impl Queue {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(QueueInner::default())))
    }

    pub async fn push(&self, path: PathBuf) {
        let mut queue = self.0.lock().await;
        if queue.blocked.contains(&path) {
            queue.wait_list.insert(path);
        } else {
            let found = queue.queue.iter_mut().find(|p| p.as_ref() == Some(&path));
            if let Some(found) = found {
                // remove existing item
                found.take().unwrap();
            }
            queue.queue.push_back(Some(path));
            queue.notify();
        }
    }

    pub async fn next(&self) -> Option<(PathBuf, QueueEntryBlockGuard)> {
        let mut queue = self.0.lock().await;
        loop {
            match queue.queue.pop_front() {
                Some(next) => {
                    if next.is_some() {
                        break next.map(|next| {
                            (
                                next.clone(),
                                QueueEntryBlockGuard {
                                    queue: self.clone(),
                                    path: next,
                                    unblocked: false,
                                },
                            )
                        });
                    }
                    // empty item - skip
                }
                None => break None,
            }
        }
    }

    pub async fn block(&self, path: &Path) -> QueueEntryBlockGuard {
        let mut queue = self.0.lock().await;
        let mut reinsert = false;
        for p in queue.queue.iter_mut().filter(|e| e.is_some()) {
            if p.as_ref().filter(|&p| p == path).is_some() {
                *p = None;
                reinsert = true;
            }
        }
        if reinsert {
            queue.wait_list.insert(path.to_path_buf());
        }
        QueueEntryBlockGuard {
            queue: self.clone(),
            path: path.to_path_buf(),
            unblocked: false,
        }
    }

    pub async fn wait(&self) {
        let rx = {
            let mut queue = self.0.lock().await;
            if queue.queue.is_empty() {
                let (tx, rx) = oneshot::channel();
                if queue.notify.is_some() {
                    panic!("Inconsistent state");
                }
                queue.notify = Some(tx);
                rx
            } else {
                return;
            }
        };
        rx.await.unwrap();
    }
}

impl QueueInner {
    fn notify(&mut self) {
        if let Some(tx) = self.notify.take() {
            tx.send(()).unwrap();
        }
    }
}
