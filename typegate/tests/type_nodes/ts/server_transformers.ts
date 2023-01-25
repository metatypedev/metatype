// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

type IResponse = { code_status: number; data: string; timestamp: string } | {
  code_status: number;
  error_message: string;
};

interface IRequest {
  expected_response_type: "data" | "error";
}

export function get_response(request: IRequest): IResponse {
  switch (request.expected_response_type) {
    case "data":
      return {
        code_status: 200,
        data: "Hello World!",
        timestamp: "2023-01-01",
      };

    case "error":
      return {
        code_status: 400,
        error_message: "bad request",
      };
  }
}
