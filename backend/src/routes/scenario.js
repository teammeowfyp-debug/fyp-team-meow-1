import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { validateScenarioParams, calculateScenario, validateContributionParams, calculateRequiredContribution } from '../services/scenarioCalculator.js'

export const scenarioRouter = Router()

// POST /ai/scenario
// Body: { initialPrincipal, additionalContribution, contributionFrequency, duration, annualGrowthRate }
scenarioRouter.post('/', requireSupabaseAuth, async (req, res) => {
  try {
    const { values, errors } = validateScenarioParams(req.body)

    if (errors) {
      return res.status(400).json({ error: 'Invalid input parameters.', fields: errors })
    }

    const result = calculateScenario(values)
    return res.json(result)
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// POST /ai/scenario/contribution
// Body: { initialPrincipal, targetNetWorth, currentAge, targetAge, contributionFrequency, annualGrowthRate }
scenarioRouter.post('/contribution', requireSupabaseAuth, async (req, res) => {
  try {
    const { values, errors } = validateContributionParams(req.body)

    if (errors) {
      return res.status(400).json({ error: 'Invalid input parameters.', fields: errors })
    }

    const result = calculateRequiredContribution(values)
    return res.json(result)
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})
