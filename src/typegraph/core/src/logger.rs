// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
macro_rules! debug {
    ( $($arg:tt)* ) => {
        println!("debug: {}", format!($($arg)*));
    };
}

#[allow(unused)]
macro_rules! info {
    ( $($arg:tt)* ) => {
        println!("info: {}", format!($($arg)*));
    };
}

#[allow(unused)]
macro_rules! warning {
    ( $($arg:tt)* ) => {
        eprintln!("warning: {}", format!($($arg)*));
    };
}

#[allow(unused)]
macro_rules! error {
    ( $($arg:tt)* ) => {
        eprintln!("error: {}", format!($($arg)*));
    };
}

#[allow(unused)]
pub(crate) use debug;
#[allow(unused)]
pub(crate) use error;
#[allow(unused)]
pub(crate) use info;
#[allow(unused)]
pub(crate) use warning;
