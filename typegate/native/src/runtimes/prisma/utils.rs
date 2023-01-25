// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use migration_connector::{BoxFuture, ConnectorHost, ConnectorResult};
use std::sync::{Arc, Mutex};

type StringBufferInner = Arc<Mutex<Option<String>>>;

pub struct StringBuffer {
    buffer: StringBufferInner,
}

impl StringBuffer {
    pub fn new(buffer: StringBufferInner) -> Self {
        Self { buffer }
    }
}

impl ConnectorHost for StringBuffer {
    fn print(&self, text: &str) -> BoxFuture<'_, ConnectorResult<()>> {
        self.buffer
            .lock()
            .unwrap()
            .as_mut()
            .expect("Host has bin closed")
            .push_str(text);
        Box::pin(std::future::ready(Ok(())))
    }
}
