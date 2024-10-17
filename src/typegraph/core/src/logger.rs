// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
macro_rules! debug {
    ( $($arg:tt)* ) => {
        {
            use std::fmt::Write as _;

            let mut msg = "debug: ".to_string();
            write!(&mut msg, $($arg)*).unwrap();
            println!("{msg}");
        }
    };
}

#[allow(unused)]
macro_rules! info {
    ( $($arg:tt)* ) => {
        {
            use std::fmt::Write as _;

            let mut msg = "info: ".to_string();
            write!(&mut msg, $($arg)*).unwrap();
            println!("{msg}");
        }
    };
}

#[allow(unused)]
macro_rules! warning {
    ( $($arg:tt)* ) => {
        {
            use std::fmt::Write as _;

            let mut msg = "warn: ".to_string();
            write!(&mut msg, $($arg)*).unwrap();
            println!("{msg}");
        }
    };
}

#[allow(unused)]
macro_rules! error {
    ( $($arg:tt)* ) => {
        {
            use std::fmt::Write as _;

            let mut msg = "error: ".to_string();
            write!(&mut msg, $($arg)*).unwrap();
            println!("{msg}");
        }
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
