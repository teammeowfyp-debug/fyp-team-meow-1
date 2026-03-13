export interface ScenarioParams {
  initialPrincipal: number
  additionalContribution: number
  contributionFrequency: 'monthly' | 'quarterly' | 'annually'
  duration: number
  annualGrowthRate: number
}

export interface ScenarioResult {
  finalPrincipal: number
  breakdown: {
    fromInitial: number
    fromContributions: number
    totalContributed: number
    totalGrowth: number
  }
  inputs: {
    initialPrincipal: number
    additionalContribution: number
    contributionFrequency: string
    duration: number
    annualGrowthRate: number
    periodsPerYear: number
    totalPeriods: number
  }
}

export interface ContributionParams {
  initialPrincipal: number
  targetNetWorth: number
  currentAge: number
  targetAge: number
  contributionFrequency: 'monthly' | 'quarterly' | 'annually'
  annualGrowthRate: number
}

export interface ContributionResult {
  requiredContribution: number
  finalPrincipal: number
  breakdown: {
    fromInitial: number
    fromContributions: number
    totalContributed: number
    totalGrowth: number
  }
  inputs: {
    initialPrincipal: number
    targetNetWorth: number
    currentAge: number
    targetAge: number
    contributionFrequency: string
    annualGrowthRate: number
    periodsPerYear: number
    totalPeriods: number
    duration: number
  }
}

const backendUrl =
  (import.meta.env.VITE_AI_BACKEND_URL as string | undefined) || 'http://localhost:8080'

export async function runScenario(params: ScenarioParams): Promise<ScenarioResult> {
  const { data } = await (await import('./supabaseClient')).supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${backendUrl}/ai/scenario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const fieldErrors = body.fields ? Object.values(body.fields).join(' ') : ''
    throw new Error(fieldErrors || body.error || `Backend error (${res.status})`)
  }

  return res.json() as Promise<ScenarioResult>
}

export async function runContributionScenario(params: ContributionParams): Promise<ContributionResult> {
  const { data } = await (await import('./supabaseClient')).supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${backendUrl}/ai/scenario/contribution`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const fieldErrors = body.fields ? Object.values(body.fields).join(' ') : ''
    throw new Error(fieldErrors || body.error || `Backend error (${res.status})`)
  }

  return res.json() as Promise<ContributionResult>
}
