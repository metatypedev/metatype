// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

// no relative import as this file is used in https://github.com/metatypedev/python-wasi-reactor

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends Record<string, unknown>
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

export type RustResult<O = unknown[]> = XOR<{ data: O }, { error: string }>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Memory {
  private memory: WebAssembly.Memory;
  private allocate: CallableFunction;
  private deallocate: CallableFunction;

  constructor(exports: WebAssembly.Exports) {
    this.memory = exports.memory as WebAssembly.Memory;
    this.allocate = exports.allocate as CallableFunction;
    this.deallocate = exports.deallocate as CallableFunction;
  }

  encode(...args: unknown[]): [number, number] {
    const size = args.length;
    const ptr = this.allocate(size * 2 * 4);
    const view = new DataView(this.memory.buffer, ptr, size * 2 * 4);

    for (let i = 0; i < size; i += 1) {
      if (typeof args[i] == "string") {
        const bytes = encoder.encode(args[i] as string);
        const ptrV = this.allocate(bytes.length);
        const viewV = new DataView(this.memory.buffer, ptrV, bytes.length);
        for (let j = 0; j < bytes.length; j += 1) {
          viewV.setUint8(j, bytes[j]);
        }

        view.setInt32(i * 2 * 4, ptrV, true);
        view.setInt32(i * 2 * 4 + 4, bytes.length, true);
      } else if (Number.isInteger(args[i])) {
        const len = 4;
        const ptrV = this.allocate(len);
        const viewV = new DataView(this.memory.buffer, ptrV, len);
        viewV.setInt32(0, args[i] as number, true);

        view.setInt32(i * 2 * 4, ptrV, true);
        view.setInt32(i * 2 * 4 + 4, len, true);
      } else {
        throw new Error(`type of "${args[i]}" not implemented`);
      }
    }

    return [ptr, size];
  }

  decode(n: number): RustResult {
    const ret = new DataView(this.memory.buffer, n, 9);
    const status = ret.getInt8(0);
    const ptr = ret.getInt32(1, true);
    const size = ret.getInt32(5, true);
    this.deallocate(n, 9);

    const p_data = new DataView(this.memory.buffer, ptr, size * 3 * 4);
    const p_values: number[] = [];
    for (let i = 0; i < size * 3; i += 1) {
      p_values[i] = p_data.getInt32(i * 4, true);
    }
    this.deallocate(ptr, size * 3 * 4);

    const values: any[] = [];
    for (let i = 0; i < size; i += 1) {
      const type = p_values[i * 3 + 1];
      const start = p_values[i * 3 + 0];
      const len = p_values[i * 3 + 2];
      values[i] = this.decodeType(type, start, len);
      this.deallocate(start, len);

      if (status == 1) {
        // error, stop at first iteration
        return { error: values[0] };
      }
    }

    return { data: values };
  }

  private decodeType(type: number, start: number, len: number) {
    switch (type) {
      case 31: // string
        return decoder.decode(this.memory.buffer.slice(start, start + len));
      case 1: {
        // u8
        const view = new DataView(this.memory.buffer, start, len);
        return view.getUint8(0);
      }
      default:
        throw new Error(`type ${type} not implemented`);
    }
  }
}
