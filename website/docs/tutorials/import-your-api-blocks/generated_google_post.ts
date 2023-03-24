// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

interface GoogleRequest {
  path: string;
  method: string | undefined;
  auth: string; // Bearer token
  body: any | undefined; // Request body
}

interface GoogleResponse {
  success: boolean;
  response: any;
}

export default async function (
  { auth, body, method, path }: GoogleRequest,
): Promise<GoogleResponse> {
  try {
    const baseUrl = "https://fcm.googleapis.com/v1/";
    const request = await fetch(baseUrl + path, {
      method,
      headers: {
        method: "POST",
        authorization: auth,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const response = await request.json();
    // request ok
    console.log("got response", response);
    return { success: true, response };
  } catch (err) {
    console.error("got error", err);
    return { success: false, response: (err as any).message ?? err };
  }
}
