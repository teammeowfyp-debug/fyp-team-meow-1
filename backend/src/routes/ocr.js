import { Router } from 'express'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'

export const ocrRouter = Router()

// POST /ai/ocr
ocrRouter.post('/', requireSupabaseAuth, async (_req, res) => {
  res.status(501).json({ error: 'OCR endpoint not implemented yet' })
})

