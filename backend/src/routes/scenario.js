import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'

export const scenarioRouter = Router()

// POST /ai/scenario
scenarioRouter.post('/', requireSupabaseAuth, async (_req, res) => {
  res.status(501).json({ error: 'Scenario endpoint not implemented yet' })
})

