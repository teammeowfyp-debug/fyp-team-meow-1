import { apiClient } from './apiClient'

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

export async function runScenario(params: ScenarioParams): Promise<ScenarioResult> {
  const res = await apiClient('/ai/scenario', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return res.json() as Promise<ScenarioResult>
}

export async function runContributionScenario(params: ContributionParams): Promise<ContributionResult> {
  const res = await apiClient('/ai/scenario/contribution', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return res.json() as Promise<ContributionResult>
}
