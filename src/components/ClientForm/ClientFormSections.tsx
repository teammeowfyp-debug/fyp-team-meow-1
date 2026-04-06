import {
  Section,
  EditableFieldRow,
  FAMILY_FIELDS,
  INFLOW_FIELDS,
  OUTFLOW_FIELDS,
  INSURANCE_FIELDS,
  INVESTMENT_FIELDS,
  formatLabel,
  formatValue,
  Button
} from './ClientFormComponents';
import type { PdfExtractedData } from '../../lib/pdfImport';

interface BaseFormProps {
  extracted: PdfExtractedData;
  errorFields: Set<string>;
  isNewClient: boolean;
  disabled?: boolean;
}

interface ClientFieldProps extends BaseFormProps {
  existingClient: any;
  handleClientFieldChange: (field: any, val: any) => void;
  MANDATORY_CLIENT_FIELDS: string[];
}

export const PersonalInfoForm: React.FC<ClientFieldProps> = ({
  extracted,
  existingClient,
  handleClientFieldChange,
  errorFields,
  isNewClient,
  MANDATORY_CLIENT_FIELDS,
  disabled
}) => {
  const renderField = (field: keyof PdfExtractedData['client']) => {
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
        disabled={disabled}
        error={errorFields.has(key)}
        required={MANDATORY_CLIENT_FIELDS.includes(String(field))}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Section title="Client Information" hideCheckbox>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Basic Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
              {['name_as_per_id', 'id_type', 'id_no', 'title', 'gender', 'date_of_birth', 'age', 'nationality', 'singapore_pr'].map(f => renderField(f as any))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Personal Profile</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
              {['marital_status', 'smoker_status', 'race', 'qualification', 'languages_spoken', 'languages_written', 'risk_profile', 'employment_status', 'occupation'].map(f => renderField(f as any))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Contact Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
              {['email', 'mobile_no', 'home_no', 'office_no'].map(f => renderField(f as any))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Residential Address</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
              {['address_type', 'postal_district', 'house_block_no', 'street_name', 'building_name', 'unit_no'].map(f => renderField(f as any))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

export const FamilyForm: React.FC<{
  extracted: PdfExtractedData;
  includeFamily: boolean;
  setIncludeFamily: (v: boolean) => void;
  handleFamilyMemberChange: (idx: number, field: any, val: any) => void;
  removeFamilyMember: (idx: number) => void;
  addFamilyMember: () => void;
  disabled?: boolean;
}> = ({ extracted, includeFamily, setIncludeFamily, handleFamilyMemberChange, removeFamilyMember, addFamilyMember, disabled }) => (
  <Section title="Family Members" enabled={includeFamily} onToggle={() => setIncludeFamily(!includeFamily)}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {extracted.family.map((member, idx) => (
        <div key={idx} style={{ padding: '1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => removeFamilyMember(idx)}
            style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}
            title="Remove member"
            disabled={disabled}
          >×</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
            {FAMILY_FIELDS.map(f => (
              <EditableFieldRow
                key={f}
                fieldKey={f}
                label={formatLabel(f)}
                val={(member as any)[f]}
                included={includeFamily}
                onChange={(val) => handleFamilyMemberChange(idx, f, val)}
                disabled={disabled || !includeFamily}
              />
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="small" onClick={addFamilyMember} style={{ alignSelf: 'flex-start' }} disabled={disabled || !includeFamily}>+ Add Member</Button>
    </div>
  </Section>
);

export const CashflowForm: React.FC<{
  extracted: PdfExtractedData;
  includeCashflow: boolean;
  setIncludeCashflow: (v: boolean) => void;
  handleCashflowChange: (field: any, val: any) => void;
  disabled?: boolean;
}> = ({ extracted, includeCashflow, setIncludeCashflow, handleCashflowChange, disabled }) => (
  <Section title="Cashflow" enabled={includeCashflow} onToggle={() => setIncludeCashflow(!includeCashflow)}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Monthly Inflow</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
          {INFLOW_FIELDS.map(f => (
            <EditableFieldRow
              key={f}
              fieldKey={f}
              label={formatLabel(f)}
              val={(extracted.cashflow as any)[f]}
              included={includeCashflow}
              onChange={(val) => handleCashflowChange(f, val)}
              disabled={disabled || !includeCashflow}
            />
          ))}
        </div>
      </div>
      <div>
        <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '6px', letterSpacing: '0.1em', fontWeight: 700 }}>Monthly Outflow</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
          {OUTFLOW_FIELDS.map(f => (
            <EditableFieldRow
              key={f}
              fieldKey={f}
              label={formatLabel(f)}
              val={(extracted.cashflow as any)[f]}
              included={includeCashflow}
              onChange={(val) => handleCashflowChange(f, val)}
              disabled={disabled || !includeCashflow}
            />
          ))}
        </div>
      </div>
    </div>
  </Section>
);

export const InsuranceForm: React.FC<{
  extracted: PdfExtractedData;
  includeInsurance: boolean;
  setIncludeInsurance: (v: boolean) => void;
  handleInsuranceChange: (idx: number, field: any, val: any) => void;
  removeInsurance: (idx: number) => void;
  addInsurance: () => void;
  disabled?: boolean;
}> = ({ extracted, includeInsurance, setIncludeInsurance, handleInsuranceChange, removeInsurance, addInsurance, disabled }) => (
  <Section title="Insurance Plans" enabled={includeInsurance} onToggle={() => setIncludeInsurance(!includeInsurance)}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {extracted.insurance_plans.map((plan, idx) => (
        <div key={idx} style={{ padding: '1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => removeInsurance(idx)}
            style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}
            disabled={disabled}
          >×</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
            {INSURANCE_FIELDS.map(f => (
              <EditableFieldRow
                key={f}
                fieldKey={f}
                label={formatLabel(f)}
                val={(plan as any)[f]}
                included={includeInsurance}
                onChange={(val) => handleInsuranceChange(idx, f, val)}
                disabled={disabled || !includeInsurance}
              />
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="small" onClick={addInsurance} style={{ alignSelf: 'flex-start' }} disabled={disabled || !includeInsurance}>+ Add Plan</Button>
    </div>
  </Section>
);

export const InvestmentForm: React.FC<{
  extracted: PdfExtractedData;
  includeInvestments: boolean;
  setIncludeInvestments: (v: boolean) => void;
  handleInvestmentChange: (idx: number, field: any, val: any) => void;
  removeInvestment: (idx: number) => void;
  addInvestment: () => void;
  disabled?: boolean;
}> = ({ extracted, includeInvestments, setIncludeInvestments, handleInvestmentChange, removeInvestment, addInvestment, disabled }) => (
  <Section title="Investment Plans" enabled={includeInvestments} onToggle={() => setIncludeInvestments(!includeInvestments)}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {extracted.investments.map((inv, idx) => (
        <div key={idx} style={{ padding: '1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => removeInvestment(idx)}
            style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}
            disabled={disabled}
          >×</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
            {INVESTMENT_FIELDS.map(f => (
              <EditableFieldRow
                key={f}
                fieldKey={f}
                label={formatLabel(f)}
                val={(inv as any)[f]}
                included={includeInvestments}
                onChange={(val) => handleInvestmentChange(idx, f, val)}
                disabled={disabled || !includeInvestments}
              />
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="small" onClick={addInvestment} style={{ alignSelf: 'flex-start' }} disabled={disabled || !includeInvestments}>+ Add Plan</Button>
    </div>
  </Section>
);
