// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

type OS = "Android" | "iOS";
type Smartphone = {
  name: string;
  camera: number;
  battery: number;
  os: OS;
};

type BasicPhone = {
  name: string;
  camera?: number;
  battery: number;
};

type Phone = Smartphone | BasicPhone;
type ValidateInput = {
  phone: Phone;
};

type ValidateOutput = {
  message: string;
};

export function registerPhone(
  { phone }: ValidateInput,
  { context: _ }: { context: Record<string, unknown> },
): ValidateOutput {
  return {
    message: `${phone.name} registered`,
  };
}
