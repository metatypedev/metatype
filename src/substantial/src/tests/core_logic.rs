// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{collections::HashMap, path::PathBuf, thread::sleep, time::Duration};

use crate::{
    backends::{fs::FsBackend, redis::RedisBackend, Backend},
    converters::MetadataEvent,
    run::{Operation, OperationEvent, Run},
    tests::link_children_rec,
};
use crate::{
    backends::{memory::MemoryBackend, BackendStore},
    protocol::events::Records,
};
use chrono::{DateTime, Utc};
use redis::Script;
use serde_json::json;

#[test]
fn test_basic_write_and_read_events_raw_fs() {
    let root = PathBuf::from("tmp/test/substantial");
    let backend = FsBackend::new(root.clone()).get();
    let run_id = "test_run".to_string();

    let records = Records::new();

    backend
        .write_events(run_id.clone(), records.clone())
        .unwrap();

    assert!(root.exists());

    let read_records = backend.read_events(run_id).unwrap().unwrap();
    assert_eq!(read_records, records);
}

#[test]
fn test_basic_run_persist() {
    let mem_backend = MemoryBackend::default().get();

    let root = PathBuf::from("tmp/test_basic/substantial");
    let fs_backend = FsBackend::new(root.clone()).get();
    std::fs::remove_dir_all(root).ok();

    let run_id = "some_run_id".to_string();

    let mut original_run = Run::new(run_id.clone());
    original_run.operations.push(Operation {
        at: DateTime::<Utc>::default().to_utc(),
        event: crate::run::OperationEvent::Start {
            kwargs: serde_json::from_value(json!({
                "some": { "nested": { "json": 1234 } },
            }))
            .unwrap(),
        },
    });

    original_run.persist_into(&mem_backend).unwrap();
    original_run.persist_into(&fs_backend).unwrap();

    let mut from_mem_run = Run::new(run_id.clone());
    from_mem_run.recover_from(&mem_backend).unwrap();

    let mut from_fs_run = Run::new(run_id);
    from_fs_run.recover_from(&fs_backend).unwrap();

    debug_assert_eq!(original_run, from_mem_run);
    debug_assert_eq!(from_mem_run, from_fs_run);
}

