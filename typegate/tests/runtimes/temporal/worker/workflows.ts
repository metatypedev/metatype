// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as workflow from "@temporalio/workflow";

export const getValueQuery = workflow.defineQuery<string | undefined, [string]>(
  "getValue",
);
export const setValueSignal = workflow.defineSignal<
  [{ key: string; value: string }]
>(
  "setValue",
);

export async function keyValueStore(): Promise<void> {
  const state = new Map<string, string>();
  workflow.setHandler(
    setValueSignal,
    ({ key, value }) => {
      console.log({ key, value, state });
      return void state.set(key, value);
    },
  );
  workflow.setHandler(getValueQuery, (key) => {
    console.log({ key, state });
    return state.get(key);
  });
  await workflow.CancellationScope.current().cancelRequested;
}
