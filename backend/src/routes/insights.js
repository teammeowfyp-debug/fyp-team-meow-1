import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { createSupabaseClient, supabase } from '../lib/supabase.js'
import { generateRiskAnalysis, generateRiskSummary } from '../services/geminiRisk.js'
import { generateMeetingNotes, generateMeetingSummary } from '../services/geminiMeetingNotes.js'
import { sendGeminiError } from '../utils/geminiHttpError.js'
import { env } from '../config/env.js'

export const insightsRouter = Router()

// POST /ai/risk-summary
insightsRouter.post('/risk-summary', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskSummary(req.body)
    // Best-effort cache write (do not fail request if caching fails).
    try {
      const { client_id, start_date, end_date } = req.body || {}
      if (client_id) {
        await createSupabaseClient(req.token)
          .from('client_ai_analysis')
          .insert([
            {
              client_id,
              analysis_type: 'risk_summary_normal',
              start_date: start_date ?? null,
              end_date: end_date ?? null,
              content: json,
              model: env.geminiModel,
              prompt_version: 'risk_summary_v1',
            },
          ])
      }
    } catch (e) {
      console.warn('[insights/risk-summary] cache write failed:', e)
    }
    res.json(json)
  } catch (e) {
    return sendGeminiError(res, e, '[insights/risk-summary]')
  }
})

// POST /ai/risk-analysis
insightsRouter.post('/risk-analysis', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateRiskAnalysis(req.body)
    // Best-effort cache write (treat as "comprehensive" summary variant per UI).
    try {
      const { client_id, start_date, end_date } = req.body || {}
      if (client_id) {
        await createSupabaseClient(req.token)
          .from('client_ai_analysis')
          .insert([
            {
              client_id,
              analysis_type: 'risk_analysis_comprehensive',
              start_date: start_date ?? null,
              end_date: end_date ?? null,
              content: json,
              model: env.geminiModel,
              prompt_version: 'risk_analysis_v1',
            },
          ])
      }
    } catch (e) {
      console.warn('[insights/risk-analysis] cache write failed:', e)
    }
    res.json(json)
  } catch (e) {
    return sendGeminiError(res, e, '[insights/risk-analysis]')
  }
})

// POST /ai/meeting-notes
insightsRouter.post('/meeting-notes', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateMeetingNotes(req.body)
    res.json(json)
  } catch (e) {
    return sendGeminiError(res, e, '[insights/meeting-notes]')
  }
})

// POST /ai/meeting-summary
insightsRouter.post('/meeting-summary', requireSupabaseAuth, async (req, res) => {
  try {
    const json = await generateMeetingSummary(req.body)
    res.json(json)
  } catch (e) {
    return sendGeminiError(res, e, '[insights/meeting-summary]')
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
      error: e instanceof Error ? e.message : 'Unknown error',
    })
  }
})

