export interface RiskAnalysisParams {
  riskProfileCategory: string;
  riskProfileDescription: string;
  investmentAllocation: string;
  cashflow: string;
  plansHeld: string;
}

const backendUrl =
  (import.meta.env.VITE_AI_BACKEND_URL as string | undefined) || 'http://localhost:8080';

async function* baseGenerateStream(params: RiskAnalysisParams, path: string) {
  // Pass the Supabase access token so the backend can verify the caller.
  const { data } = await (await import('./supabaseClient')).supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `AI backend error (${res.status})`);
  }

  const json = await res.json();
  // Keep the existing streaming contract used by RiskProfile.tsx (it builds a string then JSON.parse()).
  yield JSON.stringify(json);
}

export async function* generateRiskAnalysis(params: RiskAnalysisParams) {
  yield* baseGenerateStream(params, '/ai/risk-analysis');
}

export async function* generateRiskSummary(params: RiskAnalysisParams) {
  yield* baseGenerateStream(params, '/ai/risk-summary');
}

export async function submitAIFeedback(payload: {
  client_id: string;
  rating: boolean;
  comment?: string;
  generated_content?: string;
  ai_type?: string;
}) {
  const { data } = await (await import('./supabaseClient')).supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${backendUrl}/ai/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Feedback submission error (${res.status})`);
  }

  return await res.json();
}

