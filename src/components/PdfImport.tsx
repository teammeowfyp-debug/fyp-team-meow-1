import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthProvider';
import {
  parsePdfViaBackend,
  matchClientByIdNo,
  getClientById,
  createClientFromPdf,
  updateClientFromPdf,
  normalizeExtractedData,
  createEmptyExtractedData,
} from '../lib/pdfImport';
import type { PdfExtractedData } from '../lib/pdfImport';

interface PdfImportProps {
  /** If provided, restricts to the "returning client" flow for this client */
  clientId?: string;
  /** Called after a successful apply so the parent can refresh data */
  onSuccess?: (newClientId?: string) => void;
  onClose: () => void;
}

type Step = 'upload' | 'extracting' | 'review' | 'applying' | 'done';

const formatLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatValue = (val: any): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const CLIENT_FIELDS: Array<keyof PdfExtractedData['client']> = [
  'name_as_per_id', 'title', 'gender', 'date_of_birth', 'age', 'marital_status',
  'smoker_status', 'race', 'qualification', 'languages_spoken', 'languages_written',
  'nationality', 'singapore_pr', 'id_type', 'id_no',
  'email', 'mobile_no', 'home_no', 'office_no',
  'employment_status', 'occupation',
  'address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no',
  'risk_profile',
];

const INFLOW_FIELDS: string[] = [
  'employment_income_gross', 'rental_income', 'investment_income'
];

const OUTFLOW_FIELDS: string[] = [
  'household_expenses', 'property_loan_repayment', 'property_expenses',
  'income_tax', 'insurance_premiums', 'non_property_loan_repayment', 'regular_investments'
];

const SUPPLEMENTARY_FIELDS: string[] = [
  'cpf_contribution_total'
];

const ENUMS = {
  gender: ['Male', 'Female'],
  title: ['Mr.', 'Ms.', 'Mrs.'],
  marital_status: ['Single', 'Married', 'Divorced', 'Widowed'],
  smoker_status: ['Smoker', 'Non-smoker'],
  race: ['Chinese', 'Malay', 'Indian', 'Caucasian', 'Others'],
  singapore_pr: ['Yes', 'No'],
  id_type: ['NRIC', 'Passport'],
  employment_status: ['Full-time', 'Part-time', 'Contract', 'Self-employed', 'Freelance', 'Student', 'Unemployed', 'Retired'],
  address_type: ['Local', 'Overseas'],
  risk_profile: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
  qualification: ['Primary', 'Secondary', 'Diploma', 'Degree', 'Masters', 'PhD', 'Others'],
  nationality: ['Singaporean', 'Malaysian', 'Indonesian', 'Indian', 'Chinese', 'British', 'American', 'Australian', 'Others'],
  languages: ['English', 'Mandarin', 'Malay', 'Tamil', 'Hindi', 'Others'],
  relationship: ['Spouse', 'Child', 'Parent'],
  policy_type: ['Life Insurance', 'Health Insurance', 'General Insurance'],
  investment_type: ['Equity', 'Fixed Income', 'Cash', 'Bonds'],
  payment_frequency: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'],
  status: ['Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void']
};

