import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { env } from '../config/env.js'

let ai = null
function getAi() {
  if (!ai && env.geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: env.geminiApiKey })
  }
  return ai
}

/**
 * Generic utility to generate JSON responses from Gemini with consistent error handling and rate limiting.
 */
export async function generateGeminiJson({ 
  params, 
  schema, 
  systemInstruction, 
  userText,
  fallback,
  serviceName = 'Gemini'
}) {
  if (!env.geminiApiKey) {
    return fallback
  }

  const config = {
    temperature: 1,
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: schema,
    systemInstruction: [{ text: systemInstruction }],
  }

  try {
    const activeAi = getAi();
    const res = await activeAi.models.generateContent({
      model: env.geminiModel,
      config,
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
    });

    const text = res?.text ?? ''
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[${serviceName}] Failed to parse JSON. Raw text:`, text);
      return { _raw: text }
    }
  } catch (err) {
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      console.error(`[${serviceName}] RATE LIMIT EXCEEDED (429).`);
      throw new Error('AI Service is temporarily busy (Rate Limit). Please try again in 1-2 minutes.');
    }
    console.error(`[${serviceName}] Model call failed:`, err);
    throw err;
  }
}
