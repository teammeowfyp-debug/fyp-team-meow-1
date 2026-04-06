import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
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
import { CLIENT_FIELDS, MANDATORY_CLIENT_FIELDS } from './ClientFormComponents';

export type Step = 'upload' | 'extracting' | 'review' | 'applying' | 'done';

export const useClientForm = (clientId?: string, onSuccess?: (newId?: string) => void, onClose?: () => void) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('review');
  const [error, setError] = useState<string | null>(null);

  const [extracted, setExtracted] = useState<PdfExtractedData | null>(null);
  const [existingClient, setExistingClient] = useState<any | null>(null);
  const [isNewClient, setIsNewClient] = useState(!clientId);

  const [includeClient] = useState(true);
  const [includedClientFields, setIncludedClientFields] = useState<Set<string>>(new Set());
  const [includeFamily, setIncludeFamily] = useState(true);
  const [includeCashflow, setIncludeCashflow] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'cashflow' | 'insurance' | 'investment'>('personal');

  useEffect(() => {
    if (clientId) {
      getClientById(clientId).then(data => {
        if (data) {
          setExistingClient(data);
          const initialData: PdfExtractedData = {
            client: { ...data },
            family: data.client_family || [],
            cashflow: data.cashflow?.[0] || {},
            insurance_plans: data.client_insurance || [],
            investments: data.client_investments || [],
          };
          setExtracted(initialData);
          setStep('review');
          const allFields = new Set<string>();
          CLIENT_FIELDS.forEach(f => allFields.add(`client.${f}`));
          setIncludedClientFields(allFields);
        }
      });
    } else {
      setExtracted(createEmptyExtractedData());
      setStep('review');
      setIsNewClient(true);
      const ALL_CLIENT_FIELDS = [...CLIENT_FIELDS];
      setIncludedClientFields(new Set(ALL_CLIENT_FIELDS.map(f => `client.${f}`)));
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId || !extracted?.client.id_no || extracted.client.id_no.length < 5) return;
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
      const allFields = new Set<string>();
      CLIENT_FIELDS.forEach(f => allFields.add(`client.${f}`));
      setIncludedClientFields(allFields);
      setErrorFields(new Set());

      if (clientId) {
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
      if (includeClient) includedClientFields.forEach(f => selectedFields.add(f));
      if (includeFamily) selectedFields.add('family');
      if (includeCashflow) selectedFields.add('cashflow');
      if (includeInsurance) selectedFields.add('insurance');
      if (includeInvestments) selectedFields.add('investments');

      if (includeClient) {
        const errors = new Set<string>();
        for (const f of MANDATORY_CLIENT_FIELDS) {
          const key = `client.${f}`;
          const val = extracted.client[f as keyof PdfExtractedData['client']];
          if (val === null || val === undefined || val === '') errors.add(key);
        }
        if (errors.size > 0) {
          setErrorFields(errors);
          throw new Error(`Mandatory fields are blank. They have been highlighted in red. Please fill them before proceeding.`);
        }
      }

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
        const { data: profile } = await supabase
          .from('users')
          .select('user_id')
          .eq('email', user?.email ?? '')
          .maybeSingle();
        const assignedUserId = profile?.user_id ?? null;
        newId = await createClientFromPdf(extracted, assignedUserId, selectedFields);
      } else {
        const cid = existingClient?.client_id || clientId;
        await updateClientFromPdf(cid!, extracted, selectedFields);
        newId = cid;
      }
      setStep('done');
      setTimeout(() => {
        onSuccess?.(newId);
        onClose?.();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes.');
      setStep('review');
    }
  };

  const handleClientFieldChange = (field: keyof PdfExtractedData['client'], newVal: any) => {
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
        client: { ...prev.client, [field]: newVal }
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
      return { ...prev, cashflow: { ...prev.cashflow, [field]: value } };
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

  return {
    fileInputRef, dragOver, setDragOver, file, setFile, step, setStep, error, setError,
    extracted, setExtracted, existingClient, setExistingClient, isNewClient, setIsNewClient,
    includeClient, includedClientFields, setIncludedClientFields, includeFamily, setIncludeFamily,
    includeCashflow, setIncludeCashflow, includeInsurance, setIncludeInsurance, includeInvestments, setIncludeInvestments,
    errorFields, setErrorFields, activeTab, setActiveTab,
    handleFile, handleDrop, handleAnalyse, handleApply,
    handleClientFieldChange, handleFamilyMemberChange, addFamilyMember, removeFamilyMember,
    handleCashflowChange, handleInsurancePlanChange, addInsurancePlan, removeInsurancePlan,
    handleInvestmentChange, addInvestment, removeInvestment
  };
};
