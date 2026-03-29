import { supabase } from './supabaseClient';
import { apiClient } from './apiClient';

export interface PdfExtractedData {
  client: {
    name_as_per_id?: string | null;
    title?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    age?: number | null;
    marital_status?: string | null;
    smoker_status?: string | null;
    race?: string | null;
    qualification?: string | null;
    languages_spoken?: string[] | null;
    languages_written?: string[] | null;
    nationality?: string | null;
    singapore_pr?: string | null;
    id_type?: string | null;
    id_no?: string | null;
    email?: string | null;
    mobile_no?: string | null;
    home_no?: string | null;
    office_no?: string | null;
    employment_status?: string | null;
    occupation?: string | null;
    address_type?: string | null;
    postal_district?: string | null;
    house_block_no?: string | null;
    street_name?: string | null;
    building_name?: string | null;
    unit_no?: string | null;
    risk_profile?: string | null;
  };
  family: Array<{
    family_member_name: string;
    relationship: string;
    gender?: string | null;
    date_of_birth?: string | null;
    age?: number | null;
    monthly_upkeep?: number | null;
    support_until_age?: number | null;
    years_to_support?: number | null;
  }>;
  cashflow?: {
    employment_income_gross?: number | null;
    rental_income?: number | null;
    investment_income?: number | null;
    household_expenses?: number | null;
    income_tax?: number | null;
    insurance_premiums?: number | null;
    property_expenses?: number | null;
    property_loan_repayment?: number | null;
    non_property_loan_repayment?: number | null;
    cpf_contribution_total?: number | null;
    regular_investments?: number | null;
    total_inflow?: number | null;
    total_outflow?: number | null;
    net_position?: number | null;
  } | null;
  insurance_plans: Array<{
    policy_name: string;
    policy_type?: string | null;
    life_assured?: string | null;
    sum_assured?: number | null;
    premium_amount?: number | null;
    payment_frequency?: string | null;
    payment_term?: number | null;
    benefit_type?: string | null;
    start_date?: string | null;
    expiry_date?: string | null;
    status: string;
  }>;
  investments: Array<{
    policy_name: string;
    policy_type?: string | null;
    start_date?: string | null;
    status: string;
  }>;
}

/**
 * Creates a blank data structure for manual client entry.
 */
export function createEmptyExtractedData(): PdfExtractedData {
  return {
    client: {
      name_as_per_id: '',
      title: null,
      gender: null,
      date_of_birth: null,
      age: null,
      marital_status: null,
      smoker_status: null,
      race: null,
      qualification: null,
      languages_spoken: [],
      languages_written: [],
      nationality: null,
      singapore_pr: null,
      id_type: 'NRIC',
      id_no: '',
      email: '',
      mobile_no: '',
      home_no: '',
      office_no: '',
      employment_status: null,
      occupation: '',
      address_type: null,
      risk_profile: null,
    },
    family: [],
    cashflow: {
      employment_income_gross: 0,
      rental_income: 0,
      investment_income: 0,
      household_expenses: 0,
      income_tax: 0,
      insurance_premiums: 0,
      property_expenses: 0,
      property_loan_repayment: 0,
      non_property_loan_repayment: 0,
      cpf_contribution_total: 0,
      regular_investments: 0,
    },
    insurance_plans: [],
    investments: [],
  };
}

/**
 * Find an existing client by their ID number.
 * Returns the client object or null if not found.
 */
