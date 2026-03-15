import { Router } from 'express'
import multer from 'multer'
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth.js'
import { extractPdfData } from '../services/geminiOcr.js'

export const ocrRouter = Router()

// Store file in memory (buffer), limit 20MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are accepted'))
    }
  },
})

// POST /ai/ocr
// Accepts a PDF file, extracts text, sends to Gemini, returns structured JSON
ocrRouter.post('/', requireSupabaseAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded. Use field name "pdf".' })
    }

    // Send PDF buffer directly to Gemini for native structural understanding
    const extracted = await extractPdfData(req.file.buffer)

    res.json({ success: true, data: extracted })
  } catch (err) {
    console.error('OCR Error:', err)

    if (err.message?.includes('Only PDF')) {
      return res.status(400).json({ error: err.message })
    }

    res.status(500).json({
      error: err instanceof Error ? err.message : 'OCR processing failed',
    })
  }
})

// Multer error handler
ocrRouter.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 20MB.' })
    }
  }
  if (err?.message?.includes('Only PDF')) {
    return res.status(400).json({ error: err.message })
  }
  res.status(500).json({ error: err?.message || 'Upload error' })
})
