CREATE TABLE public.clients (
  client_id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer CHECK (age >= 0),
  occupation text,
  marital_status text,
  family_members_count integer CHECK (family_members_count >= 0),
  risk_profile text NOT NULL CHECK (risk_profile IN ('Conservative', 'Balanced', 'Aggressive')),
  last_updated date DEFAULT CURRENT_DATE,
  CONSTRAINT clients_pkey PRIMARY KEY (client_id)
);

CREATE TABLE public.client_plans (
  plan_id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  plan_name text NOT NULL,
  asset_class text NOT NULL CHECK (asset_class IN ('Equity', 'Fixed Income', 'Cash', 'Life Insurance', 'Health Insurance', 'General Insurance')),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void')),
  CONSTRAINT client_plans_pkey PRIMARY KEY (plan_id),
  CONSTRAINT client_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE
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
  plan_id uuid NOT NULL,
  as_of_date date NOT NULL,
  market_value numeric NOT NULL,
  CONSTRAINT investment_valuations_pkey PRIMARY KEY (valuation_id),
  CONSTRAINT investment_valuations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.client_plans(plan_id) ON DELETE CASCADE
);

CREATE TABLE public.insurance_valuations (
  valuation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  as_of_date date NOT NULL,
  death_benefit numeric NOT NULL DEFAULT 0 CHECK (death_benefit >= 0),
  cash_value numeric NOT NULL DEFAULT 0 CHECK (cash_value >= 0),
  critical_illness_benefit numeric NOT NULL DEFAULT 0 CHECK (critical_illness_benefit >= 0),
  disability_benefit numeric NOT NULL DEFAULT 0 CHECK (disability_benefit >= 0),
  CONSTRAINT insurance_valuations_pkey PRIMARY KEY (valuation_id),
  CONSTRAINT insurance_valuations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.client_plans(plan_id) ON DELETE CASCADE
);