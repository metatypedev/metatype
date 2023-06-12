// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export function getChildId(parentId: string | null, node: string) {
  if (parentId === null || parentId === "") {
    return node;
  }
  return `${parentId}.${node}`;
}

export function getParentId(stageId: string) {
  const start = stageId.lastIndexOf(".");
  if (start < 0) {
    return null;
  }
  return stageId.slice(0, start);
}

// get the name of the nearest ascendant of stageId that is a child of parentId
export function getChildNode(
  parentId: string | null,
  stageId: string,
) {
  if (parentId === null) {
    const end = stageId.indexOf(".");
    return end < 0 ? stageId : stageId.slice(0, end);
  }

  if (!startsWith(stageId, parentId)) {
    throw new Error(`Stage ${parentId} is not an ascendant of ${stageId}`);
  }

  const prefixLength = parentId.length;
  const start = stageId.indexOf(".", prefixLength) + 1;
  if (start < 0) {
    return null;
  }
  const end = stageId.indexOf(".", start);
  return end < 0 ? stageId.slice(start) : stageId.slice(start, end);
}

export function startsWith(stageId: string, prefix: string) {
  if (!stageId.startsWith(prefix)) return false;

  const prefixLength = prefix.length;
  if (stageId.length === prefixLength) return true; // stageId === prefix

  const c = stageId.charAt(prefixLength);
  return c === "." || c === "$";
}
