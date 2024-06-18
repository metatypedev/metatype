export namespace MetatypeTypegraphHost {
  export function print(s: string): void;
  export function expandPath(root: string, exclude: string[]): string[];
  export function pathExists(path: string): boolean;
  export function readFile(path: string): Uint8Array;
  export function writeFile(path: string, data: Uint8Array): void;
}
