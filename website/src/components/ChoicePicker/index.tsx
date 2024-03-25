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
  choices,
  choice,
  onChange,
  className,
  children,
}: ChoicePickerP<T>) {
  const tab = React.Children.toArray(children)
    .map((child) => {
      if (!React.isValidElement(child) || !choices[child.props?.value]) {
        throw new Error("ChoicePicker only accepts children with a value prop");
      }
      return child;
    })
    .find((child) => child.props?.value === choice);

  return (
    <>
      <ul className={`pl-0 m-0 list-none text-sm ${className ?? ""}`}>
        {Object.entries(choices).map(([value, key]) => (
          <li
            key={value}
            className="inline-block rounded-md overflow-clip my-2 mr-2"
          >
            <div>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  value={value}
                  checked={value === choice}
                  onChange={() => onChange(value)}
                  className="hidden peer"
                />
                <div className="px-3 py-1 bg-slate-100 peer-checked:bg-metared peer-checked:text-white">
                  {key}
                </div>
              </label>
            </div>
          </li>
        ))}
      </ul>
      {tab}
    </>
  );
}
