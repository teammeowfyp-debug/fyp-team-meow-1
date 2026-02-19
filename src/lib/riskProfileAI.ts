import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export interface RiskAnalysisParams {
  riskProfileCategory: string;
  investmentAllocation: string;
  cashflow: string;
  plansHeld: string;
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = 'gemini-3-flash-preview';

const SYSTEM_INSTRUCTION_BASE = `Role: You are a Financial Planning Consultant and Investment Analyst.

Objective: Synthesize data to determine if the client's current financial reality matches their stated risk appetite.

Data Inputs for Synthesis:
- Risk Profile Category: [e.g. Conservative, Balanced, Aggressive]
- Investment Allocation: [e.g. 60% Equities, 20% Fixed Income, 20% Cash]
- Cashflow: [e.g. Inflow, Outflow, Net]
- Plans Held: [e.g. Tax-advantaged accounts, Pensions, Insurance policies]

Analysis Requirements and Logic:
- Allocation Alignment: Does the current Asset Allocation match the volatility expected of their Risk Profile?
- Capacity vs. Tolerance: Does the client’s Cashflow provide the capacity to take the risk their Risk Profile suggests?
- Structural Analysis: Review Plans Held. Are there illiquid assets or locked-in plans that conflict with the client's need for flexibility?
- The "Gap": Identify the specific delta between where they are and where their profile says they should be.

Output:`;

async function* baseGenerateStream(params: RiskAnalysisParams, schema: any, outputInstruction: string) {
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const config = {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: schema,
    systemInstruction: [
      { text: `${SYSTEM_INSTRUCTION_BASE}\n${outputInstruction}\n- Ensure response is as concise as possible.` }
    ],
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Risk Profile Category: ${params.riskProfileCategory}
- Investment Allocation: ${params.investmentAllocation}
- Cashflow: ${params.cashflow}
- Plans Held: ${params.plansHeld}`,
        },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      config,
      contents,
    });

    for await (const chunk of response) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error) {
    console.error('Error in AI generation:', error);
    throw error;
  }
}

export async function* generateRiskAnalysis(params: RiskAnalysisParams) {
  const schema = {
    type: Type.OBJECT,
    required: ["Key Insights", "Potential Risks", "Recommendations"],
    properties: {
      "Key Insights": { type: Type.STRING },
      "Potential Risks": { type: Type.STRING },
      "Recommendations": { type: Type.STRING },
    },
  };
  const instruction = `- Key Insights: Bulleted insights based on synthesized data.
- Potential Risks: Any immediate dangers.
- Recommendations: Clear actions for the advisor to take.`;

  yield* baseGenerateStream(params, schema, instruction);
}

export async function* generateRiskSummary(params: RiskAnalysisParams) {
  const schema = {
    type: Type.OBJECT,
    required: ["Executive Summary"],
    properties: {
      "Executive Summary": { type: Type.STRING },
    },
  };
  const instruction = `- Executive Summary: A 2-sentence executive summary of the client's risk alignment`;

  yield* baseGenerateStream(params, schema, instruction);
}
