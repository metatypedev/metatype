// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { StringFormat } from "../types/typegraph.ts";
import * as uuid from "std/uuid/mod.ts";
import validator from "npm:validator";
import lodash from "npm:lodash";

export type ErrorEntry = [path: string, message: string];

export type FormatValidator = (value: string) => boolean;

export interface Validator {
  (value: unknown): void;
}

export interface ValidationContext {
  formatValidators: Record<StringFormat, FormatValidator>;
  deepEqual: <T>(left: T, right: T) => boolean;
}

const formatValidators: Record<StringFormat, FormatValidator> = {
  uuid: uuid.validate,
  json: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch (_e) {
      return false;
    }
  },
  email: validator.isEmail,
  // TODO validatorjs does not have a URI validator, so this is stricter than expected
  uri: (value: string) => {
    return validator.isDataURI(value) || validator.isURL(value, {
      require_protocol: true,
      require_valid_protocol: false,
      require_host: true,
      require_tld: false,
    });
  },
  // TODO
  hostname: validator.isFQDN,
  ean: validator.isEAN,
  phone: validator.isMobilePhone, // ??
  date: validator.isDate,
  "date-time": validator.isISO8601,
  "graphql-id": () => true,
};

export const validationContext: ValidationContext = {
  formatValidators,
  deepEqual: lodash.isEqual,
};

export interface ValidatorFn {
  (
    value: unknown,
    path: string,
    errors: Array<ErrorEntry>,
    context: ValidationContext,
  ): void;
}