export const PdfImport: React.FC<PdfImportProps> = ({ clientId, onSuccess, onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('review');
  const [error, setError] = useState<string | null>(null);

  const [extracted, setExtracted] = useState<PdfExtractedData | null>(null);
  const [existingClient, setExistingClient] = useState<any | null>(null);
  const [isNewClient, setIsNewClient] = useState(!clientId);

  // Selected sections for writing
  const [includeClient, setIncludeClient] = useState(true);
  const [includedClientFields, setIncludedClientFields] = useState<Set<string>>(new Set());
  const [includeFamily, setIncludeFamily] = useState(true);
  const [includeCashflow, setIncludeCashflow] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());

  // Debounced ID Check logic
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [showStatusBanner, setShowStatusBanner] = useState(!!clientId);

  // If clientId is provided, fetch the client immediately so the header shows their name
  useEffect(() => {
    if (clientId) {
      getClientById(clientId).then(data => {
        if (data) {
          setExistingClient(data);
          // When updating, we want to start with the existing data in the review form
          // Map existing data to PdfExtractedData structure
          const initialData: PdfExtractedData = {
            client: { ...data },
            family: data.client_family || [],
            cashflow: data.cashflow?.[0] || {},
            insurance_plans: data.client_insurance || [],
            investments: data.client_investments || [],
          };
          setExtracted(initialData);
          setStep('review'); // Ensure we go to review if we have data
          
          // Pre-select all fields for update
          const allFields = new Set<string>();
          CLIENT_FIELDS.forEach(f => allFields.add(`client.${f}`));
          setIncludedClientFields(allFields);
        }
      });
    } else {
      // Create mode: start with blank data
      setExtracted(createEmptyExtractedData());
      setStep('review');
      setIsNewClient(true);
      
      // Pre-select mandatory fields for new client
      const MANDATORY_CLIENT_FIELDS = [
        'name_as_per_id', 'gender', 'marital_status', 'smoker_status', 
        'race', 'nationality', 'singapore_pr', 'id_type', 'employment_status'
      ];
      setIncludedClientFields(new Set(MANDATORY_CLIENT_FIELDS.map(f => `client.${f}`)));
    }
  }, [clientId]);

  // Handle ID No check whenever it changes (debounced)
  useEffect(() => {
    if (clientId || !extracted?.client.id_no || extracted.client.id_no.length < 5) {
      if (!clientId) setShowStatusBanner(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingId(true);
      try {
        const match = await matchClientByIdNo(extracted.client.id_no || '');
        if (match) {
          setExistingClient(match);
          setIsNewClient(false);
        } else {
          setExistingClient(null);
          setIsNewClient(true);
        }
        setShowStatusBanner(true);
      } catch (err) {
        console.error('ID check error:', err);
      } finally {
        setIsCheckingId(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [extracted?.client.id_no, clientId]);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleAnalyse = async () => {
    if (!file) return;
    setStep('extracting');
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const rawData = await parsePdfViaBackend(file, token);
      const data = normalizeExtractedData(rawData);
      
      if (data.insurance_plans) {
        data.insurance_plans = data.insurance_plans.map(p => ({
          ...p,
          policy_type: p.policy_type || 'Life Insurance',
          life_assured: p.life_assured || data.client?.name_as_per_id || 'Client',
          start_date: p.start_date || new Date().toISOString().split('T')[0]
        }));
      }
      setExtracted(data);

      // Initialize fields where AI found something OR mandatory DB fields
      const autoIncluded = new Set<string>();
      const MANDATORY_CLIENT_FIELDS = [
        'name_as_per_id', 'gender', 'marital_status', 'smoker_status', 
        'race', 'nationality', 'singapore_pr', 'id_type', 'employment_status'
      ];
      CLIENT_FIELDS.forEach(f => {
        const rawVal = rawData.client[f as keyof typeof rawData.client];
        const hasSomething = rawVal !== null && rawVal !== undefined && rawVal !== '';
        if (hasSomething || MANDATORY_CLIENT_FIELDS.includes(f)) {
          autoIncluded.add(`client.${f}`);
        }
      });
      setIncludedClientFields(autoIncluded);

      // Initialize sections
      setIncludeFamily(data.family?.length > 0);
      setIncludeInsurance(data.insurance_plans?.length > 0);
      setIncludeInvestments(data.investments?.length > 0);
      setIncludeCashflow(!!data.cashflow || true); // Always offer cashflow if they want it
      
      setErrorFields(new Set());

      // Try to match existing client by ID number
      if (clientId) {
        // Returning client flow: we already know who it is, let's fetch them to do NRIC check and diff view
        const existing = await getClientById(clientId);

        if (existing?.id_no && data.client.id_no) {
          const existingNric = existing.id_no.replace(/\s+/g, '').toUpperCase();
          const newNric = data.client.id_no.replace(/\s+/g, '').toUpperCase();

          if (existingNric !== newNric) {
            throw new Error(`NRIC Mismatch! This PDF belongs to ${data.client.id_no}, but you are updating ${existing.full_name || 'a client'} with NRIC ${existing.id_no}.`);
          }
        }

        setIsNewClient(false);
        setExistingClient(existing || { client_id: clientId });
      } else if (data.client.id_no) {
        const match = await matchClientByIdNo(data.client.id_no);
        if (match) {
          setExistingClient(match);
          setIsNewClient(false);
        } else {
          setIsNewClient(true);
          setExistingClient(null);
        }
      } else {
        setIsNewClient(true);
        setExistingClient(null);
      }

      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to extract PDF data. Is the AI backend running?');
      setStep('upload');
    }
  };

  const handleApply = async () => {
    if (!extracted) return;
    setStep('applying');
    setError(null);

    try {
      const selectedFields = new Set<string>();
      if (includeClient) {
        includedClientFields.forEach(f => selectedFields.add(f));
      }
      if (includeFamily) selectedFields.add('family');
      if (includeCashflow) selectedFields.add('cashflow');
      if (includeInsurance) selectedFields.add('insurance');
      if (includeInvestments) selectedFields.add('investments');

      // Validation: "don't allow blanks" for included fields
      if (includeClient) {
        const errors = new Set<string>();
        for (const f of CLIENT_FIELDS) {
          const key = `client.${f}`;
          if (includedClientFields.has(key)) {
            const val = extracted.client[f];
            if (val === null || val === undefined || val === '') {
              errors.add(key);
            }
          }
        }
        if (errors.size > 0) {
          setErrorFields(errors);
          throw new Error(`Some included fields are blank. They have been highlighted in red. Please fill them or uncheck to exclude.`);
        }
      }

      // Family validation
      if (includeFamily && extracted.family?.length > 0) {
        const errors = new Set(errorFields);
        extracted.family.forEach((m, i) => {
          if (!m.family_member_name?.trim()) errors.add(`family.${i}.family_member_name`);
          if (!m.relationship?.trim()) errors.add(`family.${i}.relationship`);
        });
        if (errors.size > errorFields.size) {
          setErrorFields(errors);
          throw new Error(`Family member names and relationships cannot be blank.`);
        }
      }

      // Cashflow validation (optional values, but handleApply expects numbers or null)
      // Usually cashflow is okay to be 0 or null, so we skip strict "no blanks" unless user wants it.
      // But we should ensure dates aren't blank if we add as_of_date.
      
      // Insurance validation
      if (includeInsurance && extracted.insurance_plans?.length > 0) {
        const errors = new Set(errorFields);
        extracted.insurance_plans.forEach((p, i) => {
          if (!p.policy_name?.trim()) errors.add(`insurance.${i}.policy_name`);
          if (!p.policy_type?.trim()) errors.add(`insurance.${i}.policy_type`);
          if (!p.start_date) errors.add(`insurance.${i}.start_date`);
        });
        if (errors.size > errorFields.size) {
          setErrorFields(errors);
          throw new Error(`Insurance policy names, types, and start dates cannot be blank.`);
        }
      }

      // Investment validation
      if (includeInvestments && extracted.investments?.length > 0) {
        const errors = new Set(errorFields);
        extracted.investments.forEach((inv, i) => {
          if (!inv.policy_name?.trim()) errors.add(`investments.${i}.policy_name`);
          if (!inv.policy_type?.trim()) errors.add(`investments.${i}.policy_type`);
          if (!inv.start_date) errors.add(`investments.${i}.start_date`);
        });
        if (errors.size > errorFields.size) {
          setErrorFields(errors);
          throw new Error(`Investment policy names, types, and start dates cannot be blank.`);
        }
      }

      setErrorFields(new Set());

      let newId: string | undefined;

      if (isNewClient) {
        // Need the advisor's user_id from public.users
        const { data: profile } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', user?.email ?? '')
          .maybeSingle();

        const assignedUserId = profile?.user_id ?? null;
        newId = await createClientFromPdf(extracted, assignedUserId, selectedFields);
      } else {
        const cid = existingClient?.client_id || clientId;
        await updateClientFromPdf(cid, extracted, selectedFields);
        newId = cid; // Set this so the parent can navigate to their dashboard
      }

      setStep('done');
      setTimeout(() => {
        onSuccess?.(newId);
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes.');
      setStep('review');
    }
  };

  const toggleClientField = (field: string) => {
    setIncludedClientFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };  const handleClientFieldChange = (field: keyof PdfExtractedData['client'], newVal: any) => {
    const key = `client.${field}`;
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setIncludedClientFields(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setExtracted(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        client: {
          ...prev.client,
          [field]: newVal
        }
      };
    });
  };

  const handleFamilyMemberChange = (index: number, field: string, newVal: any) => {
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`family.${index}.${field}`);
      return next;
    });
    setExtracted(prev => {
      if (!prev) return prev;
      const nextFamily = [...prev.family];
      nextFamily[index] = { ...nextFamily[index], [field]: newVal };
      return { ...prev, family: nextFamily };
    });
  };

  const handleCashflowChange = (field: string, newVal: any) => {
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`cashflow.${field}`);
      return next;
    });
    setExtracted(prev => {
      if (!prev || !prev.cashflow) return prev;
      return {
        ...prev,
        cashflow: {
          ...prev.cashflow,
          [field]: newVal,
        },
      };
    });
  };

  const handleInsurancePlanChange = (index: number, field: string, newVal: any) => {
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`insurance.${index}.${field}`);
      return next;
    });
    setExtracted(prev => {
      if (!prev) return prev;
      const nextInsurance = [...prev.insurance_plans];
      nextInsurance[index] = { ...nextInsurance[index], [field]: newVal };
      return { ...prev, insurance_plans: nextInsurance };
    });
  };

  const handleInvestmentChange = (index: number, field: string, newVal: any) => {
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`investments.${index}.${field}`);
      return next;
    });
    setExtracted(prev => {
      if (!prev) return prev;
      const nextInvestments = [...prev.investments];
      nextInvestments[index] = { ...nextInvestments[index], [field]: newVal };
      return { ...prev, investments: nextInvestments };
    });
  };

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20000, padding: '2rem 1rem',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        width: '100%', maxWidth: '800px',
        maxHeight: 'calc(100vh - 4rem)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border, #eee)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--secondary, #333)' }}>
              {isNewClient ? 'Create Client Profile' : 'Update Client Profile'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
              {isNewClient 
                ? 'Fill details manually or autopopulate via PDF' 
                : `Updating profile for ${existingClient?.name_as_per_id || existingClient?.full_name || 'Matched Client'}`
              }
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', fontSize: '1.75rem',
            cursor: 'pointer', color: 'var(--text-muted, #888)', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

          {/* UPLOAD STEP */}
          {(step === 'upload' || step === 'extracting') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--primary, #c5b358)' : 'var(--border, #ddd)'}`,
                  borderRadius: '16px',
                  padding: '3rem 2rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: dragOver ? 'var(--primary-glow, rgba(197,179,88,0.05))' : 'rgba(0,0,0,0.01)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                {file ? (
                  <p style={{ fontWeight: 600, color: 'var(--secondary, #333)', margin: 0 }}>
                    {file.name}
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted, #888)', fontWeight: 400, marginTop: '4px' }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
                    </span>
                  </p>
                ) : (
                  <>
                    <p style={{ fontWeight: 600, color: 'var(--secondary, #333)', margin: '0 0 4px' }}>
                      Drag & drop your PDF here
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
                      or click to browse
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file" accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {error && (
                <p style={{ margin: 0, color: '#c0392b', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center' }}>
                  ⚠ {error}
                </p>
              )}

              {step === 'extracting' && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: '0.9rem' }}>
                  <div style={{
                    display: 'inline-block', width: '28px', height: '28px',
                    border: '3px solid var(--border, #ddd)',
                    borderTopColor: 'var(--primary, #c5b358)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '0.75rem',
                  }} />
                  <p style={{ margin: 0 }}>Extracting — this may take 10–20 seconds…</p>
                </div>
              )}
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && extracted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Status banner - only shown when relevant */}
              {showStatusBanner && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                  background: isNewClient ? 'rgba(113,146,102,0.1)' : 'rgba(197,179,88,0.1)',
                  color: isNewClient ? '#2e7d32' : 'var(--primary, #c5b358)',
                  border: `1px solid ${isNewClient ? 'rgba(113,146,102,0.3)' : 'rgba(197,179,88,0.3)'}`,
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {isCheckingId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                       Verifying ID...
                    </div>
                  ) : (
                    <>
                      {isNewClient
                        ? '✨ New client — a new record will be created'
                        : `↩ Returning client — updating existing record${existingClient?.full_name ? ` for ${existingClient.full_name}` : ''}`}
                    </>
                  )}
                </div>
              )}

              {/* Autopopulate Button */}
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(197,179,88,0.05)',
                border: '1px dashed var(--primary, #c5b358)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary, #333)' }}>Autopopulate via PDF</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
                    Save time by extracting data from a Great Eastern life plan document.
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  style={{
                    ...secondaryBtnStyle,
                    borderColor: 'var(--primary, #c5b358)',
                    color: 'var(--primary, #c5b358)',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                  Select PDF
                </button>
              </div>

              {/* Client Details section - Grouped */}
              <Section
                title="Client Information"
                enabled={includeClient}
                onToggle={() => setIncludeClient(v => !v)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Basic Group */}
                  <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Basic Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {['name_as_per_id', 'id_type', 'id_no', 'title', 'gender', 'date_of_birth', 'age', 'nationality', 'singapore_pr'].map(field => (
                        <FieldRow key={field} field={field as any} extracted={extracted} includedClientFields={includedClientFields} toggleClientField={toggleClientField} handleClientFieldChange={handleClientFieldChange} includeClient={includeClient} existingClient={existingClient} errorFields={errorFields} isNewClient={isNewClient} />
                      ))}
                    </div>
                  </div>

                  {/* Personal Profile Group */}
                  <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Personal Profile</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {['marital_status', 'smoker_status', 'race', 'qualification', 'languages_spoken', 'languages_written', 'risk_profile'].map(field => (
                        <FieldRow key={field} field={field as any} extracted={extracted} includedClientFields={includedClientFields} toggleClientField={toggleClientField} handleClientFieldChange={handleClientFieldChange} includeClient={includeClient} existingClient={existingClient} errorFields={errorFields} isNewClient={isNewClient} />
                      ))}
                    </div>
                  </div>

                  {/* Contact Group */}
                  <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Contact Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {['email', 'mobile_no', 'home_no', 'office_no'].map(field => (
                        <FieldRow key={field} field={field as any} extracted={extracted} includedClientFields={includedClientFields} toggleClientField={toggleClientField} handleClientFieldChange={handleClientFieldChange} includeClient={includeClient} existingClient={existingClient} errorFields={errorFields} isNewClient={isNewClient} />
                      ))}
                    </div>
                  </div>

                  {/* Employment Group */}
                  <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Employment Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {['employment_status', 'occupation'].map(field => (
                        <FieldRow key={field} field={field as any} extracted={extracted} includedClientFields={includedClientFields} toggleClientField={toggleClientField} handleClientFieldChange={handleClientFieldChange} includeClient={includeClient} existingClient={existingClient} errorFields={errorFields} isNewClient={isNewClient} />
                      ))}
                    </div>
                  </div>

                  {/* Residential Group */}
                  <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Residential Address</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {['address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no'].map(field => (
                        <FieldRow key={field} field={field as any} extracted={extracted} includedClientFields={includedClientFields} toggleClientField={toggleClientField} handleClientFieldChange={handleClientFieldChange} includeClient={includeClient} existingClient={existingClient} errorFields={errorFields} isNewClient={isNewClient} />
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Family section */}
              {extracted.family?.length > 0 && (
                <Section
                  title={`Family Members (${extracted.family.length})`}
                  enabled={includeFamily}
                  onToggle={() => setIncludeFamily(v => !v)}
                >
                  {extracted.family.map((m, i) => (
                    <div key={i} style={{
                      padding: '0.75rem', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border, #eee)',
                      marginBottom: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <EditableSmallField 
                          label="Name" 
                          val={m.family_member_name} 
                          onChange={v => handleFamilyMemberChange(i, 'family_member_name', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.family_member_name`)}
                        />
                        <EditableSmallField 
                          label="Relationship" 
                          val={m.relationship} 
                          fieldKey="relationship"
                          onChange={v => handleFamilyMemberChange(i, 'relationship', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.relationship`)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                        <EditableSmallField 
                          label="Gender" 
                          val={m.gender} 
                          fieldKey="gender"
                          onChange={v => handleFamilyMemberChange(i, 'gender', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.gender`)}
                        />
                        <EditableSmallField 
                          label="DOB" 
                          val={m.date_of_birth} 
                          fieldKey="date_of_birth"
                          onChange={v => handleFamilyMemberChange(i, 'date_of_birth', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.date_of_birth`)}
                        />
                        <EditableSmallField 
                          label="Age" 
                          val={m.age} 
                          type="number"
                          onChange={v => handleFamilyMemberChange(i, 'age', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.age`)}
                        />
                        <EditableSmallField 
                          label="Monthly Upkeep" 
                          val={m.monthly_upkeep} 
                          type="number"
                          onChange={v => handleFamilyMemberChange(i, 'monthly_upkeep', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.monthly_upkeep`)}
                        />
                        <EditableSmallField 
                          label="Support until" 
                          val={m.support_until_age} 
                          type="number"
                          onChange={v => handleFamilyMemberChange(i, 'support_until_age', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.support_until_age`)}
                        />
                        <EditableSmallField 
                          label="Years to support" 
                          val={m.years_to_support} 
                          type="number"
                          onChange={v => handleFamilyMemberChange(i, 'years_to_support', v)}
                          disabled={!includeFamily}
                          error={errorFields.has(`family.${i}.years_to_support`)}
                        />
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Cashflow section */}
              {includeCashflow && (
                <Section
                  title="Cashflow (Annual)"
                  enabled={includeCashflow}
                  onToggle={() => setIncludeCashflow(v => !v)}
                >
                  {(() => {
                    const cf = extracted.cashflow as any || {};
                    const totalInflow = INFLOW_FIELDS.reduce((s, k) => s + (Number(cf[k]) || 0), 0);
                    // Property Expenses are often included in the Loan Repayment header per user request, 
                    // so we sum them correctly.
                    const totalOutflow = OUTFLOW_FIELDS.reduce((s, k) => s + (Number(cf[k]) || 0), 0);
                    
                    const netSurplus = totalInflow - totalOutflow;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Inflows */}
                        <div>
                          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#719266', marginBottom: '0.5rem', borderBottom: '1px solid #71926633', paddingBottom: '2px' }}>Inflows</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.25rem' }}>
                            {INFLOW_FIELDS.map(k => (
                              <EditableSmallField 
                                key={k} 
                                label={formatLabel(k)} 
                                val={cf[k] || 0} 
                                fieldKey={k}
                                type="number"
                                onChange={newVal => handleCashflowChange(k, newVal)}
                                disabled={!includeCashflow}
                                error={errorFields.has(`cashflow.${k}`)}
                              />
                            ))}
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#719266' }}>
                             Total Inflow: ${totalInflow.toLocaleString()}
                          </div>
                        </div>

                        {/* Outflows */}
                        <div>
                          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9B2226', marginBottom: '0.5rem', borderBottom: '1px solid #9B222633', paddingBottom: '2px' }}>Outflows</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.25rem' }}>
                            {OUTFLOW_FIELDS.map(k => (
                              <EditableSmallField 
                                key={k} 
                                label={formatLabel(k)} 
                                val={cf[k] || 0} 
                                fieldKey={k}
                                type="number"
                                onChange={newVal => handleCashflowChange(k, newVal)}
                                disabled={!includeCashflow}
                                error={errorFields.has(`cashflow.${k}`)}
                              />
                            ))}
                          </div>
                          <div style={{ textAlign: 'right', marginTop: '0.4rem', fontWeight: 700, fontSize: '0.8rem', color: '#9B2226' }}>
                             Total Outflow: ${totalOutflow.toLocaleString()}
                          </div>
                        </div>

                        {/* CPF Detail (Non-additive to totals) */}
                        <div style={{ background: '#f1f3f5', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                          <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#495057', marginBottom: '0.4rem' }}>CPF & Savings (Info Only)</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.25rem' }}>
                            {SUPPLEMENTARY_FIELDS.map(k => (
                              <EditableSmallField 
                                key={k} 
                                label={formatLabel(k)} 
                                val={cf[k] || 0} 
                                fieldKey={k}
                                type="number"
                                onChange={newVal => handleCashflowChange(k, newVal)}
                                disabled={!includeCashflow}
                                error={errorFields.has(`cashflow.${k}`)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Summary */}
                        <div style={{ 
                          padding: '0.75rem', 
                          background: netSurplus >= 0 ? 'rgba(113, 146, 102, 0.08)' : 'rgba(155, 34, 38, 0.08)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: `1px solid ${netSurplus >= 0 ? '#71926633' : '#9B222633'}`
                        }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>NET SURPLUS (Cash & CPF)</span>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: netSurplus >= 0 ? '#719266' : '#9B2226' }}>
                            ${netSurplus.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </Section>
              )}

              {/* Investments section */}
              {extracted.investments?.length > 0 && (
                <Section
                  title={`Investments (${extracted.investments.length})`}
                  enabled={includeInvestments}
                  onToggle={() => setIncludeInvestments(v => !v)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {extracted.investments.map((inv, i) => (
                      <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', border: '1px solid var(--border, #eee)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                          <EditableSmallField 
                            label="Policy Name" 
                            val={inv.policy_name} 
                            fieldKey="policy_name"
                            onChange={v => handleInvestmentChange(i, 'policy_name', v)}
                            disabled={!includeInvestments}
                            error={errorFields.has(`investments.${i}.policy_name`)}
                          />
                          <EditableSmallField 
                            label="Type" 
                            val={inv.policy_type} 
                            fieldKey="policy_type"
                            options={ENUMS.investment_type}
                            onChange={v => handleInvestmentChange(i, 'policy_type', v)}
                            disabled={!includeInvestments}
                            error={errorFields.has(`investments.${i}.policy_type`)}
                          />
                          <EditableSmallField 
                            label="Initial Investment" 
                            val={inv.initial_investment} 
                            fieldKey="initial_investment"
                            type="number"
                            onChange={v => handleInvestmentChange(i, 'initial_investment', v)}
                            disabled={!includeInvestments}
                          />
                          <EditableSmallField 
                            label="Start Date" 
                            val={inv.start_date} 
                            fieldKey="start_date"
                            type="date"
                            onChange={v => handleInvestmentChange(i, 'start_date', v)}
                            disabled={!includeInvestments}
                            error={errorFields.has(`investments.${i}.start_date`)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Insurance plans section */}
              {extracted.insurance_plans?.length > 0 && (
                <Section
                  title={`Recommended Plans (${extracted.insurance_plans.length}) — status: Pending`}
                  enabled={includeInsurance}
                  onToggle={() => setIncludeInsurance(v => !v)}
                >
                  {extracted.insurance_plans.map((p, i) => (
                    <div key={i} style={{
                      padding: '0.75rem', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border, #eee)',
                      marginBottom: '0.5rem',
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <EditableSmallField 
                          label="Policy Name" 
                          val={p.policy_name} 
                          onChange={v => handleInsurancePlanChange(i, 'policy_name', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.policy_name`)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                        <EditableSmallField 
                          label="Type" 
                          val={p.policy_type} 
                          fieldKey="policy_type"
                          onChange={v => handleInsurancePlanChange(i, 'policy_type', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.policy_type`)}
                        />
                        <EditableSmallField 
                          label="Life Assured" 
                          val={p.life_assured} 
                          onChange={v => handleInsurancePlanChange(i, 'life_assured', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.life_assured`)}
                        />
                        <EditableSmallField 
                          label="Sum Assured" 
                          val={p.sum_assured} 
                          type="number"
                          onChange={v => handleInsurancePlanChange(i, 'sum_assured', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.sum_assured`)}
                        />
                        <EditableSmallField 
                          label="Start Date" 
                          val={p.start_date} 
                          type="date"
                          fieldKey="start_date"
                          onChange={v => handleInsurancePlanChange(i, 'start_date', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.start_date`)}
                        />
                        <EditableSmallField 
                          label="Premium" 
                          val={p.premium_amount} 
                          type="number"
                          onChange={v => handleInsurancePlanChange(i, 'premium_amount', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.premium_amount`)}
                        />
                        <EditableSmallField 
                          label="Frequency" 
                          val={p.payment_frequency} 
                          fieldKey="payment_frequency"
                          onChange={v => handleInsurancePlanChange(i, 'payment_frequency', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.payment_frequency`)}
                        />
                        <EditableSmallField 
                          label="Term" 
                          val={p.payment_term} 
                          type="number"
                          onChange={v => handleInsurancePlanChange(i, 'payment_term', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.payment_term`)}
                        />
                        <EditableSmallField 
                          label="Benefit" 
                          val={p.benefit_type} 
                          onChange={v => handleInsurancePlanChange(i, 'benefit_type', v)}
                          disabled={!includeInsurance}
                          error={errorFields.has(`insurance.${i}.benefit_type`)}
                        />
                      </div>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* APPLYING / DONE */}
          {step === 'applying' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #888)' }}>
              <div style={{
                display: 'inline-block', width: '32px', height: '32px',
                border: '3px solid var(--border, #ddd)',
                borderTopColor: 'var(--primary, #c5b358)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '1rem',
              }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Saving to database…</p>
            </div>
          )}

          {step === 'done' && (
            <div style={{
              textAlign: 'center', padding: '2rem',
              color: '#2e7d32', fontWeight: 600, fontSize: '1.1rem',
            }}>
              ✓ Done! Data has been saved successfully.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.25rem 2rem', borderTop: '1px solid var(--border, #eee)',
          display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ flex: 1 }}>
            {error && (
              <p style={{ margin: 0, color: '#c0392b', fontSize: '0.9rem', fontWeight: 600 }}>
                ⚠ {error}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          {step === 'upload' && (
            <>
              <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={handleAnalyse}
                disabled={!file}
                style={{ ...primaryBtnStyle, opacity: file ? 1 : 0.5 }}
              >
                Analyse PDF
              </button>
            </>
          )}
          {step === 'extracting' && (
            <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          )}
          {step === 'review' && (
            <>
              {file && (
                <button onClick={() => setStep('upload')} style={secondaryBtnStyle}>← Back to Upload</button>
              )}
              <button 
                onClick={handleApply} 
                style={{ 
                  ...primaryBtnStyle,
                  background: isNewClient ? 'var(--primary, #c5b358)' : '#2e7d32' 
                }}
              >
                {isNewClient ? 'Create Client' : 'Update Client'}
              </button>
            </>
          )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(modal, document.body);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldRow: React.FC<{
  field: keyof PdfExtractedData['client'];
  extracted: PdfExtractedData | null;
  includedClientFields: Set<string>;
  toggleClientField: (f: string) => void;
  handleClientFieldChange: (f: any, v: any) => void;
  includeClient: boolean;
  existingClient: any;
  errorFields: Set<string>;
  isNewClient: boolean;
}> = ({ field, extracted, includedClientFields, toggleClientField, handleClientFieldChange, includeClient, existingClient, errorFields, isNewClient }) => {
  if (!extracted) return null;
  const val = extracted.client[field];
  const key = `client.${field}`;
  const isIncluded = includedClientFields.has(key);
  const oldVal = existingClient?.[field];

  return (
    <EditableFieldRow
      key={field}
      fieldKey={field}
      label={formatLabel(field)}
      val={val}
      oldVal={!isNewClient && oldVal != null ? formatValue(oldVal) : undefined}
      included={isIncluded}
      onToggle={() => toggleClientField(key)}
      onChange={(newVal) => handleClientFieldChange(field, newVal)}
      disabled={!includeClient}
      error={errorFields.has(key)}
    />
  );
};

const Section: React.FC<{
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, enabled, onToggle, children }) => (
  <div style={{
    border: '1px solid var(--border, #eee)',
    borderRadius: '14px', overflow: 'hidden',
    opacity: enabled ? 1 : 0.5,
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      background: 'rgba(0,0,0,0.02)',
      borderBottom: '1px solid var(--border, #eee)',
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--secondary, #333)' }}>
        {title}
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        Include
      </label>
    </div>
    <div style={{ padding: '0.75rem 1rem' }}>{children}</div>
  </div>
);

const EditableFieldRow: React.FC<{
  fieldKey: string;
  label: string;
  val: any;
  oldVal?: string;
  included: boolean;
  onToggle: () => void;
  onChange: (newVal: any) => void;
  disabled?: boolean;
  error?: boolean;
}> = ({ fieldKey, label, val, oldVal, included, onToggle, onChange, disabled, error }) => {
  const options = ENUMS[fieldKey as keyof typeof ENUMS] || (fieldKey.includes('language') ? ENUMS.languages : undefined);
  const isDate = fieldKey.includes('date');
  const isArray = Array.isArray(val) || fieldKey.includes('language');

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: `1px solid ${error ? '#e74c3c' : 'var(--border, #ddd)'}`,
    borderRadius: '4px',
    fontSize: '0.85rem',
    color: 'var(--secondary, #333)',
    background: error ? '#fdecea' : (disabled || !included ? '#f5f5f5' : '#fff'),
    width: '100%',
    boxSizing: 'border-box' as any
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '3px 0' }}>
      <input type="checkbox" checked={included} onChange={onToggle} disabled={disabled} style={{ marginTop: '5px', flexShrink: 0 }} />
      <div style={{ fontSize: '0.8rem', minWidth: 0, flex: 1 }}>
        <span style={{ color: 'var(--text-muted, #888)', display: 'block', marginBottom: '2px' }}>{label}: </span>
        {oldVal !== undefined && oldVal !== String(val) && (
          <div style={{ color: '#c0392b', textDecoration: 'line-through', marginBottom: '4px', fontSize: '0.75rem' }}>Prev: {oldVal}</div>
        )}
        {options ? (
          isArray ? (
            <MultiPillSelect
              options={options}
              values={val || []}
              onChange={onChange}
              disabled={disabled || !included}
              error={error}
            />
          ) : (
            <select 
              value={val || ''} 
              onChange={e => onChange(e.target.value)} 
              disabled={disabled || !included} 
              style={inputStyle}
              required={included}
            >
              <option value="" disabled>Select {label}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )
        ) : isDate ? (
          <input 
            type="date" 
            value={val || ''} 
            onChange={e => onChange(e.target.value)}
            disabled={disabled || !included}
            style={inputStyle}
            required={included}
          />
        ) : (
          <input 
            type="text" 
            value={val || ''} 
            onChange={e => onChange(e.target.value)}
            disabled={disabled || !included}
            style={inputStyle}
            required={included}
            placeholder={label}
          />
        )}
      </div>
    </div>
  );
};

const MultiPillSelect: React.FC<{
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  disabled?: boolean;
  error?: boolean;
}> = ({ options, values, onChange, disabled, error }) => {
  const [isOpen, setIsOpen] = useState(false);

  const containerStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#e74c3c' : '#ddd'}`,
    borderRadius: '6px',
    padding: '4px',
    background: error ? '#fdecea' : (disabled ? '#f5f5f5' : '#fff'),
    minHeight: '32px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    position: 'relative',
    cursor: disabled ? 'default' : 'pointer'
  };

  const toggleOpen = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const removeVal = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(x => x !== v));
  };

  const addVal = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (values.includes(v)) {
      onChange(values.filter(x => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={containerStyle} onClick={toggleOpen}>
        {values.length === 0 && <span style={{ color: '#aaa', fontSize: '0.8rem', paddingLeft: '4px' }}>Select...</span>}
        {values.map(v => (
          <div key={v} style={{
            background: 'var(--primary, #c5b358)', color: '#fff',
            borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {v}
            {!disabled && <span onClick={(e) => removeVal(v, e)} style={{ cursor: 'pointer', fontWeight: 800 }}>×</span>}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', paddingRight: '4px', color: '#888' }}>
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
          maxHeight: '150px', overflowY: 'auto', marginTop: '4px'
        }}>
          {options.map(o => (
            <div
              key={o}
              onClick={(e) => addVal(o, e)}
              style={{
                padding: '6px 10px', fontSize: '0.8rem',
                background: values.includes(o) ? 'rgba(197,179,88,0.1)' : 'transparent',
                color: values.includes(o) ? 'var(--primary, #c5b358)' : '#333',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
              }}
            >
              {o}
              {values.includes(o) && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Formatting Helpers ───────────────────────────────────────────────────────

const formatCurrency = (val: any) => {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).replace(/,/g, '');
  if (isNaN(Number(str))) return str;
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.slice(0, 2).join('.');
};

const parseCurrency = (val: string) => {
  return val.replace(/,/g, '');
};

const EditableSmallField: React.FC<{
  label: string;
  val: any;
  onChange: (newVal: any) => void;
  fieldKey?: string;
  type?: 'text' | 'number' | 'date';
  isCurrency?: boolean;
  options?: string[];
  disabled?: boolean;
  error?: boolean;
}> = ({ label, val, onChange, fieldKey, type, isCurrency, options: propOptions, disabled, error }) => {
  const options = propOptions || (fieldKey ? ENUMS[fieldKey as keyof typeof ENUMS] : undefined);
  const isDate = type === 'date' || (fieldKey && fieldKey.includes('date'));
  const isNumber = type === 'number';
  // Treat as currency if explicitly requested OR if label/key implies it's a dollar value
  const isDollar = isCurrency || (isNumber && (
    label.toLowerCase().includes('income') || 
    label.toLowerCase().includes('amount') || 
    label.toLowerCase().includes('premium') || 
    label.toLowerCase().includes('sum') || 
    label.toLowerCase().includes('expense') || 
    label.toLowerCase().includes('investment') || 
    label.toLowerCase().includes('repayment') || 
    label.toLowerCase().includes('upkeep') || 
    label.toLowerCase().includes('surplus') || 
    label.toLowerCase().includes('total') ||
    label.toLowerCase().includes('cashflow')
  ));

  const style: React.CSSProperties = {
    padding: '4px 6px',
    border: `1px solid ${error ? '#e74c3c' : 'var(--border, #eee)'}`,
    borderRadius: '4px',
    fontSize: '0.75rem',
    width: '100%',
    boxSizing: 'border-box',
    background: error ? '#fdecea' : (disabled ? '#f9f9f9' : '#fff'),
    color: 'var(--secondary, #333)',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (isDollar) {
      raw = parseCurrency(raw);
    }
    
    if (isNumber) {
      if (raw === '') {
        onChange(null);
      } else {
        const num = Number(raw);
        if (!isNaN(num)) onChange(num);
      }
    } else {
      onChange(raw);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: '0.65rem', color: 'var(--text-muted, #888)', fontWeight: 600 }}>{label}</label>
      {options ? (
        <select 
          value={val || ''} 
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={style}
          required
        >
          <option value="" disabled>Select</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input 
          type={isDate ? 'date' : (isDollar ? 'text' : (isNumber ? 'number' : 'text'))}
          value={isDollar ? formatCurrency(val) : (val ?? '')}
          onChange={handleChange}
          disabled={disabled}
          style={style}
          required
          placeholder={isDollar ? '0' : ''}
        />
      )}
    </div>
  );
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'var(--primary, #c5b358)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  color: 'var(--secondary, #333)',
  border: '1px solid var(--border, #ddd)',
  borderRadius: '10px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

export default PdfImport;
