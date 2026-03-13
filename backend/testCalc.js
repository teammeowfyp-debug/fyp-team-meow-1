import { calculateRequiredContribution } from './src/services/scenarioCalculator.js';
import assert from 'assert';

console.log('Testing calculateRequiredContribution...');

// Test 1: No growth (r = 0), no initial
const test1 = calculateRequiredContribution({
  initialPrincipal: 0,
  targetNetWorth: 12000,
  currentAge: 30,
  targetAge: 31,
  contributionFrequency: 'monthly',
  annualGrowthRate: 0,
});
assert.strictEqual(test1.requiredContribution, 1000, 'Test 1: Should require $1000/month');
assert.strictEqual(test1.finalPrincipal, 12000);

// Test 2: With initial principal covering everything
const test2 = calculateRequiredContribution({
  initialPrincipal: 10000,
  targetNetWorth: 10000,
  currentAge: 30,
  targetAge: 40,
  contributionFrequency: 'annually',
  annualGrowthRate: 0,
});
assert.strictEqual(test2.requiredContribution, 0, 'Test 2: Should require $0/month');
assert.strictEqual(test2.finalPrincipal, 10000);

// Test 3: Standard case with growth
const test3 = calculateRequiredContribution({
  initialPrincipal: 10000,
  targetNetWorth: 1000000,
  currentAge: 25,
  targetAge: 65,  // Duration 40 years
  contributionFrequency: 'monthly',
  annualGrowthRate: 8,
});
console.log('Test 3 Result:', test3);
// fvInitial = 10000 * (1 + 0.08/12)^(40*12) = 10000 * (1.006666...)^480 ≈ 242,733.86
// fvTarget = 1,000,000 - 242,733.86 = 757,266.14
// reqContrib = 757,266.14 * (0.08/12) / ((1 + 0.08/12)^480 - 1) ≈ 216.59
assert.ok(Math.abs(test3.requiredContribution - 216.59) < 0.1, 'Test 3: Required contribution should be near 216.59');

console.log('All tests passed!');
