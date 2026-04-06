import express from 'express'
import cors from 'cors'
import { insightsRouter } from './routes/insights.js'
import { ocrRouter } from './routes/ocr.js'
import { scenarioRouter } from './routes/scenario.js'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // AI-related routes
  app.use('/ai', insightsRouter)          // /ai/risk-summary, /ai/risk-analysis, /ai/meeting-notes
  app.use('/ai/ocr', ocrRouter)        // /ai/ocr
  app.use('/ai/scenario', scenarioRouter) // /ai/scenario

  return app
}

