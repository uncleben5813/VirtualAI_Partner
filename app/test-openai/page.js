 "use client";

import { useState } from "react";

export default function TestOpenAI() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-openai", { cache: "no-store" });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, stage: "browser", error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", padding: 24, background: "#0b1020",
      color: "#fff", fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{maxWidth: 700, margin: "40px auto"}}>
        <h1>OpenAI API Test</h1>
        <p>This checks the Vercel server environment and its connection to OpenAI.</p>
        <button onClick={runTest} disabled={loading}
          style={{padding:"12px 18px", borderRadius:10, border:0, cursor:"pointer"}}>
          {loading ? "Testing..." : "TEST OPENAI API"}
        </button>

        {result && (
          <pre style={{
            marginTop:20, padding:18, borderRadius:12,
            background:"#151b2f", whiteSpace:"pre-wrap", overflowWrap:"anywhere"
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        <p style={{marginTop:20, opacity:.75}}>
          Do not paste your secret API key here. The key itself is never displayed.
        </p>
      </div>
    </main>
  );
}
