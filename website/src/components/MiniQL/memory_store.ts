// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export class MemoryStorage {
  private map: Map<string, string>;
  public length: number;

  constructor() {
    this.map = new Map();
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.map.get(key);
  }

  setItem(key: string, value: string): void {
    if (!this.map.has(key)) {
      this.length += 1;
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    if (this.map.has(key)) {
      this.length -= 1;
    }
    this.map.delete(key);
  }

  clear(): void {
    this.length = 0;
    this.map.clear();
  }
}
