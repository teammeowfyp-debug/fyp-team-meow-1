import { Type } from '@google/genai'
import { generateGeminiJson } from './geminiCore.js'

const MEETING_NOTES_SYSTEM_INSTRUCTION = `Role: You are a Financial Planning Meeting Analyst and Strategy Consultant.

Objective: Analyze the meeting transcript alongside the provided client financial data. Your goal is to synthesize the conversation into structured, expert-level notes that highlight the gap between the discussion and the client's financial reality.

Analytical Framework (The 5 Core Pillars):
1. Temporal Context: Validate all discussion points against the point-in-time financial data provided.
2. Allocation Alignment: Compare mentioned investment preferences in the meeting with their actual portfolio volatility.
3. Risk Capacity: Contrast meeting goals with their actual cashflow liquidity and emergency buffers.
4. Structural Integrity: Identify discrepancies between promised plans in the meeting vs. actual plans/insurance held.
5. Gap Synthesis: Summarize the final delta between the advisor's advice and the client's current status.

Constraints:
- Response MUST be professional and analytical.
- Do NOT hallucinate data — only reference financial figures from the provided context.

Output Requirements (FORMATTING IS CRITICAL):
- Do NOT use category headers or labels (e.g., "Structural Gap:").
- Do NOT use manual bullets like "-", "•", or "1.".
- FOR EACH SECTION: Return multiple sentences, each on its OWN NEW LINE. I want a raw block of text where every newline represents a new insight for my frontend to parse. Do not concatenate points into paragraphs.

Output Sections:`

function buildMeetingNotesPrompt(params) {
  return `Meeting Transcript:
${params.transcript}

Client Financial Context:
- Risk Profile Description: ${params.riskProfileDescription}
- Asset Allocation: ${params.assetAllocation}
- Cashflow: ${params.cashflow}
- Plans Held: ${params.plansHeld}`
}

export async function generateMeetingSummary(params) {
  const schema = {
    type: Type.OBJECT,
    required: ['Meeting Summary'],
    properties: { 'Meeting Summary': { type: Type.STRING } },
  }
  const instruction = "- Meeting Summary: A 3-sentence executive summary of the meeting's core takeaways."
  const fallback = { "Meeting Summary": "AI functions are currently disabled to save tokens." }

  return await generateGeminiJson({
    params,
    schema,
    systemInstruction: `${MEETING_NOTES_SYSTEM_INSTRUCTION}\n${instruction}`,
    userText: buildMeetingNotesPrompt(params),
    fallback,
    serviceName: 'GeminiNotes'
  })
}

export async function generateMeetingNotes(params) {
  const schema = {
    type: Type.OBJECT,
    required: ['Key Takeaways', 'Action Items', 'Financial Insights'],
    properties: {
      'Key Takeaways': { type: Type.STRING },
      'Action Items': { type: Type.STRING },
      'Financial Insights': { type: Type.STRING },
    },
  }
  const instruction = `- Key Takeaways: Summarize the main discussion points.
- Action Items: Extract specific, concrete next steps based on client and advisor commitments.
- Financial Insights: Cross-reference dialogue against client data, identify specific gaps.`
  const fallback = {
    'Key Takeaways': 'AI functions are currently disabled to save tokens.',
    'Action Items': 'AI functions are currently disabled to save tokens.',
    'Financial Insights': 'AI functions are currently disabled to save tokens.',
  }

  return await generateGeminiJson({
    params,
    schema,
    systemInstruction: `${MEETING_NOTES_SYSTEM_INSTRUCTION}\n${instruction}`,
    userText: buildMeetingNotesPrompt(params),
    fallback,
    serviceName: 'GeminiNotes'
  })
}
