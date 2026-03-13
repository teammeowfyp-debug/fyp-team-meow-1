/**
 * scenarioCalculator.js
 * Pure-math investment scenario calculator.
 * Formula: Future Value of a lump sum + Future Value of an annuity due.
 */

const FREQUENCY_MAP = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
}

/**
 * Validates and parses the input parameters.
 * Returns { values } on success or { errors } on failure.
 */
export function validateScenarioParams(raw) {
  const errors = {}

  const initialPrincipal = parseFloat(raw.initialPrincipal)
  const additionalContribution = parseFloat(raw.additionalContribution)
  const contributionFrequency = raw.contributionFrequency
  const duration = parseFloat(raw.duration)
  const annualGrowthRate = parseFloat(raw.annualGrowthRate)

  if (raw.initialPrincipal === undefined || raw.initialPrincipal === '' || isNaN(initialPrincipal)) {
    errors.initialPrincipal = 'Initial principal is required and must be a number.'
  } else if (initialPrincipal < 0) {
    errors.initialPrincipal = 'Initial principal cannot be negative.'
  }

  if (raw.additionalContribution === undefined || raw.additionalContribution === '' || isNaN(additionalContribution)) {
    errors.additionalContribution = 'Additional contribution is required and must be a number.'
  } else if (additionalContribution < 0) {
    errors.additionalContribution = 'Additional contribution cannot be negative.'
  }

  if (!contributionFrequency || !FREQUENCY_MAP[contributionFrequency]) {
    errors.contributionFrequency = `Contribution frequency must be one of: ${Object.keys(FREQUENCY_MAP).join(', ')}.`
  }

  if (raw.duration === undefined || raw.duration === '' || isNaN(duration)) {
    errors.duration = 'Duration is required and must be a number.'
  } else if (duration <= 0) {
    errors.duration = 'Duration must be greater than 0 years.'
  } else if (duration > 100) {
    errors.duration = 'Duration cannot exceed 100 years.'
  }

  if (raw.annualGrowthRate === undefined || raw.annualGrowthRate === '' || isNaN(annualGrowthRate)) {
    errors.annualGrowthRate = 'Annual growth rate is required and must be a number.'
  } else if (annualGrowthRate < 0) {
    errors.annualGrowthRate = 'Annual growth rate cannot be negative.'
  } else if (annualGrowthRate > 100) {
    errors.annualGrowthRate = 'Annual growth rate cannot exceed 100%.'
  }

  if (Object.keys(errors).length > 0) return { errors }

  return {
    values: { initialPrincipal, additionalContribution, contributionFrequency, duration, annualGrowthRate },
  }
}

/**
 * Calculates the investment scenario.
 * @param {object} params - Validated numeric parameters.
 */
export function calculateScenario({ initialPrincipal, additionalContribution, contributionFrequency, duration, annualGrowthRate }) {
  const periodsPerYear = FREQUENCY_MAP[contributionFrequency]
  const totalPeriods = duration * periodsPerYear
  const r = annualGrowthRate / 100 / periodsPerYear  // periodic rate

  // Future value of the initial lump sum
  const fromInitial = initialPrincipal * Math.pow(1 + r, totalPeriods)

  // Future value of the periodic contributions (ordinary annuity)
  let fromContributions
  if (r === 0) {
    fromContributions = additionalContribution * totalPeriods
  } else {
    fromContributions = additionalContribution * ((Math.pow(1 + r, totalPeriods) - 1) / r)
  }

  const finalPrincipal = fromInitial + fromContributions
  const totalContributed = initialPrincipal + additionalContribution * totalPeriods
  const totalGrowth = finalPrincipal - totalContributed

  return {
    finalPrincipal: round2(finalPrincipal),
    breakdown: {
      fromInitial: round2(fromInitial),
      fromContributions: round2(fromContributions),
      totalContributed: round2(totalContributed),
      totalGrowth: round2(totalGrowth),
    },
    inputs: {
      initialPrincipal,
      additionalContribution,
      contributionFrequency,
      duration,
      annualGrowthRate,
      periodsPerYear,
      totalPeriods,
    },
  }
}

/**
 * Calculates the required contribution to reach a target net worth.
 * @param {object} params - Validated numeric parameters.
 */
