import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FocusModal } from '../UI/FocusModal';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthProvider';
import {
  parsePdfViaBackend,
  matchClientByIdNo,
  getClientById,
  createClientFromPdf,
  updateClientFromPdf,
  normalizeExtractedData,
  createEmptyExtractedData,
} from '../../lib/pdfImport';
import type { PdfExtractedData } from '../../lib/pdfImport';

interface PdfImportProps {
  /** If provided, restricts to the "returning client" flow for this client */
  clientId?: string;
  /** Called after a successful apply so the parent can refresh data */
  onSuccess?: (newClientId?: string) => void;
  onClose: () => void;
  onCancel?: () => void;
  variant?: 'modal' | 'inline';
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

const MANDATORY_CLIENT_FIELDS = [
  'name_as_per_id', 'gender', 'marital_status', 'smoker_status',
  'race', 'nationality', 'singapore_pr', 'id_type', 'employment_status', 'id_no'
];

const FAMILY_FIELDS = ['family_member_name', 'relationship', 'gender', 'date_of_birth', 'age'];
const INFLOW_FIELDS = ['employment_income_gross', 'rental_income', 'investment_income', 'cpf_contribution_total'];
const OUTFLOW_FIELDS = ['household_expenses', 'income_tax', 'insurance_premiums', 'property_expenses', 'property_loan_repayment', 'non_property_loan_repayment', 'regular_investments', 'wealth_transfers'];
const INSURANCE_FIELDS = ['policy_name', 'policy_type', 'life_assured', 'sum_assured', 'premium_amount', 'payment_frequency', 'payment_term', 'benefit_type', 'start_date', 'expiry_date', 'status'];
const INVESTMENT_FIELDS = ['policy_name', 'policy_type', 'initial_investment', 'contribution_amount', 'contribution_frequency', 'start_date', 'status'];


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
  investment_policy_type: ['Equity', 'Fixed Income', 'Cash'],
  qualification: ['Primary', 'Secondary', 'Diploma', 'Degree & Above', 'Post-Graduate', 'Others'],
  nationality: ['Singaporean', 'Malaysian', 'Indonesian', 'Indian', 'Chinese', 'British', 'American', 'Australian', 'Others'],
  languages: ['English', 'Mandarin', 'Malay', 'Tamil', 'Hindi', 'Others'],
  relationship: ['Spouse', 'Child', 'Parent'],
  policy_type: ['Life Insurance', 'Health Insurance', 'General Insurance'],
  investment_type: ['Equity', 'Fixed Income', 'Cash', 'Bonds'],
  payment_frequency: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'],
  contribution_frequency: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'],
  status: ['Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void']
};

