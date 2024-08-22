// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";

export default function BlogIntro({ text }: BlogIntroProps) {
  return (
    <div className="bg-gray-40 border-l-4 border-blue-500 p-4 my-4">
      <p className="text-lg font-light">{text}</p>
    </div>
  );
}

interface BlogIntroProps {
  text: string;
}
