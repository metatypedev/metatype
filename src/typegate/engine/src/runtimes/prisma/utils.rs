// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use schema_connector::{BoxFuture, ConnectorHost, ConnectorResult};
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
