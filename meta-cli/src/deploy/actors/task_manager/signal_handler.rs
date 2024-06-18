// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use actix::WeakRecipient;
use once_cell::sync::Lazy;
use std::sync::Mutex;

struct CtrlCHandlerData {
    stop_recipient: WeakRecipient<super::message::Stop>,
}

static CTRLC_HANDLER_DATA: Lazy<Mutex<Option<CtrlCHandlerData>>> = Lazy::new(|| Mutex::new(None));

pub fn set_stop_recipient(recipient: WeakRecipient<super::message::Stop>) {
    let mut data = CTRLC_HANDLER_DATA.lock().unwrap();
    if let Some(data) = data.as_mut() {
        data.stop_recipient = recipient;
    } else {
        debug!("setting ctrlc handler");
        *data = Some(CtrlCHandlerData {
            stop_recipient: recipient,
        });
        let res = ctrlc::set_handler(ctrlc_handler);

        #[cfg(debug_assertions)]
        res.unwrap_or_log();

        #[cfg(not(debug_assertions))]
        if let Err(e) = res {
            error!("failed to set ctrlc handler: {}", e);
        }
    }
}

fn ctrlc_handler() {
    let data = CTRLC_HANDLER_DATA.lock().unwrap();
    if let Some(data) = data.as_ref() {
        if let Some(stop_recipient) = data.stop_recipient.upgrade() {
            stop_recipient.do_send(super::message::Stop);
        }
    }
    // else??
}