export function calculateRequiredContribution({ initialPrincipal, targetNetWorth, currentAge, targetAge, contributionFrequency, annualGrowthRate }) {
  const duration = targetAge - currentAge
  const periodsPerYear = FREQUENCY_MAP[contributionFrequency]
  const totalPeriods = duration * periodsPerYear
  const r = annualGrowthRate / 100 / periodsPerYear

  // Future value of the initial lump sum at target age
  const fvInitial = initialPrincipal * Math.pow(1 + r, totalPeriods)
  
  // The amount that needs to be generated through contributions
  const fvTarget = targetNetWorth - fvInitial

  // Required contribution per period (ordinary annuity)
  let requiredContribution
  if (r === 0) {
    requiredContribution = fvTarget / totalPeriods
  } else {
    // FV = P * ((1 + r)^n - 1) / r
    // P = FV * r / ((1 + r)^n - 1)
    requiredContribution = fvTarget * r / (Math.pow(1 + r, totalPeriods) - 1)
  }
  
  // If fvTarget <= 0, no additional contribution is needed
  if (requiredContribution < 0) {
     requiredContribution = 0
  }

  // Calculate final numbers for the breakdown 
  let fromContributions
  if (r === 0) {
    fromContributions = requiredContribution * totalPeriods
  } else {
    fromContributions = requiredContribution * ((Math.pow(1 + r, totalPeriods) - 1) / r)
  }
  
  const fromInitial = fvInitial
  const finalPrincipal = fromInitial + fromContributions
  const totalContributed = initialPrincipal + requiredContribution * totalPeriods
  const totalGrowth = finalPrincipal - totalContributed

  return {
    requiredContribution: round2(requiredContribution),
    finalPrincipal: round2(finalPrincipal),
    breakdown: {
      fromInitial: round2(fromInitial),
      fromContributions: round2(fromContributions),
      totalContributed: round2(totalContributed),
      totalGrowth: round2(totalGrowth),
    },
    inputs: {
      initialPrincipal,
      targetNetWorth,
      currentAge,
      targetAge,
      contributionFrequency,
      annualGrowthRate,
      periodsPerYear,
      totalPeriods,
      duration
    },
  }
}

/**
 * Validates and parses the input parameters for contribution calculation.
 * Returns { values } on success or { errors } on failure.
 */
export function validateContributionParams(raw) {
  const errors = {}

  const initialPrincipal = parseFloat(raw.initialPrincipal)
  const targetNetWorth = parseFloat(raw.targetNetWorth)
  const currentAge = parseInt(raw.currentAge, 10)
  const targetAge = parseInt(raw.targetAge, 10)
  const contributionFrequency = raw.contributionFrequency
  const annualGrowthRate = parseFloat(raw.annualGrowthRate)

  if (raw.initialPrincipal === undefined || raw.initialPrincipal === '' || isNaN(initialPrincipal)) {
    errors.initialPrincipal = 'Initial principal is required and must be a number.'
  } else if (initialPrincipal < 0) {
    errors.initialPrincipal = 'Initial principal cannot be negative.'
  }

  if (raw.targetNetWorth === undefined || raw.targetNetWorth === '' || isNaN(targetNetWorth)) {
    errors.targetNetWorth = 'Target net worth is required and must be a number.'
  } else if (targetNetWorth < 0) {
    errors.targetNetWorth = 'Target net worth cannot be negative.'
  }
  
  if (raw.currentAge === undefined || raw.currentAge === '' || isNaN(currentAge)) {
    errors.currentAge = 'Current age is required and must be an integer.'
  } else if (currentAge < 0) {
    errors.currentAge = 'Current age cannot be negative.'
  }
  
  if (raw.targetAge === undefined || raw.targetAge === '' || isNaN(targetAge)) {
    errors.targetAge = 'Target age is required and must be an integer.'
  } else if (targetAge <= currentAge) {
    errors.targetAge = 'Target age must be greater than current age.'
  } else if (targetAge > 120) {
    errors.targetAge = 'Target age cannot exceed 120.'
  }

  if (!contributionFrequency || !FREQUENCY_MAP[contributionFrequency]) {
    errors.contributionFrequency = `Contribution frequency must be one of: ${Object.keys(FREQUENCY_MAP).join(', ')}.`
  }

  if (raw.annualGrowthRate === undefined || raw.annualGrowthRate === '' || isNaN(annualGrowthRate)) {
    errors.annualGrowthRate = 'Annual growth rate is required and must be a number.'
  } else if (annualGrowthRate < 0) {
    errors.annualGrowthRate = 'Annual growth rate cannot be negative.'
  } else if (annualGrowthRate > 100) {
    errors.annualGrowthRate = 'Annual growth rate cannot exceed 100%.'
  }

  if (Object.keys(errors).length > 0) return { errors }

  return {
    values: { initialPrincipal, targetNetWorth, currentAge, targetAge, contributionFrequency, annualGrowthRate },
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}