#[test]
fn test_state_consistency_logic() {
    let backends: Vec<(&str, Box<dyn Backend>)> = vec![
        ("memory", Box::new(MemoryBackend::default().get())),
        (
            "fs",
            Box::new({
                let root = PathBuf::from("tmp/rust_test_state/substantial");
                let backend = FsBackend::new(root.clone()).get();
                std::fs::remove_dir_all(root).ok();
                backend
            }),
        ),
        (
            "redis",
            Box::new({
                let prefix = "rust_test_state";
                let backend = RedisBackend::new(
                    "redis://:password@localhost:6380/0".to_owned(),
                    Some(prefix.to_owned()),
                )
                .unwrap();
                backend
                    .with_redis(|r| {
                        let script = Script::new(r#"redis.call("FLUSHALL")"#);
                        script.invoke::<()>(r)
                    })
                    .unwrap();

                backend
            }),
        ),
    ];

    for (label, backend) in backends {
        println!("Testing backend {:?}", label);

        let run_id = "some_run_id".to_string();
        let schedule = Utc::now();
        let queue = "test".to_string();

        // runs
        let orig_operation = Operation {
            at: Utc::now(),
            event: OperationEvent::Start {
                kwargs: HashMap::new(),
            },
        };
        backend
            .add_schedule(
                queue.clone(),
                run_id.clone(),
                schedule,
                Some(orig_operation.clone().try_into().unwrap()),
            )
            .unwrap();

        let mut original_run = Run::new(run_id.clone());
        original_run.operations.push(Operation {
            at: DateTime::<Utc>::default().to_utc(),
            event: crate::run::OperationEvent::Start {
                kwargs: serde_json::from_value(json!({
                    "some": { "nested": { "json": 1234 } },
                }))
                .unwrap(),
            },
        });
        original_run.persist_into(backend.as_ref()).unwrap();

        let mut recovered_run = Run::new(run_id.clone());
        recovered_run.recover_from(backend.as_ref()).unwrap();
        debug_assert_eq!(original_run, recovered_run);

        // log metadata
        backend
            .append_metadata(run_id.clone(), Utc::now(), "1234".to_string())
            .unwrap();
        let metadata = backend
            .read_all_metadata(run_id.clone())
            .unwrap()
            .into_iter()
            .map(|proto| proto.try_into())
            .collect::<anyhow::Result<Vec<MetadataEvent>>>()
            .unwrap();
        assert_eq!(metadata.len(), 1);

        // lease acquire
        let lease = backend.acquire_lease(run_id.clone(), 123).unwrap();
        assert!(lease, "lease acquired");
        let lease2 = backend.acquire_lease(run_id.clone(), 123).unwrap();
        assert!(!lease2, "lease still held");

        // deserialize logic
        let schedule = backend
            .read_schedule(queue.clone(), run_id.clone(), schedule)
            .unwrap();
        let rec_operation: Operation = schedule.unwrap().try_into().unwrap();
        debug_assert_eq!(orig_operation, rec_operation, "original vs persisted ");

        // leased exclude logic
        let next_run = backend
            .next_run(queue.clone(), backend.active_leases(123).unwrap())
            .unwrap();
        assert!(next_run.is_none());

        backend.remove_lease(run_id.clone(), 123).unwrap();
        let next_run2 = backend
            .next_run(queue.clone(), backend.active_leases(123).unwrap())
            .unwrap();
        assert!(next_run2.is_some());

        // lease expire
        let lifetime = 1;
        let lease3 = backend.acquire_lease(run_id.clone(), lifetime).unwrap();
        let lease_infinitum = backend
            .acquire_lease("infinitum".to_string(), 10000000)
            .unwrap();
        assert!(lease3 && lease_infinitum, "lease acquired");

        let active_before_exp = backend.active_leases(lifetime).unwrap();

        sleep(Duration::from_secs(2));

        let active_after_exp = backend.active_leases(lifetime).unwrap();
        backend.renew_lease(run_id.clone(), lifetime).unwrap();
        let active_after_renew = backend.active_leases(lifetime).unwrap();

        assert_eq!(active_before_exp.len(), 2);
        assert_eq!(active_after_exp.len(), 1);
        assert_eq!(active_after_exp, vec!["infinitum".to_string()]);
        assert_eq!(active_after_renew.len(), 2);
    }
}

#[test]
fn test_hard_link() {
    let backends: Vec<(&str, Box<dyn Backend>)> = vec![
        ("memory", Box::new(MemoryBackend::default().get())),
        (
            "fs",
            Box::new({
                let root = PathBuf::from("tmp/test_three/substantial");
                let backend = FsBackend::new(root.clone()).get();
                std::fs::remove_dir_all(root).ok();
                backend
            }),
        ),
        (
            "redis",
            Box::new({
                let prefix = "rust_test_link";
                let backend = RedisBackend::new(
                    "redis://:password@localhost:6380/0".to_owned(),
                    Some(prefix.to_owned()),
                )
                .unwrap();
                backend
                    .with_redis(|r| {
                        let script = Script::new(r#"redis.call("FLUSHALL")"#);
                        script.invoke::<()>(r)
                    })
                    .unwrap();

                backend
            }),
        ),
    ];

    for (label, backend) in backends {
        println!("Testing backend {:?}", label);

        // link metadata
        backend
            .write_workflow_link("example".to_string(), "run_id_link_one".to_owned())
            .unwrap();
        backend
            .write_workflow_link("example".to_string(), "run_id_link_two".to_owned())
            .unwrap();

        let linked = backend.read_workflow_links("example".to_string()).unwrap();
        assert_eq!(linked.len(), 2);

        // parent child metadata
        let tree = json!({
            "parent1": {
                "child_11": {
                    "child_111": "child_1111",
                    "child_112": "child_1121",
                    "child_113": null,
                }
            },
            "parent2": null
        });

        link_children_rec(&tree, backend.as_ref()).unwrap();
        assert_eq!(
            backend
                .read_direct_children("parent1".to_owned())
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            backend
                .read_direct_children("child_11".to_owned())
                .unwrap()
                .len(),
            3
        );
        assert_eq!(
            backend
                .read_direct_children("parent2".to_owned())
                .unwrap()
                .len(),
            0
        );

        // collect all children
        let mut children = backend
            .enumerate_all_children("parent1".to_owned())
            .unwrap();
        children.sort();

        let mut expected = [
            "child_11",
            "child_112",
            "child_1121",
            "child_113",
            "child_111",
            "child_1111",
        ]
        .iter()
        .map(|s| s.to_owned())
        .collect::<Vec<_>>();
        expected.sort();

        assert_eq!(children, expected);
    }
}

#[test]
fn test_non_determinism() {
    let run_id = "abc".to_owned();
    let mut run = Run::new(run_id);
    run.operations.push(Operation {
        at: DateTime::<Utc>::default().to_utc(),
        event: crate::run::OperationEvent::Start {
            kwargs: serde_json::from_value(json!({ "a": 1234 })).unwrap(),
        },
    });
    run.operations.push(Operation {
        at: DateTime::<Utc>::default().to_utc(),
        event: crate::run::OperationEvent::Save {
            id: 1,
            value: crate::run::SavedValue::Resolved {
                payload: json!("version 1"),
            },
        },
    });

    let mut legit_new_run = run.clone();
    legit_new_run.operations.push(Operation {
        at: DateTime::<Utc>::default().to_utc(),
        event: crate::run::OperationEvent::Send {
            event_name: "pay".to_owned(),
            value: json!({"amount": 1234}),
        },
    });

    debug_assert_eq!(
        run.check_against_new(&legit_new_run)
            .map_err(|e| e.to_string()),
        std::result::Result::Ok(())
    );

    // Emuate bad timestamp
    let mut bad_timestamp = legit_new_run.clone();
    bad_timestamp.operations[1].at += Duration::from_millis(1);
    debug_assert_eq!(
            run.check_against_new(&bad_timestamp).map_err(|e| e.to_string()),
            std::result::Result::Err(
                "Workflow run is not deterministic: failed comparing Save(id=1, value=Payload) (old) and Save(id=1, value=Payload) (new), Schedule timestamp does not match"
                .to_owned()
            )
        );

    // Emulate comparing with an ongoing run (partial or has more events than old)
    let mut shorter_run = legit_new_run.clone();
    shorter_run.operations.pop();
    assert!(run
        .check_against_new(&shorter_run)
        .map_err(|e| e.to_string())
        .is_ok());

    // Emulate bad path in the middle
    let mut new_bad_path_inserted = legit_new_run.clone();
    new_bad_path_inserted.operations.insert(
        1,
        Operation {
            at: DateTime::<Utc>::default().to_utc(),
            event: crate::run::OperationEvent::Send {
                event_name: "pay".to_owned(),
                value: json!({"amount": 1234}),
            },
        },
    );

    debug_assert_eq!(
        run.check_against_new(&new_bad_path_inserted).map_err(|e| e.to_string()),
        std::result::Result::Err(
            "Workflow run is not deterministic: failed comparing Save(id=1, value=Payload) (old) and Send(event_name=\"pay\") (new), Events do not match"
            .to_owned()
        )
    );
}
