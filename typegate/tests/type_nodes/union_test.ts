// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Union type", async (t) => {
  const e = await t.pythonFile("type_nodes/union.py");

  const studentID = "b7831fd1-799d-4b20-9a84-830588f750a2";

  await t.should(
    "allow query type user extended from base model",
    async () => {
      await gql`
				query {
					student(id: ${studentID}) {
						# base fields
						id
						name
						age

						# specific fields for student
						school
					}
				}
			`
        .expectData({
          student: {
            id: studentID,
            name: "Student 1",
            age: 14,
            school: "The School",
          },
        })
        .on(e);
    },
  );

  await t.should(
    "fail to query fields not present on union type student",
    async () => {
      await gql`
				query {
					student(id: ${studentID}) {
						# base fields
						id
						name
						age

						# specific fields for student
						school

						# this field should not exist, it is only for workers
						company
					}
				}
			`
        .expectErrorContains("Q.student.company is undefined")
        .on(e);
    },
  );

  const workerID = "f9c1c81c-6f68-4203-8780-732ab4ba08da";

  await t.should(
    "allow query type worker extended from base model",
    async () => {
      await gql`
				query {
					worker(id: ${workerID}) {
						# base fields
						id
						name
						age

						# specific fields for worker
						company
					}
				}
			`
        .expectData({
          worker: {
            id: workerID,
            name: "Worker 1",
            age: 30,
            company: "The Company",
          },
        })
        .on(e);
    },
  );

  await t.should(
    "fail to query fields not present on union type worker",
    async () => {
      await gql`
				query {
					worker(id: ${workerID}) {
						# base fields
						id
						name
						age

						# specific fields for worker
						company

						# this field should not exist, it is only for students
						school
					}
				}
			`
        .expectErrorContains("Q.worker.school is undefined")
        .on(e);
    },
  );
});
