// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Union type", async (t) => {
  const e = await t.pythonFile("type_nodes/union.py");

  await t.should(
    "allow query type user extended from base model",
    async () => {
      await gql`
				query {
					student(id: "student-1") {
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
          id: "student-1",
          name: "Student 1",
          age: 14,
          school: "The School",
        })
        .on(e);
    },
  );

  await t.should(
    "allow query type worker extended from base model",
    async () => {
      await gql`
				query {
					worker(id: "worker-1") {
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
          id: "worker-1",
          name: "Worker 1",
          age: 30,
          company: "The Company",
        })
        .on(e);
    },
  );
});
