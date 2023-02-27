// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

type OS = "Android" | "iOS";

type Optional<T> = T | undefined | null;

type Metadata = {
  label: string;
  content: string;
  source: Optional<string>;
};

type Smartphone = {
  name: string;
  camera: number;
  battery: number;
  os: Optional<OS>;
  metadatas: Optional<Metadata[]>;
};

type BasicPhone = {
  name: string;
  camera: Optional<number>;
  battery: number;
  os: Optional<OS>;
  metadatas: Optional<Metadata[]>;
};

type Phone = Smartphone | BasicPhone;
type ValidateInput = {
  phone: Phone;
};

type ValidateOutput = {
  message: string;
  type: string;
  phone: Phone;
};

export function registerPhone(
  { phone }: ValidateInput,
  { context: _ }: { context: Record<string, unknown> },
): ValidateOutput {
  return {
    message: `${phone.name} registered`,
    type: (phone as any)?.os ? "Smartphone" : "Basic",
    phone,
  };
}
