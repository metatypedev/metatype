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

export async function doRequest(
  { auth, body, method, path }: GoogleRequest,
): Promise<GoogleResponse> {
  try {
    const baseUrl = "https://fcm.googleapis.com/v1/";
    const request = await fetch(baseUrl + path, {
      method,
      headers: {
        method: method ?? "GET",
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

export async function get(req: GoogleRequest) {
  req.method = "GET";
  return await doRequest(req);
}

export async function post(req: GoogleRequest) {
  req.method = "POST";
  return await doRequest(req);
}

export async function put(req: GoogleRequest) {
  req.method = "PUT";
  return await doRequest(req);
}

export async function patch(req: GoogleRequest) {
  req.method = "PATCH";
  return await doRequest(req);
}
