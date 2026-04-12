import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'

let ai = null
function getAi() {
  if (!ai && env.geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: env.geminiApiKey })
  }
  return ai
}

const EXTRACTION_PROMPT = `You are extracting structured client data from the text of a Great Eastern Financial Life Plan PDF.

Extract ONLY the fields listed below. If a field is not present or marked as "-", return null for that field.

Return a single JSON object with this exact structure:

{
  "client": {
    "name_as_per_id": string | null,
    "title": "Mr." | "Ms." | "Mrs." | null,
    "gender": "Male" | "Female" | null,
    "date_of_birth": string | null,
    "age": number | null,
    "marital_status": "Single" | "Married" | "Divorced" | "Widowed" | null,
    "smoker_status": "Smoker" | "Non-smoker" | null,
    "race": "Chinese" | "Malay" | "Indian" | "Caucasian" | "Others" | null,
    "qualification": string | null,
    "languages_spoken": string[] | null,
    "languages_written": string[] | null,
    "nationality": string | null,
    "singapore_pr": "Yes" | "No" | null,
    "id_type": "NRIC" | "Passport" | null,
    "id_no": string | null,
    "email": string | null,
    "mobile_no": string | null,
    "home_no": string | null,
    "office_no": string | null,
    "employment_status": "Full-time" | "Part-time" | "Contract" | "Self-employed" | "Freelance" | "Student" | "Unemployed" | "Retired" | null,
    "occupation": string | null,
    "address_type": "Local" | "Overseas" | null,
    "postal_district": string | null,
    "house_block_no": string | null,
    "street_name": string | null,
    "building_name": string | null,
    "unit_no": string | null,
    "risk_profile": "Level 1" | "Level 2" | "Level 3" | "Level 4" | null
  },
  "family": [
    {
      "family_member_name": string,
      "relationship": string,
      "gender": string | null,
      "date_of_birth": string | null,
      "age": number | null,
      "monthly_upkeep": number | null,
      "support_until_age": number | null,
      "years_to_support": number | null
    }
  ],
  "cashflow": {
    "employment_income_gross": number | null,
    "rental_income": number | null,
    "investment_income": number | null,
    "household_expenses": number | null,
    "income_tax": number | null,
    "insurance_premiums": number | null,
    "property_expenses": number | null,
    "property_loan_repayment": number | null,
    "non_property_loan_repayment": number | null,
    "cpf_contribution_total": number | null,
    "regular_investments": number | null,
    "total_inflow": number | null,
    "total_outflow": number | null,
    "net_position": number | null
  } | null,
  "insurance_plans": [
    {
      "policy_name": string,
      "policy_type": "Life Insurance" | "Health Insurance" | "General Insurance" | null,
      "life_assured": string | null,
      "sum_assured": number | null,
      "premium_amount": number | null,
      "payment_frequency": "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | null,
      "payment_term": number | null,
      "benefit_type": string | null,
      "start_date": string | null,
      "status": "Pending"
    }
  ],
  "investments": [
    {
      "policy_name": string,
      "policy_type": "Equity" | "Fixed Income" | "Cash" | null,
      "initial_investment": number | null,
      "contribution_amount": number | null,
      "contribution_frequency": "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | null,
      "start_date": string | null,
      "status": "Pending"
    }
  ]
}

FIELD MAPPING RULES:
- "date_of_birth" and all dates: ISO format YYYY-MM-DD
- "qualification": look in the Personal Details section near "Academic" or "Education".
- "employment_income_gross": Matches "Employment Income" line.
- "rental_income": Matches "Other Income - rental".
- "investment_income": Matches "Other Income - annuity income".
- "household_expenses": Matches "Personal Expenses" or "Living Expenses" header.
- "property_loan_repayment": Aggregate every instance of "Loan Repayments (Cash)" AND "Loan Repayments (CPF-OA)" found under property sections. 
- "property_expenses": Aggregate every instance of "Other Expenses" found under property sections.
- SECTION VALIDATION: sum("property_loan_repayment" + "property_expenses") MUST equal the "Capital Assets' Loans & Expenses" header total. If they do not match, you must re-scan for missing "Loan Repayments" line items.
- "cpf_contribution_total": Matches "Annual CPF Contribution". Note: This is informational and should not be added to Total Outflow.
- "regular_investments": Matches "Regular Investments".
- "total_inflow": Mathematical sum of employment_income_gross + rental_income + investment_income.
- "total_outflow": Mathematical sum of ALL individual outflow fields (household, property loan, property exp, tax, insurance, non-prop loan, cpf_contribution_total, regular_investments).
- CRITICAL: Your total_outflow MUST include the CPF component of loan repayments, even if the PDF's own "Total Outflow" summary line excludes it. Mathematical sum takes precedence.
- "net_position": total_inflow - total_outflow.
- "risk_profile" = the Level (1–4) shown as checked/selected in the Risk Profile Outcome section. Format as "Level 1", "Level 2", "Level 3", or "Level 4".
- "singapore_pr": Return exactly "Yes" or "No"
- Numbers: plain numbers, no currency symbols or commas
- Smoker Status: Look for text like "Smoker" and "Non-smoker" (or "Non smoker"). Identify which checkbox/box is marked (X, tick, filled, or highlighted). 
  - If the box next to "Non-smoker" is marked, return "Non-smoker". 
  - If the box next to "Smoker" is marked, return "Smoker". 
  - If the text literally says "Status: Non-smoker", return "Non-smoker". 
  - Be EXTREMELY picky; many forms default to showing both options. Only pick the one that is clearly indicated. Default to "Non-smoker" if the selection is ambiguous.
- "insurance_plans": extract from the FINANCIAL RECOMMENDATIONS or PLANS HELD sections. 
- "investments": extract from the ASSET ALLOCATION or PORTFOLIO sections. Map plan types to "Equity", "Fixed Income", or "Cash".
- Riders (e.g. "TPD Benefit Rider 2") should be separate entries in insurance_plans or mapped to the parent plan if possible.
- Family Section Layout: "Monthly Upkeep", "Age to support until", and "Number of years to Support" are often in a column.
  - "monthly_upkeep" is the amount for upkeep.
  - "support_until_age" is usually a high number like 88, 25, 23.
  - "years_to_support" is the number of years left.
  - BE CAREFUL: "Monthly Upkeep" is often blank in the PDF text. Do not mistakenly assign "Age to support until" or "Number of years to Support" to "monthly_upkeep". If "Monthly Upkeep" is blank, return null for it.
- Return ONLY the JSON object, no other text.`

/**
 * Extract structured client data directly from a PDF buffer using Gemini's native PDF understanding.
 */
export async function extractPdfData(pdfBuffer) {
  const activeAi = getAi()
  if (!activeAi) {
    throw new Error('Gemini API key not configured')
  }

  const res = await activeAi.models.generateContent({
    model: env.geminiModel,
    config: {
      responseMimeType: 'application/json',
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBuffer.toString('base64'),
            },
          },
        ],
      },
    ],
  })

  const text = res?.text ?? ''
  try {
    return JSON.parse(text)
  } catch {
    console.error('OCR JSON parse error. Raw text (first 500):', text.substring(0, 500))
    throw new Error('Failed to parse structured data from AI response')
  }
}
