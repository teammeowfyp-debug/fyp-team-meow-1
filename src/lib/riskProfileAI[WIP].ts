import { GoogleGenAI } from '@google/genai';

export interface RiskAnalysisParams {
  riskProfileCategory: string;
  investmentAllocation: string;
  cashflow: string;
  plansHeld: string;
}

/**
 * Generates a risk alignment analysis for a client.
 * Returns a stream of text.
 */
export async function* generateRiskAnalysis({
  riskProfileCategory,
  investmentAllocation,
  cashflow,
  plansHeld,
}: RiskAnalysisParams) {
  // In Vite/React apps, environment variables must start with VITE_ to be accessible client-side
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const config = {
    // Current compatible model for thinking/high-level synthesis
    model: 'gemini-1.5-flash',
    tools: [{ googleSearch: {} }],
    systemInstruction: {
      text: `Role: You are a Senior Financial Planning Consultant and Investment Analyst. Your goal is to provide a deep-dive risk alignment analysis for financial advisors.

Context: You are viewing a client’s dashboard. You have access to their designated Risk Profile Category and their raw financial data (Cashflow, Investment Allocation, and Plans Held).

Objective: Synthesize the disparate data points to determine if the client's current financial reality matches their stated risk appetite. Highlight discrepancies, concentration risks, and liquidity issues.

Data Inputs for Synthesis:
- Risk Profile Category: [e.g. Conservative, Moderate, Aggressive]
- Investment Allocation: [e.g. 80% Equities, 20% Bonds]
- Cashflow: [e.g. Monthly Surplus/Deficit, Savings Rate]
- Plans Held: [e.g. Tax-advantaged accounts, Pensions, Insurance policies]

Analysis Requirements and Logic:
- Alignment Check: Does the current Asset Allocation match the volatility expected of the [Risk Profile Category]?
- Capacity vs. Tolerance: Does the client’s Cashflow (surplus) provide the "capacity" to take the risk their "profile" suggests?
- Structural Analysis: Review Plans Held. Are there illiquid assets or locked-in plans that conflict with the client's need for flexibility?
- The "Gap" Summary: Identify the specific delta between where they are and where their profile says they should be.

Output Format:
- Executive Summary: A 2-sentence verdict on alignment.
- Data Synthesis (Key Insights): Bulleted insights connecting cashflow to risk.
- Red Flags: Any immediate dangers.
- Advisor Actionable Recommendation: One clear step for the advisor to take.`
    },
  };

  const contents = [
    {
      role: 'user',
      parts: [{
        text: `Risk Profile Category: ${riskProfileCategory}
- Investment Allocation: ${investmentAllocation}
- Cashflow: ${cashflow}
- Plans Held: ${plansHeld}`
      }],
    },
  ];

  try {
    const result = await ai.getGenerativeModel({ model: config.model })
      .generateContentStream({
        contents,
        tools: config.tools,
        systemInstruction: config.systemInstruction,
      });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (error) {
    console.error('Error generating risk analysis:', error);
    throw error;
  }
}
