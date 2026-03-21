import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai'
import { env } from '../config/env.js'

let ai = null
function getAi() {
  if (!ai && env.geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: env.geminiApiKey })
  }
  return ai
}

const SYSTEM_INSTRUCTION_BASE = `Role: You are a Senior Financial Planning Consultant and Risk Strategist.

Analytical Framework (The 5 Core Pillars):
1. Temporal Context: Analyze the client's financial state specifically as it stood during the provided analysis period.
2. Allocation Alignment: Compare the current portfolio's volatility against the desired risk level in the profile.
3. Risk Capacity: Determine if there is sufficient liquidity (cashflow surplus and emergency funds) to support the desired risk appetite.
4. Structural Integrity: Identify conflicts such as illiquid assets, plan overlaps, or insurance coverage holes.
5. Gap Synthesis: Pinpoint the specific delta between the client's current reality and their target goals.

Constraints:
- Response MUST be professional and analytical.
- Do NOT hallucinate data — only reference financial figures from the provided context.

Output Requirements (FORMATTING IS CRITICAL):
- Do NOT use category headers or labels (e.g., "Structural Gap:").
- Do NOT use manual bullets like "-", "•", or "1.".
- FOR EACH SECTION: Return multiple sentences, each on its OWN NEW LINE. I want a raw block of text where every newline represents a new insight for my frontend to parse. Do not concatenate points into paragraphs.

Output Sections:`

function buildContents(params) {
  return [
    {
      role: 'user',
      parts: [
        {
          text: `Risk Profile Description: ${params.riskProfileDescription}
- Asset Allocation: ${params.assetAllocation}
- Cashflow: ${params.cashflow}
- Plans Held: ${params.plansHeld}`,
        },
      ],
    },
  ]
}

async function generateJson({ params, schema, instruction, fallback }) {
  if (!env.geminiApiKey) {
    return fallback
  }

  const config = {
    temperature: 1,
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: schema,
    systemInstruction: [{ text: `${SYSTEM_INSTRUCTION_BASE}\n${instruction}` }],
  }

  let res;
  try {
    const activeAi = getAi(); // Define locally just before use
    res = await activeAi.models.generateContent({
      model: env.geminiModel,
      config,
      contents: buildContents(params),
    });
  } catch (err) {
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      console.error('[GeminiRisk] RATE LIMIT EXCEEDED (429). Please wait before next request.');
      throw new Error('AI Service is temporarily busy (Rate Limit). Please try again in 1-2 minutes.');
    }
    console.error('[GeminiRisk] Model call failed:', err);
    throw err;
  }

  const text = res?.text ?? ''
  try {
    return JSON.parse(text);
  } catch {
    console.error('[GeminiRisk] Failed to parse JSON. Raw text:', text);
    return { _raw: text }
  }
}

export async function generateRiskSummary(params) {
  const schema = {
    type: Type.OBJECT,
    required: ['Executive Summary'],
    properties: { 'Executive Summary': { type: Type.STRING } },
  }
  const instruction = "- Executive Summary: A 3-sentence executive summary of the client's risk alignment"
  const fallback = { "Executive Summary": "AI functions are currently disabled to save tokens." }
  return await generateJson({ params, schema, instruction, fallback })
}

export async function generateRiskAnalysis(params) {
  const schema = {
    type: Type.OBJECT,
    required: ['Key Insights', 'Potential Risks', 'Recommendations'],
    properties: {
      'Key Insights': { type: Type.STRING },
      'Potential Risks': { type: Type.STRING },
      Recommendations: { type: Type.STRING },
    },
  }
  const instruction = `- Key Insights: High-level synthesis of alignment. Focus on 'Risk Capacity' vs 'Risk Tolerance'.
- Potential Risks: Highlight immediate vulnerabilities (e.g., liquidity gaps, concentration, or extreme misalignments).
- Recommendations: Specific, prioritized actions for the advisor to discuss.`
  const fallback = {
    "Key Insights": "AI functions are currently disabled to save tokens.",
    "Potential Risks": "AI functions are currently disabled to save tokens.",
    "Recommendations": "AI functions are currently disabled to save tokens."
  }
  return await generateJson({ params, schema, instruction, fallback })
}

