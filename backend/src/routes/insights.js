import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { createSupabaseClient, supabase } from '../lib/supabase.js'
import { generateRiskAnalysis, generateRiskSummary } from '../services/geminiRisk.js'
import { generateMeetingNotes, generateMeetingSummary } from '../services/geminiMeetingNotes.js'

export const insightsRouter = Router()

// POST /ai/risk-summary
insightsRouter.post('/risk-summary', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskSummary(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// POST /ai/risk-analysis
insightsRouter.post('/risk-analysis', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskAnalysis(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// POST /ai/meeting-notes
insightsRouter.post('/meeting-notes', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateMeetingNotes(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// POST /ai/meeting-summary
insightsRouter.post('/meeting-summary', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateMeetingSummary(req.body)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})


// POST /ai/feedback
insightsRouter.post('/feedback', requireSupabaseAuth, async (req, res) => {
  try {
    const { client_id, rating, comment, generated_content, ai_type = 'risk_analysis' } = req.body
    if (!client_id || typeof rating !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields: client_id, rating' })
    }

    const { data, error } = await createSupabaseClient(req.token)
      .from('ai_feedback')
      .insert([
        {
          user_id: req.user.id,
          client_id,
          rating,
          comment,
          generated_content,
          ai_type,
        },
      ])

    if (error) throw error
    res.json({ success: true, message: 'Feedback stored successfully' })
  } catch (e) {
    console.error('Feedback Error:', e)
    res.status(500).json({
      error: e instanceof Error ? e.message : (e.message || 'Unknown error'),
      details: e
    })
  }
})

