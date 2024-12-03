// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

async function readOutput(reader: ReadableStreamDefaultReader) {
  const decoder = new TextDecoder("utf-8");
  const buffer = await reader.read();
  const decoded = decoder.decode(buffer.value);

  return decoded;
}

async function writeToInput(
  writer: WritableStreamDefaultWriter,
  value: string,
) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  await writer.write(encoded);
}

export { readOutput, writeToInput };
