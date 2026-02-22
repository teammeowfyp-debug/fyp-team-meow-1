import pandas as pd
import numpy as np
from faker import Faker
import uuid
from datetime import datetime, timedelta

fake = Faker()

# Configuration
NUM_CLIENTS = 10

def generate_financial_data():
    clients = []
    plans = []
    investment_valuations = []
    insurance_valuations = []
    cashflows = []

    investment_classes = ['Equity', 'Fixed Income', 'Cash']
    insurance_classes = ['Life Insurance', 'Health Insurance', 'General Insurance']
    asset_classes = investment_classes + insurance_classes
    
    plan_statuses = ['Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void']
    occupations = ['Software Engineer', 'Doctor', 'Teacher', 'Accountant', 'Lawyer', 'Artist', 'Unemployed', 'Retired', 'Business Owner', 'Student']
    marital_statuses = ['Single', 'Married', 'Divorced', 'Widowed']
    risk_profiles = ['Conservative', 'Balanced', 'Aggressive']

    DATE_TODAY = datetime.now().date()

    for _ in range(NUM_CLIENTS):
        c_id = str(uuid.uuid4())
        client_age = np.random.randint(18, 85)
        
        # Determine the maximum history we can generate for this client (max 6 years, but not before age 18)
        max_history_days = min(365 * 6, (client_age - 18) * 365)

        # Step 1: Generate Plans first to establish the timeline
        client_plans = []
        simulation_start = DATE_TODAY
        
        for i in range(np.random.randint(3, 10)):
            p_id = str(uuid.uuid4())
            a_class = np.random.choice(asset_classes)
            status = np.random.choice(plan_statuses, p=[0.05, 0.7, 0.1, 0.05, 0.05, 0.05])
            
            # Start date is constrained by their age
            plan_start_date = DATE_TODAY - timedelta(days=np.random.randint(0, max_history_days + 1))

            if plan_start_date < simulation_start:
                simulation_start = plan_start_date

            if status in ['Matured', 'Settled', 'Void', 'Lapsed']:
                plan_end_date = plan_start_date + timedelta(days=np.random.randint(90, 365*3))
                if plan_end_date > DATE_TODAY: plan_end_date = DATE_TODAY
            else:
                plan_end_date = None

            if a_class in investment_classes:
                tag = np.random.choice(['Strategic', 'Diversified', 'Global', 'Core', 'Principal', 'Portfolio'])
                p_name = f"{fake.company()} {tag} Fund"
            else:
                tag = np.random.choice(['Protector', 'Comprehensive', 'Classic', 'Secure', 'Essential', 'Plus'])
                p_name = f"{fake.company()} {tag} Plan"

            plan_obj = {
                'plan_id': p_id,
                'client_id': c_id,
                'plan_name': p_name,
                'asset_class': a_class,
                'start_date': plan_start_date,
                'end_date': plan_end_date,
                'status': status,
                'init_mkt_val': np.random.uniform(5000, 100000),
                'death_benefit': round(np.random.uniform(100000, 1000000), 2),
                'init_cash_val': 0,
                'ci_benefit': round(np.random.uniform(50000, 200000), 2),
                'disability_benefit': round(np.random.uniform(50000, 200000), 2),
                'cash_growth': round(np.random.uniform(1000, 2000), 2)
            }
            client_plans.append(plan_obj)
            plans.append({k: plan_obj[k] for k in ['plan_id', 'client_id', 'plan_name', 'asset_class', 'start_date', 'end_date', 'status']})

        # Step 2: Generate Master Timeline (Meetings + Sales Events)
        sales_dates = [p_obj['start_date'] for p_obj in client_plans]
        
        periodic_dates = []
        current_meeting = simulation_start
        while current_meeting <= DATE_TODAY:
            periodic_dates.append(current_meeting)
            current_meeting += timedelta(days=np.random.randint(90, 365))

        # Combine, sort, and deduplicate all event dates
        all_meeting_dates = sorted(list(set(sales_dates + periodic_dates)))

        # Update client profile with the date of the most recent recorded event
        last_upd = all_meeting_dates[-1] if all_meeting_dates else (DATE_TODAY - timedelta(days=np.random.randint(1, 180)))

        clients.append({
            'client_id': c_id,
            'full_name': fake.name(),
            'age': client_age,
            'occupation': np.random.choice(occupations),
            'marital_status': np.random.choice(marital_statuses),
            'family_members_count': np.random.randint(0, 6),
            'risk_profile': np.random.choice(risk_profiles),
            'last_updated': last_upd
        })

        # Step 3: For each event date, capture Cashflow AND all Plan Valuations
        base_salary = np.random.uniform(3000, 15000)
        base_expenses = base_salary * np.random.uniform(0.3, 0.7)

        for meeting_date in all_meeting_dates:
            # 3% annual salary growth
            years_from_start = (meeting_date - simulation_start).days / 365.25
            current_base_salary = base_salary * (1.03 ** years_from_start)

            # Inflows
            employment_income_gross = round(current_base_salary * np.random.uniform(0.98, 1.02), 2)
            has_rental = np.random.choice([0, 1], p=[0.8, 0.2])
            rental_income = round(np.random.uniform(1000, 3000), 2) if has_rental else 0
            investment_income = round(np.random.uniform(0, 1500), 2)
            
            # Expenses
            household_expenses = round(base_expenses * np.random.uniform(0.4, 0.7), 2)
            income_tax = round(employment_income_gross * np.random.uniform(0.05, 0.15), 2)
            insurance_premiums = round(base_expenses * np.random.uniform(0.1, 0.2), 2)
            property_expenses = round(base_expenses * np.random.uniform(0.1, 0.2), 2)
            
            # Loans
            has_property_loan = np.random.choice([0, 1], p=[0.8, 0.2])
            property_loan_repayment = round(np.random.uniform(100, 1000), 2) if has_property_loan else 0
            has_non_property_loan = np.random.choice([0, 1], p=[0.8, 0.2])
            non_property_loan_repayment = round(np.random.uniform(100, 300), 2) if has_non_property_loan else 0
            
            # Wealth Transfers
            cpf_contribution_total = round(min(employment_income_gross, 8000) * 0.37, 2) # cap CPF
            regular_investments = round(employment_income_gross * np.random.uniform(0, 0.25), 2)

            cashflows.append({
                'cashflow_id': str(uuid.uuid4()),
                'client_id': c_id,
                'as_of_date': meeting_date,
                'employment_income_gross': employment_income_gross,
                'rental_income': rental_income,
                'investment_income': investment_income,
                'household_expenses': household_expenses,
                'income_tax': income_tax,
                'insurance_premiums': insurance_premiums,
                'property_expenses': property_expenses,
                'property_loan_repayment': property_loan_repayment,
                'non_property_loan_repayment': non_property_loan_repayment,
                'cpf_contribution_total': cpf_contribution_total,
                'regular_investments': regular_investments
            })

            for p_obj in client_plans:
                # Plan must be active on this date
                is_active = (meeting_date >= p_obj['start_date']) and (p_obj['end_date'] is None or meeting_date <= p_obj['end_date'])
                
                if is_active:
                    years_passed = (meeting_date - p_obj['start_date']).days / 365.25
                    
                    if p_obj['asset_class'] in investment_classes:
                        growth = (1.05 ** years_passed) * (1 + np.random.uniform(-0.1, 0.1))
                        investment_valuations.append({
                            'valuation_id': str(uuid.uuid4()),
                            'plan_id': p_obj['plan_id'],
                            'as_of_date': meeting_date,
                            'market_value': round(p_obj['init_mkt_val'] * growth, 2)
                        })
                    else:
                        # Only Life Insurance typically accumulates cash value
                        cash_growth = p_obj['cash_growth'] * years_passed if p_obj['asset_class'] == 'Life Insurance' else 0
                        insurance_valuations.append({
                            'valuation_id': str(uuid.uuid4()),
                            'plan_id': p_obj['plan_id'],
                            'as_of_date': meeting_date,
                            'death_benefit': p_obj['death_benefit'],
                            'cash_value': round(p_obj['init_cash_val'] + cash_growth, 2),
                            'critical_illness_benefit': p_obj['ci_benefit'],
                            'disability_benefit': p_obj['disability_benefit']
                        })

    return (pd.DataFrame(clients), pd.DataFrame(plans), 
            pd.DataFrame(investment_valuations), pd.DataFrame(insurance_valuations),
            pd.DataFrame(cashflows))

df_clients, df_plans, df_inv_vals, df_ins_vals, df_cash = generate_financial_data()

# Export to CSVs
df_clients.to_csv('synthetic data/clients.csv', index=False)
df_plans.to_csv('synthetic data/client_plans.csv', index=False)
df_inv_vals.to_csv('synthetic data/investment_valuations.csv', index=False)
df_ins_vals.to_csv('synthetic data/insurance_valuations.csv', index=False)
df_cash.to_csv('synthetic data/cashflow.csv', index=False)

print(f"CSVs generated successfully!")
print(f"  - clients.csv: {len(df_clients)} rows")
print(f"  - client_plans.csv: {len(df_plans)} rows")
print(f"  - investment_valuations.csv: {len(df_inv_vals)} rows")
print(f"  - insurance_valuations.csv: {len(df_ins_vals)} rows")
print(f"  - cashflow.csv: {len(df_cash)} rows")