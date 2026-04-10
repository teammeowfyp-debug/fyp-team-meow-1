import React from 'react';
import { FocusModal } from '../../UI/FocusModal';
import { Button } from '../../UI/Button';
import '../../Dashboard/Dashboard.css';
import { useClientForm } from '../../ClientForm/useClientForm';
import {
  PersonalInfoForm,
  FamilyForm,
  CashflowForm,
  InsuranceForm,
  InvestmentForm
} from '../../ClientForm/ClientFormSections';
import { MANDATORY_CLIENT_FIELDS } from '../../ClientForm/ClientFormComponents';

interface UpdateClientModalProps {
  clientId: string;
  onSuccess?: (newClientId?: string) => void;
  onClose: () => void;
}

export const UpdateClientModal: React.FC<UpdateClientModalProps> = ({ clientId, onSuccess, onClose }) => {
  const {
    fileInputRef, dragOver, file, step, setStep, error,
    extracted, existingClient, isNewClient,
    includeFamily, setIncludeFamily,
    includeCashflow, setIncludeCashflow,
    includeInsurance, setIncludeInsurance,
    includeInvestments, setIncludeInvestments,
    errorFields, activeTab, setActiveTab,
    handleFile, handleDrop, handleAnalyse, handleApply,
    handleClientFieldChange, handleFamilyMemberChange, addFamilyMember, removeFamilyMember,
    handleCashflowChange, handleInsurancePlanChange, addInsurancePlan, removeInsurancePlan,
    handleInvestmentChange, addInvestment, removeInvestment
  } = useClientForm(clientId, onSuccess, onClose);

  const modalContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
        <div className="modal-header" style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border, #eee)', padding: '2rem 2rem 1rem 2rem'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', color: 'var(--secondary)' }}>
            Update Client Profile
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted, #888)' }}>
            {!existingClient ? 'Loading...' : `Updating profile for ${existingClient?.name_as_per_id || existingClient?.full_name || 'Matched Client'}`}
          </p>
        </div>
      </div>

      {/* Body Area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>


        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'scroll' }}>
          {/* UPLOAD STEP */}
          {(step === 'upload' || step === 'extracting') && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '1.5rem 1rem 0rem 1rem' }}>
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
                  padding: '5rem 2rem',
                  cursor: 'pointer',
                  background: dragOver ? 'var(--primary-glow, rgba(197,179,88,0.05))' : 'rgba(0,0,0,0.01)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.25rem',
                  textAlign: 'center',
                  flex: 1
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

              {error && (
                <div className="standard-error-box" style={{ margin: '0 auto 1.5rem', justifyContent: 'center', width: 'fit-content' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* LOADING STATE FOR EXISTING CLIENT */}
          {!isNewClient && !extracted && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
              <div className="empty-state-icon" style={{ marginBottom: '1rem' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 15px var(--primary-glow))', animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}>
                  <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
                  <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
                </svg>
              </div>
              <p style={{ margin: 0, color: 'var(--secondary)', fontWeight: 600 }}>Loading Client Data</p>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Fetching the latest profile details...</p>
            </div>
          )}

          {/* REVIEW STEP - Form sections inside the scrollable modal-body */}
          {step === 'review' && extracted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem', flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(197,179,88,0.05)',
                border: '1px dashed var(--primary, #c5b358)',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
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
                  onClick={() => setStep('upload')}
                  style={{ borderRadius: '10px' }}
                >
                  Upload PDF
                </Button>
              </div>

              <div className="tabs-switcher">
                <Button variant="tab" isActive={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>Personal Information</Button>
                <Button variant="tab" isActive={activeTab === 'family'} onClick={() => setActiveTab('family')}>Family Members</Button>
                <Button variant="tab" isActive={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')}>Cashflow</Button>
                <Button variant="tab" isActive={activeTab === 'insurance'} onClick={() => setActiveTab('insurance')}>Insurance Plans</Button>
                <Button variant="tab" isActive={activeTab === 'investment'} onClick={() => setActiveTab('investment')}>Investment Plans</Button>
              </div>

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
                  includeFamily={includeFamily}
                  setIncludeFamily={setIncludeFamily}
                  handleFamilyMemberChange={handleFamilyMemberChange}
                  removeFamilyMember={removeFamilyMember}
                  addFamilyMember={addFamilyMember}
                />
              )}

              {activeTab === 'cashflow' && (
                <CashflowForm
                  extracted={extracted}
                  includeCashflow={includeCashflow}
                  setIncludeCashflow={setIncludeCashflow}
                  handleCashflowChange={handleCashflowChange}
                />
              )}

              {activeTab === 'insurance' && (
                <InsuranceForm
                  extracted={extracted}
                  includeInsurance={includeInsurance}
                  setIncludeInsurance={setIncludeInsurance}
                  handleInsuranceChange={handleInsurancePlanChange}
                  removeInsurance={removeInsurancePlan}
                  addInsurance={addInsurancePlan}
                />
              )}

              {activeTab === 'investment' && (
                <InvestmentForm
                  extracted={extracted}
                  includeInvestments={includeInvestments}
                  setIncludeInvestments={setIncludeInvestments}
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
            </div>
          )}

          {/* APPLYING STEP */}
          {step === 'applying' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid var(--border, #eee)', borderTopColor: 'var(--primary, #c5b358)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
              <h3 style={{ margin: 0, color: 'var(--secondary, #333)' }}>Saving Changes...</h3>
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted, #888)' }}>Updating the client profile with selected information.</p>
            </div>
          )}

          {/* DONE STEP */}
          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--success-glow, rgba(76,175,80,0.1))', color: 'var(--success, #4caf50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style={{ margin: 0, color: 'var(--secondary, #333)' }}>Profile Updated!</h3>
              <p style={{ margin: '8px 0 0', color: 'var(--text-muted, #888)', maxWidth: '280px' }}>The client profile has been updated successfully.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Unified for All Active Steps */}
      {(step === 'review' || step === 'upload' || step === 'extracting') && (
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border, #eee)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          {step === 'review' ? (
            <>
              {extracted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Button variant="outline" onClick={handleApply} style={{ minWidth: '200px' }}>
                    Update Client Profile
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="medium" onClick={() => setStep('review')} style={{ minWidth: '100px' }}>
                Cancel
              </Button>
              <Button variant="outline" size="medium" onClick={handleAnalyse} disabled={!file || step === 'extracting'} style={{ minWidth: '200px' }}>
                {step === 'extracting' ? 'Extracting...' : 'Extract'}
              </Button>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <FocusModal isOpen={true} onClose={onClose}>
      {modalContent}
    </FocusModal>
  );
};
