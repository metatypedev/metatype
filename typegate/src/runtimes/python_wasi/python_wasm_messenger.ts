// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { AsyncMessenger } from "../patterns/messenger/async_messenger.ts";
import { PythonVirtualMachine } from "./python_vm.ts";

export class PythonWasmMessenger extends AsyncMessenger<
  Map<string, PythonVirtualMachine>,
  unknown,
  unknown
> {
  vmMap: Map<string, PythonVirtualMachine>;

  private constructor() {
    const vmMap = new Map<string, PythonVirtualMachine>();
    super(
      vmMap,
      (vmMap, { id, op, data }) => {
        const { vmId, args } = data as any;
        const vm = vmMap.get(vmId);
        if (!vm) {
          this.receive({ id, error: `vm "${vmId}" does not exist` });
        } else {
          vm.apply(id, op as string, [args])
            .then((res) => {
              this.receive({ id, data: res });
            })
            .catch((err) => {
              this.receive({ id, error: err });
            });
        }
      },
      () => {},
    );

    this.vmMap = vmMap;
  }

  static init(): PythonWasmMessenger {
    return new PythonWasmMessenger();
  }
}
