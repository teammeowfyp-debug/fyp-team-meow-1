import React, { useState } from 'react';
import { runScenario, runContributionScenario } from '../lib/scenarioCalculator';
import type { ScenarioResult, ContributionResult } from '../lib/scenarioCalculator';
import './ScenarioCalculator.css';

type Frequency = 'monthly' | 'quarterly' | 'annually';
type Mode = 'future_value' | 'contribution';

interface FormValues {
  // Common
  initialPrincipal: string;
  contributionFrequency: Frequency;
  annualGrowthRate: string;
  
  // Future Value specific
  additionalContribution: string;
  duration: string;

  // Contribution specific
  targetNetWorth: string;
  currentAge: string;
  targetAge: string;
}

interface FormErrors {
  initialPrincipal?: string;
  additionalContribution?: string;
  duration?: string;
  annualGrowthRate?: string;
  targetNetWorth?: string;
  currentAge?: string;
  targetAge?: string;
}

const INITIAL_FORM: FormValues = {
  initialPrincipal: '',
  additionalContribution: '',
  contributionFrequency: 'monthly',
  duration: '',
  annualGrowthRate: '',
  targetNetWorth: '',
  currentAge: '',
  targetAge: '',
};

function validateForm(values: FormValues, mode: Mode): FormErrors {
  const errors: FormErrors = {};

  const ip = parseFloat(values.initialPrincipal);
  if (!values.initialPrincipal) errors.initialPrincipal = 'Required.';
  else if (isNaN(ip) || ip < 0) errors.initialPrincipal = 'Must be a non-negative number.';

  const gr = parseFloat(values.annualGrowthRate);
  if (!values.annualGrowthRate) errors.annualGrowthRate = 'Required.';
  else if (isNaN(gr) || gr < 0) errors.annualGrowthRate = 'Must be non-negative.';
  else if (gr > 100) errors.annualGrowthRate = 'Cannot exceed 100%.';

  if (mode === 'future_value') {
    const ac = parseFloat(values.additionalContribution);
    if (values.additionalContribution !== '' && (isNaN(ac) || ac < 0))
      errors.additionalContribution = 'Must be a non-negative number.';

    const d = parseFloat(values.duration);
    if (!values.duration) errors.duration = 'Required.';
    else if (isNaN(d) || d <= 0) errors.duration = 'Must be greater than 0.';
    else if (d > 100) errors.duration = 'Cannot exceed 100 years.';
  } else {
    const tnw = parseFloat(values.targetNetWorth);
    if (!values.targetNetWorth) errors.targetNetWorth = 'Required.';
    else if (isNaN(tnw) || tnw < 0) errors.targetNetWorth = 'Must be a non-negative number.';

    const ca = parseInt(values.currentAge, 10);
    if (!values.currentAge) errors.currentAge = 'Required.';
    else if (isNaN(ca) || ca < 0) errors.currentAge = 'Must be a non-negative number.';

    const ta = parseInt(values.targetAge, 10);
    if (!values.targetAge) errors.targetAge = 'Required.';
    else if (isNaN(ta)) errors.targetAge = 'Must be a number.';
    else if (!isNaN(ca) && ta <= ca) errors.targetAge = 'Must be greater than current age.';
    else if (ta > 120) errors.targetAge = 'Cannot exceed 120.';
  }

  return errors;
}

