interface Request {
  auth: string; // Bearer token
  body: unknown; // Request body
}

export default async function (
  { auth, body }: Request,
) {
  try {
    // use native api instead of HTTRuntime (authorization header not implemented yet)
    // const res = await req.json();
    // return { success: false, error: res.code };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
