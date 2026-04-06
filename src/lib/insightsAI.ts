import { apiClient } from './apiClient';

export interface RiskAnalysisParams {
  riskProfileDescription: string;
  assetAllocation: string;
  cashflow: string;
  plansHeld: string;
}

async function* baseGenerateStream(params: RiskAnalysisParams, path: string) {
  const res = await apiClient(path, {
    method: 'POST',
    body: JSON.stringify(params),
  });

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

export interface MeetingNotesParams extends RiskAnalysisParams {
  transcript: string;
}

export async function* generateMeetingNotes(params: MeetingNotesParams) {
  yield* baseGenerateStream(params, '/ai/meeting-notes');
}

export async function* generateMeetingSummary(params: MeetingNotesParams) {
  yield* baseGenerateStream(params, '/ai/meeting-summary');
}

export async function submitAIFeedback(payload: {
  client_id: string;
  rating: boolean;
  comment?: string;
  generated_content?: string;
  ai_type?: string;
}) {
  const res = await apiClient('/ai/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return await res.json();
}

