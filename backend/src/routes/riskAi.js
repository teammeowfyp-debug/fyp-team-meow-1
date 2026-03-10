import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { generateRiskAnalysis, generateRiskSummary } from '../services/geminiRisk.js'

export const riskAiRouter = Router()

// POST /ai/risk-summary
riskAiRouter.post('/risk-summary', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskSummary(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

riskAiRouter.post('/risk-analysis', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskAnalysis(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

