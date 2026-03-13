CREATE TABLE public.users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  admin boolean NOT NULL DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

CREATE TABLE public.clients (
  client_id uuid NOT NULL DEFAULT gen_random_uuid(),
  assigned_user_id uuid NOT NULL,
  title text NOT NULL CHECK (title IN ('Mr.', 'Ms.', 'Mrs.')),
  name_as_per_id text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female')),
  date_of_birth date NOT NULL,
  age integer NOT NULL CHECK (age >= 0),
  smoker_status text NOT NULL CHECK (smoker_status IN ('Smoker', 'Non-smoker')),
  race text NOT NULL CHECK (race IN ('Chinese', 'Malay', 'Indian', 'Caucasian', 'Others')),
  marital_status text NOT NULL CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed')),
  qualification text,
  nationality text NOT NULL,
  singapore_pr text NOT NULL CHECK (singapore_pr IN ('Yes', 'No')),
  id_type text NOT NULL CHECK (id_type IN ('NRIC', 'Passport')),
  id_no text NOT NULL,
  id_expiry_date date,
  fin_no text,
  fin_expiry_date date,
  languages_spoken text[] NOT NULL,
  languages_written text[] NOT NULL,
  email text NOT NULL,
  mobile_no text NOT NULL,
  home_no text,
  office_no text,
  occupation text NOT NULL,
  employment_status text NOT NULL CHECK (employment_status IN ('Full-time', 'Part-time', 'Contract', 'Self-employed', 'Freelance', 'Student', 'Unemployed', 'Retired')),
  address_type text NOT NULL CHECK (address_type IN ('Local', 'Overseas')),
  postal_district text NOT NULL,
  house_block_no text NOT NULL,
  street_name text NOT NULL,
  building_name text,
  unit_no text,
  risk_profile text NOT NULL CHECK (risk_profile IN ('Level 1', 'Level 2', 'Level 3', 'Level 4')),
  last_updated date DEFAULT CURRENT_DATE,
  CONSTRAINT clients_pkey PRIMARY KEY (client_id),
  CONSTRAINT clients_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT
);

CREATE TABLE public.client_family (
  family_member_id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  family_member_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female')),
  relationship text NOT NULL CHECK (relationship IN ('Spouse', 'Child', 'Parent')),
  date_of_birth date NOT NULL,
  age integer NOT NULL CHECK (age >= 0),
  monthly_upkeep numeric DEFAULT 0 CHECK (monthly_upkeep >= 0),
  support_until_age integer CHECK (support_until_age >= 0),
  years_to_support integer GENERATED ALWAYS AS (
    CASE 
      WHEN support_until_age > age THEN support_until_age - age 
      ELSE 0 
    END
  ) STORED,
  last_updated date DEFAULT CURRENT_DATE,
  CONSTRAINT client_family_pkey PRIMARY KEY (family_member_id),
  CONSTRAINT client_family_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
);

CREATE TABLE public.client_investments (
  policy_id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  policy_name text NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN ('Equity', 'Fixed Income', 'Cash')),
  initial_investment numeric DEFAULT 0 CHECK (initial_investment >= 0),
  contribution_amount numeric DEFAULT 0 CHECK (contribution_amount >= 0),
  contribution_frequency text CHECK (contribution_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  start_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void')),
  CONSTRAINT client_investments_pkey PRIMARY KEY (policy_id),
  CONSTRAINT client_investments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
);

CREATE TABLE public.client_insurance (
  policy_id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  policy_name text NOT NULL,
  policy_type text NOT NULL CHECK (policy_type IN ('Life Insurance', 'Health Insurance', 'General Insurance')),
  benefit_type text,
  sum_assured numeric DEFAULT 0 CHECK (sum_assured >= 0),
  premium_amount numeric DEFAULT 0 CHECK (premium_amount >= 0),
  payment_frequency text CHECK (payment_frequency IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual')),
  payment_term integer CHECK (payment_term >= 0),
  life_assured text,
  start_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void')),
  CONSTRAINT client_insurance_pkey PRIMARY KEY (policy_id),
  CONSTRAINT client_insurance_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
);

CREATE TABLE public.cashflow (
  cashflow_id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  as_of_date date NOT NULL,

  -- Inflows
  employment_income_gross numeric NOT NULL DEFAULT 0 CHECK (employment_income_gross >= 0),
  rental_income numeric NOT NULL DEFAULT 0 CHECK (rental_income >= 0),
  investment_income numeric NOT NULL DEFAULT 0 CHECK (investment_income >= 0),

  -- Expenses
  household_expenses numeric NOT NULL DEFAULT 0 CHECK (household_expenses >= 0),
  income_tax numeric NOT NULL DEFAULT 0 CHECK (income_tax >= 0),
  insurance_premiums numeric NOT NULL DEFAULT 0 CHECK (insurance_premiums >= 0),
  property_expenses numeric NOT NULL DEFAULT 0 CHECK (property_expenses >= 0),
  property_loan_repayment numeric NOT NULL DEFAULT 0 CHECK (property_loan_repayment >= 0),
  non_property_loan_repayment numeric NOT NULL DEFAULT 0 CHECK (non_property_loan_repayment >= 0),

  -- Wealth Transfers
  cpf_contribution_total numeric NOT NULL DEFAULT 0 CHECK (cpf_contribution_total >= 0),
  regular_investments numeric NOT NULL DEFAULT 0 CHECK (regular_investments >= 0),

  -- Computed Columns
  total_inflow numeric GENERATED ALWAYS AS (
    employment_income_gross + rental_income + investment_income
  ) STORED,
  total_expense numeric GENERATED ALWAYS AS (
    household_expenses + income_tax + insurance_premiums + property_expenses + property_loan_repayment + non_property_loan_repayment
  ) STORED,
  wealth_transfers numeric GENERATED ALWAYS AS (
    cpf_contribution_total + regular_investments
  ) STORED,
  net_surplus numeric GENERATED ALWAYS AS (
    (employment_income_gross + rental_income + investment_income) - 
    (household_expenses + income_tax + insurance_premiums + property_expenses + property_loan_repayment + non_property_loan_repayment)
  ) STORED,
  net_cashflow numeric GENERATED ALWAYS AS (  -- After wealth transfers
    (employment_income_gross + rental_income + investment_income) - 
    (household_expenses + income_tax + insurance_premiums + property_expenses + property_loan_repayment + non_property_loan_repayment + cpf_contribution_total + regular_investments)
  ) STORED,

  CONSTRAINT cashflow_pkey PRIMARY KEY (cashflow_id),
  CONSTRAINT cashflow_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
);

CREATE TABLE public.investment_valuations (
  valuation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  as_of_date date NOT NULL,
  current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  CONSTRAINT investment_valuations_pkey PRIMARY KEY (valuation_id),
  CONSTRAINT investment_valuations_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.client_investments(policy_id) ON DELETE CASCADE
);

CREATE TABLE public.insurance_valuations (
  valuation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  as_of_date date NOT NULL,
  current_value numeric NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  CONSTRAINT insurance_valuations_pkey PRIMARY KEY (valuation_id),
  CONSTRAINT insurance_valuations_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.client_insurance(policy_id) ON DELETE CASCADE
);

CREATE TABLE public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(client_id) ON DELETE CASCADE,
    rating BOOLEAN NOT NULL,
    comment TEXT,
    ai_type TEXT,
    generated_content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);