export async function matchClientByIdNo(idNo: string) {
  const cleanId = idNo.replace(/\s+/g, '').toUpperCase();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .ilike('id_no', cleanId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Normalizes extracted data to match strict system constraints (ENUMS).
 * This maps common variations (e.g., "Full Time" to "Full-time") found by AI.
 */
export function normalizeExtractedData(data: PdfExtractedData): PdfExtractedData {
  const d = JSON.parse(JSON.stringify(data)); // deep clone

  const normalize = (val: any, target: string[], strict = true) => {
    let sVal = val;
    if (typeof val === 'boolean') sVal = val ? 'Yes' : 'No';
    if (sVal === null || sVal === undefined || sVal === '') return null;

    const s = String(sVal).trim().toLowerCase().replace(/-/g, ' ');

    // Custom aliases for common variations
    if (target.includes('Spouse') && (s === 'wife' || s === 'husband' || s === 'partner')) return 'Spouse';
    if (target.includes('Child') && (s === 'son' || s === 'daughter' || s === 'children')) return 'Child';
    if (target.includes('Parent') && (s === 'father' || s === 'mother' || s === 'parents')) return 'Parent';

    const match = target.find(option =>
      option.toLowerCase().replace(/-/g, ' ') === s ||
      option.toLowerCase().replace(/-/g, '').replace(/\s+/g, '') === s.replace(/\s+/g, '')
    );
    return match || (strict ? null : sVal);
  };

  // 1. Client Details
  if (d.client) {
    const c = d.client;
    if (c.title !== undefined) c.title = normalize(c.title, ['Mr.', 'Ms.', 'Mrs.']);
    if (c.gender !== undefined) c.gender = normalize(c.gender, ['Male', 'Female']);
    if (c.smoker_status !== undefined) c.smoker_status = normalize(c.smoker_status, ['Smoker', 'Non-smoker']);
    if (c.marital_status !== undefined) c.marital_status = normalize(c.marital_status, ['Single', 'Married', 'Divorced', 'Widowed']);
    if (c.race !== undefined) c.race = normalize(c.race, ['Chinese', 'Malay', 'Indian', 'Caucasian', 'Others']);
    if (c.employment_status !== undefined) c.employment_status = normalize(c.employment_status, ['Full-time', 'Part-time', 'Contract', 'Self-employed', 'Freelance', 'Student', 'Unemployed', 'Retired']);
    if (c.address_type !== undefined) c.address_type = normalize(c.address_type, ['Local', 'Overseas']);
    if (c.risk_profile !== undefined) c.risk_profile = normalize(c.risk_profile, ['Level 1', 'Level 2', 'Level 3', 'Level 4']);
    if (c.qualification !== undefined) c.qualification = normalize(c.qualification, ['Primary', 'Secondary', 'Diploma', 'Degree', 'Masters', 'PhD', 'Others'], false);

    if (c.singapore_pr !== undefined) c.singapore_pr = normalize(c.singapore_pr, ['Yes', 'No']);
    if (c.id_type !== undefined) c.id_type = normalize(c.id_type, ['NRIC', 'Passport']);
  }

  // 2. Family Members
  if (d.family) {
    d.family.forEach((m: any) => {
      if (m.gender !== undefined) m.gender = normalize(m.gender, ['Male', 'Female']);
      if (m.relationship !== undefined) m.relationship = normalize(m.relationship, ['Spouse', 'Child', 'Parent']);
      if (m.monthly_upkeep != null) m.monthly_upkeep = Math.max(0, Number(m.monthly_upkeep || 0));
      if (m.support_until_age != null) m.support_until_age = Math.max(0, Number(m.support_until_age || 0));
      if (m.age != null) m.age = Math.max(0, Number(m.age || 0));
    });
  }

  // 3. Cashflow
  if (d.cashflow) {
    Object.keys(d.cashflow).forEach(k => {
      if (k !== 'as_of_date' && typeof d.cashflow[k] === 'number') {
        d.cashflow[k] = Math.max(0, d.cashflow[k]);
      } else if (k !== 'as_of_date' && !isNaN(Number(d.cashflow[k]))) {
        d.cashflow[k] = Math.max(0, Number(d.cashflow[k]));
      }
    });
  }

  // 4. Insurance Plans
  if (d.insurance_plans) {
    d.insurance_plans.forEach((p: any) => {
      if (p.policy_type !== undefined) p.policy_type = normalize(p.policy_type, ['Life Insurance', 'Health Insurance', 'General Insurance']);
      if (p.payment_frequency !== undefined) p.payment_frequency = normalize(p.payment_frequency, ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual']);

      if (p.sum_assured != null) p.sum_assured = Math.max(0, Number(p.sum_assured || 0));
      if (p.premium_amount != null) p.premium_amount = Math.max(0, Number(p.premium_amount || 0));
      if (p.payment_term != null) p.payment_term = Math.max(0, Number(p.payment_term || 0));

      p.status = 'Pending';
    });
  }

  // 5. Investments
  if (d.investments) {
    d.investments.forEach((inv: any) => {
      // DB check constraint: 'Equity', 'Fixed Income', 'Cash'
      if (inv.policy_type !== undefined) inv.policy_type = normalize(inv.policy_type, ['Equity', 'Fixed Income', 'Cash']);

      inv.status = 'Pending';
    });
  }

  return d;
}

/**
 * Find an existing client by their primary key (client_id).
 */
export async function getClientById(clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a brand-new client from PDF data.
 * assigned_user_id should be the currently logged-in user's ID.
 */
export async function createClientFromPdf(
  data: PdfExtractedData,
  assignedUserId: string,
  selectedFields: Set<string>
) {
  const now = new Date().toISOString();

  // 1. Insert client row
  const clientRow = buildClientRow(data.client, selectedFields);
  const { data: newClient, error: clientErr } = await supabase
    .from('clients')
    .insert({ ...clientRow, assigned_user_id: assignedUserId, last_updated: now })
    .select('client_id')
    .single();

  if (clientErr) throw handleDatabaseError(clientErr);
  const clientId = newClient.client_id;

  try {
    await writeRelatedData(clientId, data, selectedFields, now);
    return clientId;
  } catch (err) {
    // ATOMICITY: If related data fails to save, delete the orphan client record
    console.error('Failed to save related data, cleaning up client record...', err);
    await supabase.from('clients').delete().eq('client_id', clientId);
    throw err;
  }
}

/**
 * Update an existing client from PDF data.
 * Cashflow is always appended as a new row (time-series).
 */
export async function updateClientFromPdf(
  clientId: string,
  data: PdfExtractedData,
  selectedFields: Set<string>
) {
  const now = new Date().toISOString();

  // 1. Update client row
  const clientRow = buildClientRow(data.client, selectedFields);
  if (Object.keys(clientRow).length > 0) {
    const { error } = await supabase
      .from('clients')
      .update({ ...clientRow, last_updated: now })
      .eq('client_id', clientId);
    if (error) throw handleDatabaseError(error);
  }

  await writeRelatedData(clientId, data, selectedFields, now);
}

function buildClientRow(clientData: PdfExtractedData['client'], selectedFields: Set<string>) {
  const row: Record<string, any> = {};
  const fields = Object.keys(clientData) as Array<keyof typeof clientData>;
  for (const field of fields) {
    if (selectedFields.has(`client.${field}`) && clientData[field] != null) {
      row[field] = clientData[field];
    }
  }

  // Handle singapore_pr specifically as it was boolean and now string
  if (selectedFields.has('client.singapore_pr') && clientData.singapore_pr != null) {
    row.singapore_pr = clientData.singapore_pr;
  }

  // Calculate age if date_of_birth is present, as it's required by the schema
  if (row.date_of_birth && !row.age) {
    const dob = new Date(row.date_of_birth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      row.age = Math.max(0, age);
    }
  }

  // Ensure all numeric fields are >= 0 for DB check constraints
  if (row.age !== undefined && row.age < 0) row.age = 0;

  // Ensure these fields are explicitly initialized to empty arrays instead of null/undefined
  if (selectedFields.has('client.languages_spoken') && !row.languages_spoken) {
    row.languages_spoken = [];
  }
  if (selectedFields.has('client.languages_written') && !row.languages_written) {
    row.languages_written = [];
  }

  // The clientData is already normalized by normalizeExtractedData before being passed here.
  // We just ensure numeric types and mandatory field presence.

  return row;
}

export function handleDatabaseError(error: any): Error {
  const msg = error.message || '';

  if (msg.includes('no unique or exclusion constraint matching the ON CONFLICT specification')) {
    return new Error('Database Sync Error: Your database is missing some required unique indexes for syncing family members and insurance plans. Please contact your administrator or check the implementation plan to run the required SQL migration.');
  }

  if (msg.includes('years_to_support') || msg.includes('total_inflow') || msg.includes('net_position')) {
    return new Error('This form contains calculated fields (like Total Inflow or Years to Support) that are handled automatically by the system. Please try applying again—I have adjusted the save logic to let the database handle these calculations.');
  }

  if (msg.includes('violates not-null constraint')) {
    const field = msg.split('"')[1] || 'a required field';
    return new Error(`The field "${field}" cannot be blank. Please ensure it is filled in the review screen before applying.`);
  }

  if (msg.includes('violates check constraint')) {
    const parts = msg.split('"');
    const constraint = parts[3] || parts[1] || 'a database rule';
    return new Error(`Invalid value for ${constraint}. Please check your entries (especially negative numbers or dropdown options) and try again.`);
  }

  if (msg.includes('duplicate key value violates unique constraint')) {
    return new Error('This record (e.g., a Family Member or Insurance Policy) already exists for this client. Please check for duplicates in the review screen.');
  }

  return new Error(`System Error: ${msg}. If this persists, please contact support.`);
}

async function writeRelatedData(
  clientId: string,
  data: PdfExtractedData,
  selectedFields: Set<string>,
  now: string
) {
  const promises: Promise<any>[] = [];

  // 2. Upsert family members
  if (selectedFields.has('family') && data.family?.length > 0) {
    for (const member of data.family) {
      // years_to_support is a generated column in Supabase
      const { years_to_support, ...memberToInsert } = member; // eslint-disable-line @typescript-eslint/no-unused-vars

      // Sanitize numeric fields for DB check constraints (>= 0)
      if (memberToInsert.monthly_upkeep != null) memberToInsert.monthly_upkeep = Math.max(0, memberToInsert.monthly_upkeep);
      if (memberToInsert.support_until_age != null) memberToInsert.support_until_age = Math.max(0, memberToInsert.support_until_age);
      if (memberToInsert.age != null) memberToInsert.age = Math.max(0, memberToInsert.age);

      promises.push(
        Promise.resolve(
          supabase
            .from('client_family')
            .upsert(
              { client_id: clientId, ...memberToInsert },
              { onConflict: 'client_id,family_member_name,relationship' }
            )
            .then(({ error }) => { if (error) throw handleDatabaseError(error); })
        )
      );
    }
  }

  // 3. Append new cashflow row (always a new time-series point)
  if (selectedFields.has('cashflow') && data.cashflow) {
    // Sanitize: Convert null/undefined to 0 for all numeric fields
    const sanitizedCf: Record<string, any> = {};
    for (const [k, v] of Object.entries(data.cashflow)) {
      if (k === 'as_of_date') {
        sanitizedCf[k] = v;
      } else {
        // DB check constraints require values >= 0
        sanitizedCf[k] = Math.max(0, (v === null || v === undefined) ? 0 : Number(v));
      }
    }

    // total_inflow, total_outflow, and net_position are generated columns in Supabase
    // We must NOT include them in the insert payload.
    const {
      total_inflow, total_outflow, net_position, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...cfToInsert
    } = sanitizedCf;

    promises.push(
      Promise.resolve(
        supabase
          .from('cashflow')
          .insert({ client_id: clientId, ...cfToInsert, as_of_date: now })
          .then(({ error }) => { if (error) throw handleDatabaseError(error); })
      )
    );
  }

  // 4. Insurance
  if (selectedFields.has('insurance') && data.insurance_plans?.length > 0) {
    const insRows = data.insurance_plans.map(p => ({
      client_id: clientId,
      policy_name: p.policy_name,
      policy_type: p.policy_type || 'Life Insurance',
      life_assured: p.life_assured || null,
      sum_assured: Math.max(0, Number(p.sum_assured || 0)),
      premium_amount: Math.max(0, Number(p.premium_amount || 0)),
      payment_frequency: p.payment_frequency || null,
      payment_term: Math.max(0, Number(p.payment_term || 0)),
      benefit_type: p.benefit_type || null,
      start_date: p.start_date || now,
      status: p.status || 'Pending'
    }));
    const { error: insErr } = await supabase.from('client_insurance').insert(insRows);
    if (insErr) throw handleDatabaseError(insErr);
  }

  // 5. Investments
  if (selectedFields.has('investments') && data.investments?.length > 0) {
    const invRows = data.investments.map(inv => ({
      client_id: clientId,
      policy_name: inv.policy_name,
      policy_type: inv.policy_type || 'Equity',
      start_date: inv.start_date || now,
      status: inv.status || 'Pending'
    }));
    const { error: invErr } = await supabase.from('client_investments').insert(invRows);
    if (invErr) throw handleDatabaseError(invErr);
  }

  await Promise.all(promises);
}

/**
 * Call the backend OCR endpoint with a PDF file.
 */
export async function parsePdfViaBackend(
  file: File
): Promise<PdfExtractedData> {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await apiClient('/ai/ocr', {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  return json.data as PdfExtractedData;
}
