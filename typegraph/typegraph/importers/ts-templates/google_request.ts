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
        method: "REQUEST_TYPE_PLACEHOLDER",
        authorization: auth,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const response = await request.json();
    // request ok
    return { success: true, response };
  } catch (err) {
    return { success: false, response: err };
  }
}
