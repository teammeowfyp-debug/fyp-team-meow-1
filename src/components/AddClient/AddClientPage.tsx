import React from 'react';
import { Button } from '../UI/Button';
import '../Dashboard/Dashboard.css';
import { useClientForm } from '../ClientForm/useClientForm';
import {
  PersonalInfoForm,
  FamilyForm,
  CashflowForm,
  InsuranceForm,
  InvestmentForm
} from '../ClientForm/ClientFormSections';
import { MANDATORY_CLIENT_FIELDS } from '../ClientForm/ClientFormComponents';

interface AddClientPageProps {
  onSuccess?: (newClientId?: string) => void;
}

export const AddClientPage: React.FC<AddClientPageProps> = ({ onSuccess }) => {
  const {
    fileInputRef, dragOver, file, step, setStep, error,
    extracted, existingClient, isNewClient,
    errorFields, activeTab, setActiveTab,
    handleFile, handleDrop, handleAnalyse, handleApply,
    handleClientFieldChange, handleFamilyMemberChange, addFamilyMember, removeFamilyMember,
    handleCashflowChange, handleInsurancePlanChange, addInsurancePlan, removeInsurancePlan,
    handleInvestmentChange, addInvestment, removeInvestment
  } = useClientForm(undefined, onSuccess);

  return (
    <div className="scenario-page animate-fade-in">
      {/* ── Page Header ─────────────────────── */}
      <div className="scenario-hero glass-card no-hover">
        <div className="scenario-hero-icon" style={{ background: 'var(--primary-glow)', padding: '0.75rem', borderRadius: '50%' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
        </div>
        <div>
          <h1 className="scenario-title">Add Client</h1>
          <p className="scenario-subtitle">
            Onboard new clients by manually entering their data or autopopulating from a PDF.
          </p>
        </div>
      </div>

      <div className="scenario-body">
        {/* CASE 1: UPLOADING / EXTRACTING STATE (FULL SCREEN FOCUS) */}
        {(step === 'upload' || step === 'extracting') && (
          <section className="glass-card no-hover animate-fade-in" style={{ padding: '2rem 0.5rem 1.5rem 0.5rem', textAlign: 'center' }}>
            <div style={{ maxWidth: 'unset', margin: '0 2rem', textAlign: 'left' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--secondary, #333)', marginBottom: '4px' }}>Autopopulate via PDF</h2>
              <p style={{ color: 'var(--text-muted, #888)', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: 'var(--text-sm)', maxWidth: '600px' }}>
                Upload a Great Eastern life plan document to automatically extract client information.
              </p>

              <div
                onDragOver={e => { e.preventDefault(); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--primary, #c5b358)' : 'var(--border, #ddd)'}`,
                  borderRadius: '20px',
                  padding: '10rem 2rem',
                  cursor: 'pointer',
                  background: dragOver ? 'var(--primary-glow, rgba(197,179,88,0.05))' : 'rgba(0,0,0,0.01)',
                  transition: 'all 0.3s ease',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.25rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: 'var(--primary, #c5b358)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>

                {file ? (
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--secondary, #333)', fontSize: 'var(--text-lg)', margin: '0 0 4px' }}>{file.name}</p>
                    <p style={{ color: 'var(--text-muted, #888)', margin: 0, fontSize: 'var(--text-sm)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB — Click to change file</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--secondary, #333)', fontSize: 'var(--text-lg)', margin: '0 0 8px' }}>Drag & drop your PDF here</p>
                    <p style={{ color: 'var(--text-muted, #888)', margin: 0, fontSize: 'var(--text-sm)' }}>or click to browse from your computer</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file" accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {step === 'extracting' && (
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2.5px solid var(--border, #eee)', borderTopColor: 'var(--primary, #c5b358)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, color: 'var(--primary, #c5b358)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Analyzing contents...</p>
                </div>
              )}

              {error && step === 'upload' && !error.includes('Mandatory fields') && (
                <div className="standard-error-box" style={{ margin: '0 auto 1.5rem', justifyContent: 'center', width: 'fit-content' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '0.5rem' }}>
                <Button 
                  variant="outline" 
                  size="medium" 
                  onClick={() => {
                    setStep('review');
                  }} 
                  disabled={step === 'extracting'}
                >
                  Cancel
                </Button>
                <Button variant="outline" size="medium" onClick={handleAnalyse} disabled={!file || step === 'extracting'} style={{ minWidth: '200px' }}>
                  {step === 'extracting' ? 'Extracting...' : 'Extract'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* CASE 2: REVIEW / DONE / APPLYING STATES (TABS & FORM) */}
        {step !== 'upload' && step !== 'extracting' && (
          <>
            {/* Small Autopopulate Banner (Top Access) */}
            <section className="glass-card no-hover animate-fade-in" style={{ padding: '1.25rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(197,179,88,0.05)',
                border: '1px dashed var(--primary, #c5b358)',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem'
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--secondary, #333)', fontWeight: 600 }}>Autopopulate via PDF</h3>
                    <p style={{ margin: '0.25rem 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted, #888)' }}>
                      Extract data from a Great Eastern life plan to save time.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setStep('upload');
                  }}
                  style={{ borderRadius: '10px' }}
                >
                  Upload PDF
                </Button>
              </div>
            </section>

            {/* Main Form Card */}
            <section className="glass-card scenario-form-card no-hover animate-fade-in stagger-1" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="tabs-switcher">
                <Button variant="tab" isActive={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>Personal Information</Button>
                <Button variant="tab" isActive={activeTab === 'family'} onClick={() => setActiveTab('family')}>Family Members</Button>
                <Button variant="tab" isActive={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')}>Cashflow</Button>
                <Button variant="tab" isActive={activeTab === 'insurance'} onClick={() => setActiveTab('insurance')}>Insurance Plans</Button>
                <Button variant="tab" isActive={activeTab === 'investment'} onClick={() => setActiveTab('investment')}>Investment Plans</Button>
              </div>

              <div style={{ padding: '1.5rem 2rem 0rem 2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {step === 'applying' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>
                    <div style={{ width: '48px', height: '48px', border: '4px solid var(--border, #eee)', borderTopColor: 'var(--primary, #c5b358)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                    <h3 style={{ margin: 0, color: 'var(--secondary, #333)' }}>Adding Client Profile...</h3>
                  </div>
                )}

                {step === 'done' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--success-glow, rgba(76,175,80,0.1))', color: 'var(--success, #4caf50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3 style={{ margin: 0, color: 'var(--secondary, #333)' }}>Client Profile Added!</h3>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-muted, #888)' }}>Redirecting you to the client dashboard...</p>
                  </div>
                )}

                {step === 'review' && extracted && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                    {activeTab === 'personal' && (
                      <PersonalInfoForm
                        extracted={extracted}
                        existingClient={existingClient}
                        handleClientFieldChange={handleClientFieldChange}
                        errorFields={errorFields}
                        isNewClient={isNewClient}
                        MANDATORY_CLIENT_FIELDS={MANDATORY_CLIENT_FIELDS}
                      />
                    )}

                    {activeTab === 'family' && (
                      <FamilyForm
                        extracted={extracted}
                        includeFamily={true}
                        setIncludeFamily={() => { }}
                        handleFamilyMemberChange={handleFamilyMemberChange}
                        removeFamilyMember={removeFamilyMember}
                        addFamilyMember={addFamilyMember}
                      />
                    )}

                    {activeTab === 'cashflow' && (
                      <CashflowForm
                        extracted={extracted}
                        includeCashflow={true}
                        setIncludeCashflow={() => { }}
                        handleCashflowChange={handleCashflowChange}
                      />
                    )}

                    {activeTab === 'insurance' && (
                      <InsuranceForm
                        extracted={extracted}
                        includeInsurance={true}
                        setIncludeInsurance={() => { }}
                        handleInsuranceChange={handleInsurancePlanChange}
                        removeInsurance={removeInsurancePlan}
                        addInsurance={addInsurancePlan}
                      />
                    )}

                    {activeTab === 'investment' && (
                      <InvestmentForm
                        extracted={extracted}
                        includeInvestments={true}
                        setIncludeInvestments={() => { }}
                        handleInvestmentChange={handleInvestmentChange}
                        removeInvestment={removeInvestment}
                        addInvestment={addInvestment}
                      />
                    )}

                    {error && (
                      <div className="error-text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                      <Button variant="outline" onClick={handleApply} style={{ minWidth: '200px' }}>Add Client Profile</Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AddClientPage;
