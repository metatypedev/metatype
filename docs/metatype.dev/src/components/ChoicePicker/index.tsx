// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React, { PropsWithChildren } from "react";

type NakedPickerP<T extends string> = PropsWithChildren<{
  choices: Record<T, string>;
  choice: T;
  renderChoice?: (selectedChild: React.ReactNode) => React.ReactNode;
}>;

export function NakedPicker<T extends string>({
  choices,
  choice,
  renderChoice,
  children,
}: NakedPickerP<T>) {
  const selectedChild = React.Children.toArray(children)
    .map((child) => {
      if (!React.isValidElement(child) || !choices[child.props?.value as T]) {
        throw new Error("ChoicePicker only accepts children with a value prop");
      }
      return child;
    })
    .find((child) => child.props?.value === choice);

  return renderChoice ? renderChoice(selectedChild) : selectedChild;
}

type ChoicePickerP<T extends string> = NakedPickerP<T> & {
  choices: Record<string, string>;
  onChange: (choice: T) => void;
  className?: string;
};

export function ChoicePicker<T extends string>({
  choices,
  choice,
  onChange,
  className,
  children,
}: ChoicePickerP<T>) {
  return (
    <NakedPicker
      choices={choices}
      choice={choice}
      renderChoice={(selectedChild) => (
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
                      onChange={() => onChange(value as T)}
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
          {selectedChild}
        </>
      )}
    >
      {children}
    </NakedPicker>
  );
}

type ChoiceP<T> = PropsWithChildren<{
  value: T;
}>;

export function Choice<T>({ children }: ChoiceP<T>) {
  return <>{children}</>;
}