function fmt(n: number): string {
  return n.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

const ScenarioCalculator: React.FC = () => {
  const [mode, setMode] = useState<Mode>('future_value');
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [fvResult, setFvResult] = useState<ScenarioResult | null>(null);
  const [contribResult, setContribResult] = useState<ContributionResult | null>(null);

  // Contribution is "active" only when user enters a positive number, or always in contribution mode
  const hasContributions = mode === 'contribution' || parseFloat(form.additionalContribution) > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof FormValues]) {
      const updated = { ...form, [name]: value };
      const newErrors = validateForm(updated as FormValues, mode);
      setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validateForm(form, mode);
    setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
  };

  const handleModeChange = (newMode: Mode) => {
    if (newMode !== mode) {
      setMode(newMode);
      setErrors({});
      setTouched({});
      setApiError(null);
      setFvResult(null);
      setContribResult(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(form, mode);
    setErrors(validation);
    
    // Touch all relevant fields
    const toTouch: Partial<Record<keyof FormValues, boolean>> = {
      initialPrincipal: true,
      annualGrowthRate: true,
    };
    if (mode === 'future_value') {
      toTouch.additionalContribution = true;
      toTouch.duration = true;
    } else {
      toTouch.targetNetWorth = true;
      toTouch.currentAge = true;
      toTouch.targetAge = true;
    }
    setTouched(toTouch);

    if (Object.keys(validation).length > 0) return;

    setLoading(true);
    setApiError(null);
    try {
      if (mode === 'future_value') {
        const contrib = parseFloat(form.additionalContribution) || 0;
        const data = await runScenario({
          initialPrincipal: parseFloat(form.initialPrincipal),
          additionalContribution: contrib,
          contributionFrequency: hasContributions ? form.contributionFrequency : 'annually',
          duration: parseFloat(form.duration),
          annualGrowthRate: parseFloat(form.annualGrowthRate),
        });
        setFvResult(data);
        setContribResult(null);
      } else {
        const data = await runContributionScenario({
          initialPrincipal: parseFloat(form.initialPrincipal),
          targetNetWorth: parseFloat(form.targetNetWorth),
          currentAge: parseInt(form.currentAge, 10),
          targetAge: parseInt(form.targetAge, 10),
          contributionFrequency: form.contributionFrequency,
          annualGrowthRate: parseFloat(form.annualGrowthRate),
        });
        setContribResult(data);
        setFvResult(null);
      }
    } catch (err: any) {
      setApiError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setTouched({});
    setApiError(null);
    setFvResult(null);
    setContribResult(null);
  };

  const activeResult = mode === 'future_value' ? fvResult : contribResult;
  const contributedPct = activeResult ? pct(activeResult.breakdown.totalContributed, activeResult.finalPrincipal) : 0;
  const growthPct = activeResult ? pct(Math.max(0, activeResult.breakdown.totalGrowth), activeResult.finalPrincipal) : 0;

  return (
    <div className="scenario-page animate-fade">

      {/* ── Page Header ─────────────────────── */}
      <div className="scenario-hero">
        <div className="scenario-hero-icon">📈</div>
        <div>
          <h1 className="scenario-title">Investment Scenario Calculator</h1>
          <p className="scenario-subtitle">
            Project the future value of an investment based on your contributions and growth assumptions.
          </p>
        </div>
      </div>

      <div className="scenario-body">

        {/* ── Left: Parameters form ────────── */}
        <section className="glass-card scenario-form-card">
          
          <div className="sc-tabs">
            <button 
              type="button"
              className={`sc-tab ${mode === 'future_value' ? 'active' : ''}`}
              onClick={() => handleModeChange('future_value')}
            >
              Future Value
            </button>
            <button 
              type="button"
              className={`sc-tab ${mode === 'contribution' ? 'active' : ''}`}
              onClick={() => handleModeChange('contribution')}
            >
              Target Goal
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Row 1: Initial Principal (full width) */}
            <div className="sc-field">
              <label className="sc-label" htmlFor="initialPrincipal">
                Initial Principal
                <span className="sc-hint">Starting investment amount (SGD)</span>
              </label>
              <div className={`sc-input-group ${errors.initialPrincipal ? 'sc-input-error' : ''}`}>
                <span className="sc-affix sc-prefix">SGD</span>
                <input
                  id="initialPrincipal"
                  name="initialPrincipal"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="10,000"
                  value={form.initialPrincipal}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="sc-input"
                />
              </div>
              {errors.initialPrincipal && <p className="sc-error-msg">{errors.initialPrincipal}</p>}
            </div>

            {mode === 'future_value' && (
              <>
                <div className="sc-field">
                  <label className="sc-label" htmlFor="additionalContribution">
                    Additional Contribution
                    <span className="sc-hint">Regular top-up amount, leave blank or 0 for none</span>
                  </label>
                  <div className={`sc-input-group ${errors.additionalContribution ? 'sc-input-error' : ''}`}>
                    <span className="sc-affix sc-prefix">SGD</span>
                    <input
                      id="additionalContribution"
                      name="additionalContribution"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (optional)"
                      value={form.additionalContribution}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="sc-input"
                    />
                  </div>
                  {errors.additionalContribution && <p className="sc-error-msg">{errors.additionalContribution}</p>}
                </div>

                <div className="sc-field">
                  <label className="sc-label" htmlFor="duration">
                    Duration
                    <span className="sc-hint">Investment horizon</span>
                  </label>
                  <div className={`sc-input-group ${errors.duration ? 'sc-input-error' : ''}`}>
                    <input
                      id="duration"
                      name="duration"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      placeholder="10"
                      value={form.duration}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="sc-input"
                    />
                    <span className="sc-affix sc-suffix">yrs</span>
                  </div>
                  {errors.duration && <p className="sc-error-msg">{errors.duration}</p>}
                </div>
              </>
            )}

            {mode === 'contribution' && (
              <>
                <div className="sc-field">
                  <label className="sc-label" htmlFor="targetNetWorth">
                    Target Net Worth
                    <span className="sc-hint">Goal amount you want to reach (SGD)</span>
                  </label>
                  <div className={`sc-input-group ${errors.targetNetWorth ? 'sc-input-error' : ''}`}>
                    <span className="sc-affix sc-prefix">SGD</span>
                    <input
                      id="targetNetWorth"
                      name="targetNetWorth"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="1,000,000"
                      value={form.targetNetWorth}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="sc-input"
                    />
                  </div>
                  {errors.targetNetWorth && <p className="sc-error-msg">{errors.targetNetWorth}</p>}
                </div>
                
                <div className="sc-field-row">
                  <div className="sc-field">
                    <label className="sc-label" htmlFor="currentAge">
                      Current Age
                    </label>
                    <div className={`sc-input-group ${errors.currentAge ? 'sc-input-error' : ''}`}>
                      <input
                        id="currentAge"
                        name="currentAge"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="25"
                        value={form.currentAge}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="sc-input"
                      />
                    </div>
                    {errors.currentAge && <p className="sc-error-msg">{errors.currentAge}</p>}
                  </div>
                  
                  <div className="sc-field">
                    <label className="sc-label" htmlFor="targetAge">
                      Target Age
                    </label>
                    <div className={`sc-input-group ${errors.targetAge ? 'sc-input-error' : ''}`}>
                      <input
                        id="targetAge"
                        name="targetAge"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="65"
                        value={form.targetAge}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="sc-input"
                      />
                    </div>
                    {errors.targetAge && <p className="sc-error-msg">{errors.targetAge}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Frequency — only shown when contribution > 0 or in contribution mode */}
            {hasContributions && (
              <div className="sc-field sc-animate-in">
                <label className="sc-label" htmlFor="contributionFrequency">
                  Contribution Frequency
                  <span className="sc-hint">{mode === 'contribution' ? 'How often you will top-up' : 'How often the top-up is made'}</span>
                </label>
                <div className="sc-select-wrapper">
                  <select
                    id="contributionFrequency"
                    name="contributionFrequency"
                    value={form.contributionFrequency}
                    onChange={handleChange}
                    className="sc-select"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                  <svg className="sc-select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            )}

            {/* Annual Growth Rate — full width */}
            <div className="sc-field">
              <label className="sc-label" htmlFor="annualGrowthRate">
                Annual Growth Rate
                <span className="sc-hint">Expected yearly return</span>
              </label>
              <div className={`sc-input-group ${errors.annualGrowthRate ? 'sc-input-error' : ''}`}>
                <input
                  id="annualGrowthRate"
                  name="annualGrowthRate"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="6"
                  value={form.annualGrowthRate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="sc-input"
                />
                <span className="sc-affix sc-suffix">%</span>
              </div>
              {errors.annualGrowthRate && <p className="sc-error-msg">{errors.annualGrowthRate}</p>}
            </div>

            {/* API error */}
            {apiError && (
              <div className="sc-api-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {apiError}
              </div>
            )}

            {/* Actions */}
            <div className="sc-actions">
              <button type="submit" className="sc-btn-primary" disabled={loading}>
                {loading
                  ? <><span className="sc-spinner" /> Calculating…</>
                  : '📊 Calculate'
                }
              </button>
              {activeResult && (
                <button type="button" className="sc-btn-ghost" onClick={handleReset}>
                  Reset
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Right: Results ───────────────── */}
        <div className="scenario-results-col">
          {!activeResult && !loading && (
            <div className="scenario-empty-state glass-card">
              <div className="scenario-empty-icon">💡</div>
              <p className="scenario-empty-title">Enter your parameters</p>
              <p className="scenario-empty-sub">Fill in the form on the left and click <strong>Calculate</strong> to see your projected investment value.</p>
            </div>
          )}

          {activeResult && (
            <div className="sc-animate-in">
              {/* Final value hero */}
              <div className="glass-card sc-hero-card">
                {mode === 'future_value' ? (
                  <>
                    <p className="sc-hero-label">Projected Final Value</p>
                    <p className="sc-hero-value">SGD {fmt(activeResult.finalPrincipal)}</p>
                    <p className="sc-hero-sub">
                      {activeResult.inputs.duration} yr{activeResult.inputs.duration !== 1 ? 's' : ''}
                      {' · '}{activeResult.inputs.annualGrowthRate}% p.a.
                      {hasContributions && ` · SGD ${fmt((activeResult as ScenarioResult).inputs.additionalContribution)} ${activeResult.inputs.contributionFrequency}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="sc-hero-label">Required {activeResult.inputs.contributionFrequency.charAt(0).toUpperCase() + activeResult.inputs.contributionFrequency.slice(1)} Contribution</p>
                    <p className="sc-hero-value" style={{ color: 'var(--primary)', fontSize: '2.5rem' }}>
                      SGD {fmt((activeResult as ContributionResult).requiredContribution)}
                    </p>
                    <p className="sc-hero-sub" style={{ marginTop: '0.25rem' }}>
                      To reach <strong>SGD {fmt((activeResult as ContributionResult).inputs.targetNetWorth)}</strong> in <strong>{(activeResult as ContributionResult).inputs.duration} yrs</strong> at {activeResult.inputs.annualGrowthRate}% p.a.
                    </p>
                  </>
                )}

                {/* Stacked bar */}
                <div className="sc-bar-wrap" style={{ marginTop: '1.5rem' }}>
                  <div className="sc-bar-track">
                    <div className="sc-bar-seg sc-bar-capital" style={{ width: `${contributedPct}%` }} />
                    <div className="sc-bar-seg sc-bar-growth" style={{ width: `${growthPct}%` }} />
                  </div>
                  <div className="sc-bar-legend">
                    <span><span className="sc-dot sc-dot-capital" />Capital ({contributedPct}%)</span>
                    <span><span className="sc-dot sc-dot-growth" />Growth ({growthPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Breakdown grid */}
              <div className="sc-breakdown-grid">
                <div className="glass-card sc-stat">
                  <span className="sc-stat-icon">🏦</span>
                  <span className="sc-stat-label">From Initial Principal</span>
                  <span className="sc-stat-val">SGD {fmt(activeResult.breakdown.fromInitial)}</span>
                </div>
                {hasContributions && (
                  <div className="glass-card sc-stat">
                    <span className="sc-stat-icon">➕</span>
                    <span className="sc-stat-label">From Contributions</span>
                    <span className="sc-stat-val">SGD {fmt(activeResult.breakdown.fromContributions)}</span>
                  </div>
                )}
                <div className="glass-card sc-stat">
                  <span className="sc-stat-icon">💵</span>
                  <span className="sc-stat-label">Total Capital In</span>
                  <span className="sc-stat-val">SGD {fmt(activeResult.breakdown.totalContributed)}</span>
                </div>
                <div className={`glass-card sc-stat ${activeResult.breakdown.totalGrowth >= 0 ? 'sc-stat-positive' : 'sc-stat-negative'}`}>
                  <span className="sc-stat-icon">{activeResult.breakdown.totalGrowth >= 0 ? '📈' : '📉'}</span>
                  <span className="sc-stat-label">Total Growth</span>
                  <span className={`sc-stat-val ${activeResult.breakdown.totalGrowth >= 0 ? 'sc-text-success' : 'sc-text-danger'}`}>
                    {activeResult.breakdown.totalGrowth >= 0 ? '+' : ''}SGD {fmt(activeResult.breakdown.totalGrowth)}
                  </span>
                </div>
              </div>

              <p className="sc-disclaimer">
                This projection assumes a constant annual growth rate compounded at the selected frequency. For illustrative purposes only. Not financial advice.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioCalculator;
