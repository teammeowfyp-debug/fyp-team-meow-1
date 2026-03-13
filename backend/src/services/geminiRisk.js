import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai'
import { env } from '../config/env.js'

let ai = null
function getAi() {
  if (!ai && env.geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: env.geminiApiKey })
  }
  return ai
}

const SYSTEM_INSTRUCTION_BASE = `Role: You are a Financial Planning Consultant and Investment Analyst.

Objective: Synthesize data to determine if the client's current financial reality matches their stated risk appetite.

Data Inputs for Synthesis:
- Risk Profile Category
- Investment Allocation
- Cashflow
- Plans Held

Analysis Requirements and Logic:
- Allocation Alignment: Does the current Asset Allocation match the volatility expected of their Risk Profile?
- Capacity vs. Tolerance: Does the client’s Cashflow provide the capacity to take the risk their Risk Profile suggests?
- Structural Analysis: Review Plans Held. Are there illiquid assets or locked-in plans that conflict with the client's need for flexibility?
- The "Gap": Identify the specific delta between where they are and where their profile says they should be.

Output:`

function buildContents(params) {
  return [
    {
      role: 'user',
      parts: [
        {
          text: `Risk Profile Category: ${params.riskProfileCategory}
- Risk Profile Description: ${params.riskProfileDescription}
- Investment Allocation: ${params.investmentAllocation}
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
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: schema,
    systemInstruction: [{ text: `${SYSTEM_INSTRUCTION_BASE}\n${instruction}\n- Ensure response is as concise as possible.` }],
  }

  const activeAi = getAi()
  const res = await activeAi.models.generateContent({
    model: env.geminiModel,
    config,
    contents: buildContents(params),
  })

  const text = res?.text ?? ''
  try {
    return JSON.parse(text)
  } catch {
    return { _raw: text }
  }
}

export async function generateRiskSummary(params) {
  const schema = {
    type: Type.OBJECT,
    required: ['Executive Summary'],
    properties: { 'Executive Summary': { type: Type.STRING } },
  }
  const instruction = "- Executive Summary: A 2-sentence executive summary of the client's risk alignment"
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
  const instruction = `- Key Insights: Concise insights based on synthesized data.
- Potential Risks: Any immediate dangers.
- Recommendations: Clear actions for the advisor to take.`
  const fallback = {
    "Key Insights": "AI functions are currently disabled to save tokens.",
    "Potential Risks": "AI functions are currently disabled to save tokens.",
    "Recommendations": "AI functions are currently disabled to save tokens."
  }
  return await generateJson({ params, schema, instruction, fallback })
}

