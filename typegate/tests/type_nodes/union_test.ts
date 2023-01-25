// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Union type", async (t) => {
  const e = await t.pythonFile("type_nodes/union.py");

  await t.should(
    "fail to request fields that are not present in the returned response type",
    async () => {
      await gql`
      query {
        get_response(
					expected_response_type: "data"
				) {
					# shared field
					code_status

					# on good response
					data
					timestamp

					# on bad response (this field should not be allowed to be queried as the response type is "data" and it doesn't have this field)
					error_message
        }
      }
    `
        .expectErrorContains("'error_message' not found")
        .on(e);
    },
  );

  await t.should("return error response", async () => {
    await gql`
      query {
        get_response(
					expected_response_type: "error"
				) {
					code_status
					error_message
        }
      }
    `
      .expectData({})
      .on(e);
  });

  await t.should("return success response", async () => {
    await gql`
      query {
        get_response(
					expected_response_type: "data"
				) {
					code_status
					data
					timestamp
        }
      }
    `
      .expectData({})
      .on(e);
  });
});
