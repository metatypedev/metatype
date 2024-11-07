// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use actix::WeakRecipient;
use nix::libc::SIGHUP;
use once_cell::sync::Lazy;
use std::sync::{atomic::AtomicBool, Mutex};

use signal_hook::{
    consts::{SIGTERM, TERM_SIGNALS},
    flag,
    iterator::Signals,
};

struct CtrlCAndSignalHandlerData {
    stop_recipient: WeakRecipient<super::message::Stop>,
}

static SIGNAL_HANDLER_DATA: Lazy<Mutex<Option<CtrlCAndSignalHandlerData>>> =
    Lazy::new(|| Mutex::new(None));

pub fn set_stop_recipient(recipient: WeakRecipient<super::message::Stop>) {
    let mut data = SIGNAL_HANDLER_DATA.lock().unwrap();
    if let Some(data) = data.as_mut() {
        data.stop_recipient = recipient;
    } else {
        debug!("setting ctrlc handler");
        *data = Some(CtrlCAndSignalHandlerData {
            stop_recipient: recipient,
        });
        let res = ctrlc::set_handler(ctrlc_handler);

        #[cfg(debug_assertions)]
        res.unwrap_or_log();

        #[cfg(unix)]
        listen_signals_in_the_background();

        #[cfg(not(debug_assertions))]
        if let Err(e) = res {
            error!("failed to set ctrlc handler: {}", e);
        }
    }
}

fn ctrlc_handler() {
    handle_stop_signal();
}

#[cfg(unix)]
fn other_unix_signal_handler() {
    handle_stop_signal();
}

fn handle_stop_signal() {
    let data = SIGNAL_HANDLER_DATA.lock().unwrap();
    if let Some(data) = data.as_ref() {
        if let Some(stop_recipient) = data.stop_recipient.upgrade() {
            stop_recipient.do_send(super::message::Stop);
        }
    }
    // else??
}

pub fn listen_signals_in_the_background() {
    let mut signals = Signals::new([SIGTERM, SIGHUP]).unwrap();

    std::thread::spawn(move || {
        // Double signal kills
        let term_now = Arc::new(AtomicBool::new(false));
        for sig in TERM_SIGNALS {
            flag::register_conditional_shutdown(*sig, 1, Arc::clone(&term_now)).unwrap();
            flag::register(*sig, Arc::clone(&term_now)).unwrap();
        }

        for sig in signals.forever() {
            match sig {
                SIGTERM => {
                    debug!("SIGTERM: Request gracefull termination");
                    other_unix_signal_handler();
                }
                SIGHUP => {
                    debug!("SIGHUP: Death of controlling process");
                    other_unix_signal_handler();
                }
                _ => unreachable!(),
            }
        }
    });
}
