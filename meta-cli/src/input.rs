// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO move this file

use actix::Addr;

use crate::deploy::actors::push_manager::PushManagerActor;

pub trait ConfirmHandler: std::fmt::Debug {
    fn on_confirm(&self, push_manager: Addr<PushManagerActor>);
    fn on_deny(&self, _push_manager: Addr<PushManagerActor>) {}
}

pub trait SelectOption: std::fmt::Display + std::fmt::Debug {
    fn on_select(&self, push_manager: Addr<PushManagerActor>);
}
