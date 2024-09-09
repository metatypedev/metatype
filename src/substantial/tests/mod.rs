#[cfg(test)]
mod tests {
    use std::{collections::HashMap, fmt::Debug, path::PathBuf, thread::sleep, time::Duration};

    use chrono::{DateTime, Utc};
    use serde_json::json;
    use substantial::{
        backends::{fs::FsBackend, BackendAgent, BackendMetadataWriter},
        converters::{MetadataEvent, Operation, OperationEvent, Run},
    };
    use substantial::{
        backends::{memory::MemoryBackend, BackendStore},
        protocol::events::Records,
    };

    #[test]
    fn test_write_and_read_events_raw_fs() {
        let root = PathBuf::from("tmp/test/substantial");
        let backend = FsBackend::new(root.clone()).unwrap();
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
    fn test_run_persist() {
        let mem_backend = MemoryBackend::default().unwrap();

        let root = PathBuf::from("tmp/test_one/substantial");
        let fs_backend = FsBackend::new(root.clone()).unwrap();
        std::fs::remove_dir_all(root).ok();

        let run_id = "some_run_id".to_string();

        let mut original_run = Run::new(run_id.clone());
        original_run.operations.push(Operation {
            at: DateTime::<Utc>::default().to_utc(),
            event: substantial::converters::OperationEvent::Start {
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

        assert_eq!(
            into_comparable(&original_run),
            into_comparable(&from_mem_run)
        );

        assert_eq!(
            into_comparable(&from_mem_run),
            into_comparable(&from_fs_run)
        );
    }

    #[test]
    fn test_basic_lease_state_consistency_logic() {
        let root = PathBuf::from("tmp/test_two/substantial");
        let backends = vec![
            Box::new(MemoryBackend::default().unwrap()),
            Box::new({
                let backend = FsBackend::new(root.clone()).unwrap();
                std::fs::remove_dir_all(root).ok();
                backend
            }),
        ];

        for backend in backends {
            let run_id = "some_run_id".to_string();
            let schedule = Utc::now();
            let queue = "test".to_string();

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

            // link metadata
            backend
                .write_workflow_link("example".to_string(), run_id.clone())
                .unwrap();
            let linked = backend.read_workflow_links("example".to_string()).unwrap();
            assert_eq!(linked.len(), 1);

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

            // lease acuire
            let lease = backend.acquire_lease(run_id.clone(), 123).unwrap();
            assert!(lease, "lease acquired");
            let lease2 = backend.acquire_lease(run_id.clone(), 123).unwrap();
            assert!(!lease2, "lease still held");

            // deserialize logic
            let schedule = backend
                .read_schedule(queue.clone(), run_id.clone(), schedule)
                .unwrap();
            let rec_operation: Operation = schedule.unwrap().try_into().unwrap();
            assert_eq!(
                into_comparable(&orig_operation),
                into_comparable(&rec_operation),
                "original vs persisted "
            );

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
            backend.renew_lease(run_id, lifetime).unwrap();
            let active_after_renew = backend.active_leases(lifetime).unwrap();

            assert_eq!(active_before_exp.len(), 2);
            assert_eq!(active_after_exp, vec!["infinitum".to_string()]);
            assert_eq!(active_after_renew.len(), 2);
        }
    }

    fn into_comparable<T: Debug>(value: &T) -> String {
        format!("{value:?}")
    }
}
