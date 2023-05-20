// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";

interface ChoicePickerP<T> {
  name: string;
  choices: Record<string, string>;
  choice: T;
  onChange: (choice: string) => void;
  className?: string;
}

export function ChoicePicker<T>({
  name,
  choices,
  choice,
  onChange,
  className,
}: ChoicePickerP<T>) {
  return (
    <ul className={`pl-0 m-0 list-none w-full ${className ?? ""}`}>
      {Object.entries(choices).map(([k, p]) => (
        <li key={k} className="inline-block rounded-md overflow-clip mr-1">
          <div>
            <label className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={k}
                checked={k === choice}
                onChange={() => onChange(k)}
                className="hidden peer"
              />
              <div className="px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white">
                {p}
              </div>
            </label>
          </div>
        </li>
      ))}
    </ul>
  );
}
