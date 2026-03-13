import { describe, it, expect } from 'vitest';
import { calculateScenario, calculateRequiredContribution } from './scenarioCalculator.js';

describe('Scenario Calculator Logic', () => {

  it('calculateScenario: Standard case', () => {
    const res = calculateScenario({
      initialPrincipal: 10000,
      additionalContribution: 500,
      contributionFrequency: 'monthly',
      duration: 10,
      annualGrowthRate: 6
    });
    
    // Future Value = 10000*(1.005)^120 + 500*(((1.005)^120 - 1)/0.005)
    // = 10000*1.8193967 + 500*(163.87934)
    // = 18193.97 + 81939.67 = 100133.64
    expect(Math.abs(res.finalPrincipal - 100133.64)).toBeLessThan(1);
    expect(res.breakdown.totalContributed).toBe(70000); // 10000 + 500*120
  });

  it('calculateScenario: Zero growth', () => {
    const res = calculateScenario({
      initialPrincipal: 10000,
      additionalContribution: 1000,
      contributionFrequency: 'annually',
      duration: 5,
      annualGrowthRate: 0
    });
    expect(res.finalPrincipal).toBe(15000);
    expect(res.breakdown.totalGrowth).toBe(0);
  });
});

describe('Required Contribution Logic', () => {

  it('calculateRequiredContribution: Standard case', () => {
    const res = calculateRequiredContribution({
      initialPrincipal: 10000,
      targetNetWorth: 1000000,
      currentAge: 25,
      targetAge: 65,
      contributionFrequency: 'monthly',
      annualGrowthRate: 8
    });
    
    // Duration = 40 years. r=0.08/12.
    // requiredContribution = ~216.92
    expect(Math.abs(res.requiredContribution - 216.92)).toBeLessThan(0.1);
    expect(res.finalPrincipal).toBe(1000000);
  });

  it('calculateRequiredContribution: Zero growth', () => {
    const res = calculateRequiredContribution({
      initialPrincipal: 0,
      targetNetWorth: 12000,
      currentAge: 30,
      targetAge: 31,
      contributionFrequency: 'monthly',
      annualGrowthRate: 0
    });
    expect(res.requiredContribution).toBe(1000);
  });
  
  it('calculateRequiredContribution: Already exceeded target', () => {
    const res = calculateRequiredContribution({
      initialPrincipal: 10000,
      targetNetWorth: 5000,
      currentAge: 30,
      targetAge: 40,
      contributionFrequency: 'annually',
      annualGrowthRate: 5
    });
    // FV of 10000 in 10 yrs at 5% is ~16288. Which is > 5000.
    // So required contribution should be capped at 0.
    expect(res.requiredContribution).toBe(0);
    expect(res.finalPrincipal).toBeGreaterThan(16288);
  });

});
