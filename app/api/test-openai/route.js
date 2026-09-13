export const runtime = "nodejs";

export async function GET() {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return Response.json({
      ok: false,
      stage: "environment",
      error: "OPENAI_API_KEY is missing from this deployment."
    }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${key}`
      },
      cache: "no-store"
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }

    if (!response.ok) {
      return Response.json({
        ok: false,
        stage: "openai_auth_or_account",
        httpStatus: response.status,
        errorType: data?.error?.type || null,
        errorCode: data?.error?.code || null,
        error: data?.error?.message || `OpenAI returned HTTP ${response.status}`
      }, { status: 502 });
    }

    return Response.json({
      ok: true,
      stage: "openai_connection",
      message: "OpenAI API key was accepted and the API responded.",
      modelCount: Array.isArray(data?.data) ? data.data.length : null
    });
  } catch (err) {
    return Response.json({
      ok: false,
      stage: "network",
      error: err?.message || "Could not reach OpenAI API."
    }, { status: 500 });
  }
}