export const PdfImport: React.FC<PdfImportProps> = ({ clientId, onSuccess, onClose, onCancel, variant = 'modal' }) => {
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
  const [includeClient] = useState(true);
  const [includedClientFields, setIncludedClientFields] = useState<Set<string>>(new Set());
  const [includeFamily, setIncludeFamily] = useState(true);
  const [includeCashflow, setIncludeCashflow] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());



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

      // Pre-select all client fields for new client
      const ALL_CLIENT_FIELDS = [
        ...CLIENT_FIELDS
      ];
      setIncludedClientFields(new Set(ALL_CLIENT_FIELDS.map(f => `client.${f}`)));
    }
  }, [clientId]);

  // Handle ID No check whenever it changes (debounced)
  useEffect(() => {
    if (clientId || !extracted?.client.id_no || extracted.client.id_no.length < 5) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const match = await matchClientByIdNo(extracted.client.id_no || '');
        if (match) {
          setExistingClient(match);
          setIsNewClient(false);
        } else {
          setExistingClient(null);
          setIsNewClient(true);
        }
      } catch (err) {
        console.error('ID check error:', err);
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
      const rawData = await parsePdfViaBackend(file);
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

      // Initialize all client fields
      const allFields = new Set<string>();
      CLIENT_FIELDS.forEach(f => {
        allFields.add(`client.${f}`);
      });
      setIncludedClientFields(allFields);

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

      // Validation: "don't allow blanks" for mandatory fields
      if (includeClient) {
        const errors = new Set<string>();
        for (const f of MANDATORY_CLIENT_FIELDS) {
          const key = `client.${f}`;
          const val = extracted.client[f as keyof PdfExtractedData['client']];
          if (val === null || val === undefined || val === '') {
            errors.add(key);
          }
        }
        if (errors.size > 0) {
          setErrorFields(errors);
          throw new Error(`Mandatory fields are blank. They have been highlighted in red. Please fill them before proceeding.`);
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
  }; const handleClientFieldChange = (field: keyof PdfExtractedData['client'], newVal: any) => {
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

  const handleFamilyMemberChange = (index: number, field: string, value: any) => {
    setExtracted(prev => {
      if (!prev) return prev;
      const newList = [...(prev.family || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, family: newList };
    });
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`family.${index}.${field}`);
      return next;
    });
  };

  const addFamilyMember = () => {
    setExtracted(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        family: [...(prev.family || []), { family_member_name: '', relationship: '', gender: 'Male' }]
      };
    });
  };

  const removeFamilyMember = (index: number) => {
    setExtracted(prev => {
      if (!prev) return prev;
      return { ...prev, family: prev.family.filter((_, i) => i !== index) };
    });
  };

  const handleCashflowChange = (field: string, value: any) => {
    setExtracted(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cashflow: { ...prev.cashflow, [field]: value }
      };
    });
  };

  const handleInsurancePlanChange = (index: number, field: string, value: any) => {
    setExtracted(prev => {
      if (!prev) return prev;
      const newList = [...(prev.insurance_plans || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, insurance_plans: newList };
    });
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`insurance.${index}.${field}`);
      return next;
    });
  };

  const addInsurancePlan = () => {
    setExtracted(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        insurance_plans: [...(prev.insurance_plans || []), { policy_name: '', policy_type: 'Life Insurance', status: 'Active' }]
      };
    });
  };

  const removeInsurancePlan = (index: number) => {
    setExtracted(prev => {
      if (!prev) return prev;
      return { ...prev, insurance_plans: prev.insurance_plans.filter((_, i) => i !== index) };
    });
  };

  const handleInvestmentChange = (index: number, field: string, value: any) => {
    setExtracted(prev => {
      if (!prev) return prev;
      const newList = [...(prev.investments || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, investments: newList };
    });
    setErrorFields(prev => {
      const next = new Set(prev);
      next.delete(`investments.${index}.${field}`);
      return next;
    });
  };

  const addInvestment = () => {
    setExtracted(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        investments: [...(prev.investments || []), { policy_name: '', policy_type: 'Equity', status: 'Pending' }]
      };
    });
  };

  const removeInvestment = (index: number) => {
    setExtracted(prev => {
      if (!prev) return prev;
      return { ...prev, investments: prev.investments.filter((_, i) => i !== index) };
    });
  };


  const modalContent = (
    <>
      {/* Header */}
      <div className="modal-header" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border, #eee)', paddingBottom: '1rem'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--secondary, #333)' }}>
            {isNewClient ? 'Add Client Profile' : 'Update Client Profile'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
            {isNewClient
              ? 'Fill details manually or autopopulate via PDF'
              : (!existingClient ? 'Loading...' : `Updating profile for ${existingClient?.name_as_per_id || existingClient?.full_name || 'Matched Client'}`)
            }
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>

        {/* UPLOAD STEP */}
        {(step === 'upload' || step === 'extracting') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem', flex: 1 }}>
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
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flex: 1,
                background: dragOver ? 'var(--primary-glow, rgba(197,179,88,0.05))' : 'rgba(0,0,0,0.01)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ color: 'var(--primary, #c5b358)', marginBottom: '0.5rem' }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
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

        {/* LOADING STATE FOR EXISTING CLIENT */}
        {!isNewClient && !extracted && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
            <div className="empty-state-icon" style={{ marginBottom: '1rem' }}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0 0 15px var(--primary-glow))',
                  animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite'
                }}
              >
                <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
                <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
              </svg>
            </div>
            <p style={{ margin: 0, color: 'var(--secondary)', fontWeight: 600 }}>Loading Client Data</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fetching the latest profile details...</p>
          </div>
        )}

        {/* REVIEW STEP */}
        {step === 'review' && extracted && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>



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
              enabled={true}
              onToggle={() => {}}
              hideCheckbox
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Basic Group */}
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Basic Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {['name_as_per_id', 'id_type', 'id_no', 'title', 'gender', 'date_of_birth', 'age', 'nationality', 'singapore_pr'].map(field => (
                      <FieldRow 
                        key={field} 
                        field={field as any} 
                        extracted={extracted} 
                        includedClientFields={includedClientFields} 
                        toggleClientField={toggleClientField} 
                        handleClientFieldChange={handleClientFieldChange} 
                        includeClient={true} 
                        existingClient={existingClient} 
                        errorFields={errorFields} 
                        isNewClient={isNewClient} 
                      />
                    ))}
                  </div>
                </div>

                {/* Personal Profile Group */}
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Personal Profile</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {['marital_status', 'smoker_status', 'race', 'qualification', 'languages_spoken', 'languages_written', 'risk_profile'].map(field => (
                      <FieldRow 
                        key={field} 
                        field={field as any} 
                        extracted={extracted} 
                        includedClientFields={includedClientFields} 
                        toggleClientField={toggleClientField} 
                        handleClientFieldChange={handleClientFieldChange} 
                        includeClient={true} 
                        existingClient={existingClient} 
                        errorFields={errorFields} 
                        isNewClient={isNewClient} 
                      />
                    ))}
                  </div>
                </div>

                {/* Contact Group */}
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Contact Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {['email', 'mobile_no', 'home_no', 'office_no'].map(field => (
                      <FieldRow 
                        key={field} 
                        field={field as any} 
                        extracted={extracted} 
                        includedClientFields={includedClientFields} 
                        toggleClientField={toggleClientField} 
                        handleClientFieldChange={handleClientFieldChange} 
                        includeClient={true} 
                        existingClient={existingClient} 
                        errorFields={errorFields} 
                        isNewClient={isNewClient} 
                      />
                    ))}
                  </div>
                </div>

                {/* Employment Group */}
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Employment Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {['employment_status', 'occupation'].map(field => (
                      <FieldRow 
                        key={field} 
                        field={field as any} 
                        extracted={extracted} 
                        includedClientFields={includedClientFields} 
                        toggleClientField={toggleClientField} 
                        handleClientFieldChange={handleClientFieldChange} 
                        includeClient={true} 
                        existingClient={existingClient} 
                        errorFields={errorFields} 
                        isNewClient={isNewClient} 
                      />
                    ))}
                  </div>
                </div>

                {/* Residential Group */}
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Residential Address</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {['address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no'].map(field => (
                      <FieldRow 
                        key={field} 
                        field={field as any} 
                        extracted={extracted} 
                        includedClientFields={includedClientFields} 
                        toggleClientField={toggleClientField} 
                        handleClientFieldChange={handleClientFieldChange} 
                        includeClient={true} 
                        existingClient={existingClient} 
                        errorFields={errorFields} 
                        isNewClient={isNewClient} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Family Members Section */}
            <Section
              title="Family Members"
              enabled={includeFamily}
              onToggle={() => setIncludeFamily(!includeFamily)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(extracted.family || []).map((member, i) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', position: 'relative' }}>
                    <button 
                      onClick={() => removeFamilyMember(i)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem' }}
                    >×</button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {FAMILY_FIELDS.map(f => (
                        <EditableFieldRow
                          key={f}
                          fieldKey={f}
                          label={formatLabel(f)}
                          val={(member as any)[f]}
                          included={true}
                          onChange={(val) => handleFamilyMemberChange(i, f, val)}
                          error={errorFields.has(`family.${i}.${f}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addFamilyMember} style={{ ...secondaryBtnStyle, width: '100%', marginTop: '0.5rem' }}>+ Add Family Member</button>
              </div>
            </Section>

            {/* Cashflow Section */}
            <Section
              title="Cashflow & Expenses"
              enabled={includeCashflow}
              onToggle={() => setIncludeCashflow(!includeCashflow)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Inflow (Annual)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {INFLOW_FIELDS.map(f => (
                      <EditableFieldRow
                        key={f}
                        fieldKey={f}
                        label={formatLabel(f)}
                        val={(extracted.cashflow as any)?.[f]}
                        included={true}
                        onChange={(val) => handleCashflowChange(f, val)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Outflow (Annual)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                    {OUTFLOW_FIELDS.map(f => (
                      <EditableFieldRow
                        key={f}
                        fieldKey={f}
                        label={formatLabel(f)}
                        val={(extracted.cashflow as any)?.[f]}
                        included={true}
                        onChange={(val) => handleCashflowChange(f, val)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Insurance Plans Section */}
            <Section
              title="Insurance Plans"
              enabled={includeInsurance}
              onToggle={() => setIncludeInsurance(!includeInsurance)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(extracted.insurance_plans || []).map((plan, i) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', position: 'relative' }}>
                    <button 
                      onClick={() => removeInsurancePlan(i)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem' }}
                    >×</button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {INSURANCE_FIELDS.map(f => (
                        <EditableFieldRow
                          key={f}
                          fieldKey={f}
                          label={formatLabel(f)}
                          val={(plan as any)[f]}
                          included={true}
                          onChange={(val) => handleInsurancePlanChange(i, f, val)}
                          error={errorFields.has(`insurance.${i}.${f}`)}
                          customOptions={f === 'policy_type' ? ENUMS.policy_type : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addInsurancePlan} style={{ ...secondaryBtnStyle, width: '100%', marginTop: '0.5rem' }}>+ Add Insurance Plan</button>
              </div>
            </Section>

            {/* Investments Section */}
            <Section
              title="Investments"
              enabled={includeInvestments}
              onToggle={() => setIncludeInvestments(!includeInvestments)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(extracted.investments || []).map((inv, i) => (
                  <div key={i} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', position: 'relative' }}>
                    <button 
                      onClick={() => removeInvestment(i)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem' }}
                    >×</button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
                      {INVESTMENT_FIELDS.map(f => (
                        <EditableFieldRow
                          key={f}
                          fieldKey={f}
                          label={formatLabel(f)}
                          val={(inv as any)[f]}
                          included={true}
                          onChange={(val) => handleInvestmentChange(i, f, val)}
                          error={errorFields.has(`investments.${i}.${f}`)}
                          customOptions={f === 'policy_type' ? ENUMS.investment_policy_type : undefined}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addInvestment} style={{ ...secondaryBtnStyle, width: '100%', marginTop: '0.5rem' }}>+ Add Investment</button>
              </div>
            </Section>

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
        padding: '1rem 2rem', borderTop: '1px solid var(--border, #eee)',
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
              <button onClick={() => { setFile(null); setStep('review'); }} style={secondaryBtnStyle}>Cancel</button>
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
            <button onClick={() => { setFile(null); setStep('review'); }} style={secondaryBtnStyle}>Cancel</button>
          )}
          {step === 'review' && (
            <>
              {(file && !clientId) && (
                <button onClick={() => setStep('upload')} style={secondaryBtnStyle}>← Back to Upload</button>
              )}
              <button onClick={onCancel || onClose} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={handleApply}
                disabled={!extracted}
                style={{
                  ...primaryBtnStyle,
                  background: 'var(--primary, #c5b358)',
                  opacity: extracted ? 1 : 0.5
                }}
              >
                {isNewClient ? 'Add Client' : 'Update Client'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div style={{
        background: '#fff',
        width: '100%',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {modalContent}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <FocusModal isOpen={true} onClose={onClose} closeOnBackdropClick={false}>
      {modalContent}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </FocusModal>
  );
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
}> = ({ field, extracted, handleClientFieldChange, includeClient, existingClient, errorFields, isNewClient }) => {
  if (!extracted) return null;
  const val = extracted.client[field];
  const key = `client.${field}`;
  const oldVal = existingClient?.[field];

  return (
    <EditableFieldRow
      key={field}
      fieldKey={field}
      label={formatLabel(field)}
      val={val}
      oldVal={!isNewClient && oldVal != null ? formatValue(oldVal) : undefined}
      included={true}
      onChange={(newVal) => handleClientFieldChange(field, newVal)}
      disabled={!includeClient}
      error={errorFields.has(key)}
      required={MANDATORY_CLIENT_FIELDS.includes(String(field))}
    />
  );
};

const Section: React.FC<{
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hideCheckbox?: boolean;
}> = ({ title, enabled, onToggle, children, hideCheckbox }) => (
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
      {!hideCheckbox && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
          <input type="checkbox" checked={enabled} onChange={onToggle} />
          Include
        </label>
      )}
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
  onChange: (newVal: any) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  customOptions?: string[];
}> = ({ fieldKey, label, val, oldVal, included, onChange, disabled, error, required, customOptions }) => {
  const options = customOptions || ENUMS[fieldKey as keyof typeof ENUMS] || (fieldKey.includes('language') ? ENUMS.languages : undefined);
  const isDate = fieldKey.includes('date');
  const isArray = Array.isArray(val) || fieldKey.includes('language');

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: `1px solid ${error ? '#e74c3c' : 'var(--border, #ddd)'}`,
    borderRadius: '4px',
    fontSize: '0.85rem',
    width: '100%',
    boxSizing: 'border-box' as any,
    color: val ? 'var(--secondary, #333)' : 'var(--text-muted, #888)',
    background: error ? '#fdecea' : (disabled || !included ? '#f5f5f5' : '#fff'),
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '3px 0' }}>
      <div style={{ fontSize: '0.8rem', minWidth: 0, flex: 1 }}>
        <span style={{ color: 'var(--text-muted, #888)', display: 'block', marginBottom: '2px' }}>
          {label}{required && <span style={{ color: '#e74c3c', marginLeft: '2px' }}>*</span>}:
        </span>
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
            <SingleCustomSelect
              options={options}
              value={val || ''}
              onChange={onChange}
              disabled={disabled || !included}
              error={error}
              placeholder="Select"
            />
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
        ) : typeof val === 'number' || fieldKey.includes('amount') || fieldKey.includes('income') || fieldKey.includes('expense') || fieldKey.includes('repayment') || fieldKey.includes('investment') || fieldKey.includes('value') || fieldKey.includes('assured') || fieldKey.includes('upkeep') || fieldKey.includes('premium') ? (
          <input
            type="number"
            value={val === null || val === undefined ? '' : val}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            disabled={disabled || !included}
            style={inputStyle}
            required={included}
            placeholder={label}
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
        {values.length === 0 && <span style={{ color: 'var(--text-muted, #888)', fontSize: '0.8rem', paddingLeft: '4px' }}>Select</span>}
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
        <div style={{ marginLeft: 'auto', paddingRight: '4px', color: '#888', display: 'flex', alignItems: 'center' }}>
          <svg 
            width="12" height="12" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
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


const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'var(--primary, #c5b358)',
  color: '#fff',
  border: '1px solid transparent',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  minWidth: '150px',
};

const SingleCustomSelect: React.FC<{
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}> = ({ options, value, onChange, disabled, error, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleSelect = (v: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(v);
    setIsOpen(false);
  };

  const containerStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#e74c3c' : '#ddd'}`,
    borderRadius: '4px',
    padding: '4px 8px',
    background: error ? '#fdecea' : (disabled ? '#f5f5f5' : '#fff'),
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    position: 'relative',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.85rem'
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div style={containerStyle} onClick={toggleOpen}>
        {!value && (
          <span style={{ color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>
            {placeholder || 'Select'}
          </span>
        )}
        {value && <span style={{ color: 'var(--secondary, #333)', fontSize: '0.85rem' }}>{value}</span>}
        
        <div style={{ marginLeft: 'auto', color: '#888', display: 'flex', alignItems: 'center' }}>
          <svg 
            width="12" height="12" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
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
              onClick={(e) => handleSelect(o, e)}
              style={{
                padding: '8px 10px', fontSize: '0.85rem',
                background: value === o ? 'rgba(197,179,88,0.1)' : 'transparent',
                color: value === o ? 'var(--primary, #c5b358)' : '#333',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                transition: 'background 0.2s'
              }}
            >
              {o}
              {value === o && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
