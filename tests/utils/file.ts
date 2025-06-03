// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export async function printSourceFile(path: string) {
  const code = await Deno.readTextFile(path);
  printSourceCode(code);
}

function printSourceCode(code: string) {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineNo = String(i + 1).padStart(4, " ");
    console.log(`${lineNo}| ${lines[i]}`);
  }
}
