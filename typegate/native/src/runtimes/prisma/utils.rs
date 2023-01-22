// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::*;
use migration_connector::{BoxFuture, ConnectorHost, ConnectorResult};
use migration_core::{CoreError, GenericApi};
use std::{
    ops::Deref,
    sync::{Arc, Mutex},
};

type StringBufferInner = Arc<Mutex<Option<String>>>;

pub struct MigrationApi {
    api: Box<dyn GenericApi>,
    pub buffer: Arc<Mutex<Option<String>>>,
}

impl MigrationApi {
    pub fn new(datasource: String) -> Result<Self, CoreError> {
        let buffer: StringBufferInner = Arc::new(Mutex::new(Some("".to_owned())));
        Ok(Self {
            api: migration_core::migration_api(
                Some(datasource),
                Some(Arc::new(utils::StringBuffer {
                    buffer: Arc::clone(&buffer),
                })),
            )?,
            buffer,
        })
    }

    pub fn clear_buffer(&self) {
        self.buffer.lock().unwrap().as_mut().unwrap().clear();
    }

    pub fn close(self) -> String {
        self.buffer.lock().unwrap().take().unwrap()
    }
}

impl Deref for MigrationApi {
    type Target = Box<dyn GenericApi>;

    fn deref(&self) -> &Self::Target {
        &self.api
    }
}

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
