// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::Result;

use crate::backoff::{RetryConfig, RetryStrategy, Strategy};

#[test]
fn test_retry_strategy_linear() -> Result<()> {
    assert!(
        RetryStrategy::new(RetryConfig {
            min_backoff_ms: Some(-2.0),
            max_backoff_ms: None,
            max_retries: 5.0,
        })
        .is_err(),
        "min < 0"
    );

    assert!(
        RetryStrategy::new(RetryConfig {
            min_backoff_ms: Some(1.0),
            max_backoff_ms: Some(1.0),
            max_retries: 5.0,
        })
        .is_err(),
        "min >= max"
    );

    assert!(RetryStrategy::new(RetryConfig {
        min_backoff_ms: Some(0.0),
        max_backoff_ms: None,
        max_retries: 5.0,
    })
    .is_ok());

    let strategy = RetryStrategy::new(RetryConfig {
        min_backoff_ms: Some(2000.0),
        max_backoff_ms: None, // max_backoff_ms: Some(12000.0), // equivalent
        max_retries: 5.0,
    })?;

    assert_eq!(strategy.eval(Strategy::Linear, 5.0).unwrap(), 0000.0);
    assert_eq!(strategy.eval(Strategy::Linear, 4.0).unwrap(), 2000.0);
    assert_eq!(strategy.eval(Strategy::Linear, 3.0).unwrap(), 4000.0);
    assert_eq!(strategy.eval(Strategy::Linear, 2.0).unwrap(), 6000.0);
    assert_eq!(strategy.eval(Strategy::Linear, 1.0).unwrap(), 8000.0);
    assert_eq!(strategy.eval(Strategy::Linear, 0.0).unwrap(), 10000.0);
    assert!(strategy.eval(Strategy::Linear, -1.0).is_err());

    Ok(())
}
