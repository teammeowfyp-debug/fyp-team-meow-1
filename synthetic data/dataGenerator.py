import pandas as pd
import numpy as np
from faker import Faker
import uuid
from datetime import datetime, timedelta

fake = Faker()

# Configuration
NUM_CLIENTS = 30
NUM_USERS = 5  # 1 admin + 4 staff

def generate_financial_data():
    users = []
    clients = []
    investments = []
    insurance = []
    investment_valuations = []
    insurance_valuations = []
    cashflows = []
    family = []

    investment_types = ['Equity', 'Fixed Income', 'Cash']
    insurance_types = ['Life Insurance', 'Health Insurance', 'General Insurance']
    plan_statuses = ['Pending', 'Active', 'Lapsed', 'Matured', 'Settled', 'Void']
    frequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual']
    freq_map = {'Monthly': 12, 'Quarterly': 4, 'Semi-Annual': 2, 'Annual': 1}
    life_assured_options = ['Self', 'Spouse', 'Child', 'Parent']
    benefit_types = ['Critical Illness', 'Accidental', 'Hospitalization', 'Death', 'Total Permanent Disability']
    occupations = ['Software Engineer', 'Doctor', 'Teacher', 'Accountant', 'Lawyer', 'Artist', 'Unemployed', 'Retired', 'Business Owner', 'Student']
    marital_statuses = ['Single', 'Married', 'Divorced', 'Widowed']
    risk_profiles = ['Level 1', 'Level 2', 'Level 3', 'Level 4']
    investment_keywords = ['Alpha', 'Global', 'Dividend', 'Strategic', 'ESG', 'Growth', 'Balanced', 'Pioneer', 'Horizon', 'Vantage']
    insurance_keywords = ['Life', 'Health', 'Shield', 'Total Care', 'Term', 'Legacy', 'Wellness', 'Secure', 'Supreme', 'Essential']

    DATE_TODAY = datetime.now().date()

    # 0. Generate users (agents) - 1 admin, 4 staff
    admin_names = ['Ryan Admin']  # Customize admin name
    staff_first = ['Wei Ming', 'Priya', 'James', 'Sarah']
    staff_last = ['Tan', 'Kumar', 'Lee', 'Wong']
    for i in range(NUM_USERS):
        is_admin = i == 0
        if is_admin:
            full_name = admin_names[0]
            email = 'admin@calibre.com'
        else:
            full_name = f"{staff_first[i-1]} {staff_last[i-1]}"
            email = f"{staff_first[i-1].lower()}.{staff_last[i-1].lower()}@calibre.com"
        users.append({
            'user_id': str(uuid.uuid4()),
            'full_name': full_name,
            'email': email,
            'role': 'admin' if is_admin else 'staff',
            'admin': is_admin
        })
    user_ids = [u['user_id'] for u in users]

    for _ in range(NUM_CLIENTS):
        c_id = str(uuid.uuid4())
        assigned_user_id = np.random.choice(user_ids)
        # 1. Core Profile Generation (Age & Occupation first)
        client_age = np.random.randint(18, 85)
        
        if client_age < 23:
            occ = np.random.choice(['Student', 'Software Engineer', 'Artist', 'Unemployed'], p=[0.6, 0.1, 0.1, 0.2])
        elif client_age > 65:
            occ = np.random.choice(['Retired', 'Business Owner', 'Consultant'], p=[0.7, 0.2, 0.1])
        else:
            occ = np.random.choice(occupations)

        # Salary based on Occupation
        if occ == 'Unemployed':
            base_salary = 0
        elif occ in ['Student', 'Retired']:
            base_salary = np.random.uniform(0, 1500) # Pension or odd jobs
        else:
            base_salary = np.random.uniform(4000, 15000)

        # Property Status (Scaled to income)
        has_property = (occ not in ['Student', 'Unemployed'] and client_age > 25 and np.random.random() < 0.6)
        # Rent/Mortgage is usually 20-40% of base salary
        housing_ratio = np.random.uniform(0.2, 0.4)
        client_rent = round(base_salary * housing_ratio, 2) if (has_property and np.random.random() < 0.3) else 0
        client_mortgage = round(base_salary * housing_ratio, 2) if (has_property and np.random.random() < 0.6) else 0
        mortgage_end_year = np.random.randint(1, 10)

        max_history_days = min(365 * 10, (client_age - 18) * 365)
        simulation_start = DATE_TODAY

        client_investments_list = []
        client_insurance_list = []

        # 2. Generate Investment Plans
        for _ in range(np.random.choice(6, p=[0.05, 0.15, 0.3, 0.3, 0.15, 0.05])):
            p_id = str(uuid.uuid4())
            p_type = np.random.choice(investment_types)
            status = np.random.choice(plan_statuses, p=[0.05, 0.8, 0.05, 0.0, 0.05, 0.05])

            plan_start_date = DATE_TODAY - timedelta(days=np.random.randint(0, max_history_days + 1))
            if plan_start_date < simulation_start: simulation_start = plan_start_date
            
            if status in ['Lapsed', 'Void']:
                expiry_date = plan_start_date + timedelta(days=np.random.randint(30, 365*2))
                if expiry_date > DATE_TODAY: expiry_date = DATE_TODAY
            else:
                expiry_date = plan_start_date + timedelta(days=np.random.randint(365, 365*10))
                if expiry_date <= DATE_TODAY and status in ['Active', 'Pending']:
                    status = 'Matured'

            tag = np.random.choice(investment_keywords)
            p_name = f"{fake.company()} {tag} Fund"
            
            # Investments take 3-10% of salary
            inv_ratio = np.random.uniform(0.03, 0.10)
            cont_amt = round(base_salary * inv_ratio, 2) if base_salary > 0 else 0
            cont_freq = np.random.choice(frequencies) if cont_amt > 0 else None
            init_inv = round(base_salary * np.random.uniform(2, 6), 2) if base_salary > 0 else 5000

            inv_obj = {
                'policy_id': p_id,
                'client_id': c_id,
                'policy_name': p_name,
                'policy_type': p_type,
                'initial_investment': round(init_inv, 2),
                'contribution_amount': round(cont_amt, 2),
                'contribution_frequency': cont_freq,
                'start_date': plan_start_date,
                'expiry_date': expiry_date,
                'status': status
            }
            investments.append(inv_obj)
            client_investments_list.append(inv_obj)

        # 3. Generate Insurance Policies
        for _ in range(np.random.choice(6, p=[0.05, 0.15, 0.3, 0.3, 0.15, 0.05])):
            p_id = str(uuid.uuid4())
            p_type = np.random.choice(insurance_types, p=[0.5, 0.25, 0.25])
            status = np.random.choice(plan_statuses, p=[0.05, 0.8, 0.05, 0.0, 0.05, 0.05])

            plan_start_date = DATE_TODAY - timedelta(days=np.random.randint(0, max_history_days + 1))
            if plan_start_date < simulation_start: simulation_start = plan_start_date

            if status in ['Lapsed', 'Void']:
                expiry_date = plan_start_date + timedelta(days=np.random.randint(30, 365*2))
                if expiry_date > DATE_TODAY: expiry_date = DATE_TODAY
            else:
                expiry_date = plan_start_date + timedelta(days=np.random.randint(365, 365*10))
                if expiry_date <= DATE_TODAY and status in ['Active', 'Pending']:
                    status = 'Matured'
            
            tag = np.random.choice(insurance_keywords)
            p_name = f"{fake.company()} {tag} Plan"

            # Insurance premiums take 1-4% of salary
            ins_ratio = np.random.uniform(0.01, 0.04)
            premium = round(base_salary * ins_ratio, 2) if base_salary > 0 else 100
            
            # Sum assured is usually 5-10x annual salary
            sum_assured = round(base_salary * 12 * np.random.uniform(5, 10), 2) if base_salary > 0 else 100000

            ins_obj = {
                'policy_id': p_id,
                'client_id': c_id,
                'policy_name': p_name,
                'policy_type': p_type,
                'benefit_type': np.random.choice(benefit_types),
                'sum_assured': sum_assured,
                'premium_amount': round(premium, 2),
                'payment_frequency': np.random.choice(frequencies),
                'payment_term': np.random.randint(5, 30),
                'life_assured': np.random.choice(life_assured_options),
                'start_date': plan_start_date,
                'expiry_date': expiry_date,
                'status': status
            }
            insurance.append(ins_obj)
            client_insurance_list.append(ins_obj)

        # Generate Master Timeline
        event_dates = [p['start_date'] for p in client_investments_list + client_insurance_list]
        current_meeting = simulation_start
        client_risk = np.random.choice(risk_profiles, p=[0.1, 0.4, 0.4, 0.1])

        # Demographic generation
        gender = np.random.choice(['Male', 'Female'])
        title = 'Mr.' if gender == 'Male' else np.random.choice(['Ms.', 'Mrs.'])
        dob = DATE_TODAY - timedelta(days=client_age * 365 + np.random.randint(0, 365))
        
        # Consolidated Demographic Logic
        if np.random.random() < 0.7:
            nationality = 'Singaporean'
            singapore_pr = 'No'
            id_type = 'NRIC'
            fin_no = None
            fin_expiry = None
        else:
            nationality = fake.country()
            # If not Singaporean, could be PR or Foreigner
            if np.random.random() < 0.4:
                singapore_pr = 'Yes'
                id_type = 'NRIC'
                fin_no = None
                fin_expiry = None
            else:
                singapore_pr = 'No'
                id_type = 'Passport'
                # Foreigners in SG have a FIN (Foreign Identification Number)
                fin_no = fake.bothify(text='?#######?').upper() # F/G prefix usually
                fin_expiry = DATE_TODAY + timedelta(days=np.random.randint(180, 730))

        id_expiry = None if id_type == 'NRIC' else DATE_TODAY + timedelta(days=np.random.randint(365, 3650))
        
        # Written subset of spoken
        all_langs = ['English', 'Mandarin', 'Malay', 'Tamil', 'Hokkien', 'Cantonese']
        if np.random.random() < 0.8:
            spoken_list = ['English'] + np.random.choice([l for l in all_langs if l != 'English'], size=np.random.randint(0, 3), replace=False).tolist()
        else:
            spoken_list = np.random.choice(all_langs, size=np.random.randint(1, 4), replace=False).tolist()
        written_candidates = [l for l in spoken_list if l in ['English', 'Mandarin', 'Malay', 'Tamil']]
        if not written_candidates:
            written_list = [np.random.choice(['English', 'Mandarin'])]
        else:
            written_list = np.random.choice(written_candidates, size=np.random.randint(1, len(written_candidates) + 1), replace=False).tolist()

        # Format arrays for Postgres CSV consumption
        spoken_pg = "{" + ",".join(sorted(spoken_list)) + "}"
        written_pg = "{" + ",".join(sorted(written_list)) + "}"

        # Employment Status logic
        if occ in ['Student', 'Unemployed', 'Retired']:
            emp_status = occ
        else:
            emp_status = np.random.choice(['Full-time', 'Part-time', 'Contract', 'Self-employed', 'Freelance'], p=[0.7, 0.1, 0.05, 0.1, 0.05])
        
        address_selection = np.random.choice(['Local', 'Overseas'], p=[0.8, 0.2])

        client_last_name = fake.last_name()
        client_first_name = fake.first_name_male() if gender == 'Male' else fake.first_name_female()
        client_full_name = f"{client_first_name} {client_last_name}"
        
        # Determine father's surname for children logic
        # If client is male, he is the father. If female, we'll determine/generate husband's name later if married.
        household_father_surname = client_last_name if gender == 'Male' else None

        clients.append({
            'client_id': c_id,
            'assigned_user_id': assigned_user_id,
            'title': title,
            'name_as_per_id': client_full_name,
            'gender': gender,
            'date_of_birth': dob,
            'age': client_age,
            'smoker_status': np.random.choice(["Non-smoker", "Smoker"], p=[0.8, 0.2]),
            'race': np.random.choice(['Chinese', 'Malay', 'Indian', 'Caucasian', 'Others']),
            'marital_status': np.random.choice(marital_statuses),
            'qualification': np.random.choice(['Bachelors', 'Masters', 'PhD', 'Diploma', 'A-Levels', 'O-Levels', 'None']),
            'nationality': nationality,
            'singapore_pr': singapore_pr,
            'id_type': id_type,
            'id_no': fake.bothify(text='?#######?').upper(),
            'id_expiry_date': id_expiry,
            'fin_no': fin_no,
            'fin_expiry_date': fin_expiry,
            'languages_spoken': spoken_pg,
            'languages_written': written_pg,
            'email': fake.email(),
            'mobile_no': fake.numerify(text='8#######'),
            'home_no': fake.numerify(text='6#######') if np.random.random() < 0.5 else None,
            'office_no': fake.numerify(text='6#######') if np.random.random() < 0.3 else None,
            'occupation': occ,
            'employment_status': emp_status,
            'address_type': address_selection,
            'postal_district': fake.numerify(text='######'),
            'house_block_no': fake.building_number(),
            'street_name': fake.street_name(),
            'building_name': f"{np.random.choice(['Ocean', 'Sky', 'Garden', 'Green', 'Royal', 'Grand', 'Silver', 'Golden', 'Regency', 'Park', 'River', 'High'] if np.random.random() < 0.7 else [fake.last_name() for _ in range(5)])} {np.random.choice(['View', 'Suites', 'Gardens', 'Residences', 'Point', 'Towers', 'Apartments', 'Heights', 'Plaza', 'Court'])}",
            'unit_no': f"#{np.random.randint(1, 50):02d}-{np.random.randint(1, 100):02d}",
            'risk_profile': client_risk,
            'last_updated': DATE_TODAY
        })

        # Stable Investment Income (Linked to Portfolio Size)
        # Assume ~2-4% dividend yield per year, converted to monthly income
        total_initial_capital = sum(p['initial_investment'] for p in client_investments_list)
        yield_rate = np.random.uniform(0.02, 0.04)
        client_inv_income = round((total_initial_capital * yield_rate) / 12, 2) if total_initial_capital > 0 else 0

        # Family Generation
        client_family_list = []
        # Spouse
        if clients[-1]['marital_status'] == 'Married':
            s_age = client_age + np.random.randint(-5, 5)
            s_age = max(18, s_age)
            s_gender = 'Female' if gender == 'Male' else 'Male'
            s_dob = DATE_TODAY - timedelta(days=s_age * 365 + np.random.randint(0, 365))
            s_first_name = fake.first_name_male() if s_gender == 'Male' else fake.first_name_female()
            
            # Realism: Wife often has her own surname on IC. Husband provides surname for children.
            if s_gender == 'Male':
                s_last_name = fake.last_name()
                household_father_surname = s_last_name
            else:
                s_last_name = fake.last_name() # Maiden name
            
            client_family_list.append({
                'family_member_id': str(uuid.uuid4()),
                'client_id': c_id,
                'family_member_name': f"{s_first_name} {s_last_name}",
                'gender': s_gender,
                'relationship': 'Spouse',
                'date_of_birth': s_dob,
                'age': s_age,
                'monthly_upkeep': 0, # Usually no upkeep for spouse in this context
                'support_until_age': None
            })
        
        # Children (if of child-bearing age)
        if 25 < client_age and np.random.random() < 0.5:
            num_children = np.random.randint(1, 4)
            for _ in range(num_children):
                c_age = np.random.randint(0, max(1, client_age - 20))
                c_dob = DATE_TODAY - timedelta(days=c_age * 365 + np.random.randint(0, 365))
                c_gender = np.random.choice(['Male', 'Female'])
                c_first_name = fake.first_name_male() if c_gender == 'Male' else fake.first_name_female()
                
                # If no father identified (e.g. spouse doesn't exist/unmarried female), follow mother's surname
                f_name = household_father_surname if household_father_surname else client_last_name
                
                client_family_list.append({
                    'family_member_id': str(uuid.uuid4()),
                    'client_id': c_id,
                    'family_member_name': f"{c_first_name} {f_name}",
                    'gender': c_gender,
                    'relationship': 'Child',
                    'date_of_birth': c_dob,
                    'age': c_age,
                    'monthly_upkeep': round(np.random.choice([100, 200, 300, 400, 500]), 2),
                    'support_until_age': 21 if np.random.random() < 0.8 else np.random.randint(22, 26) # Support until graduation
                })

        # Parents
        if 25 < client_age < 65 and np.random.random() < 0.5:
            num_parents = np.random.randint(1, 3)
            for _ in range(num_parents):
                p_age = client_age + np.random.randint(25, 45)
                p_age = min(95, p_age)
                p_dob = DATE_TODAY - timedelta(days=p_age * 365 + np.random.randint(0, 365))
                p_gender = np.random.choice(['Male', 'Female'])
                p_first_name = fake.first_name_male() if p_gender == 'Male' else fake.first_name_female()
                client_family_list.append({
                    'family_member_id': str(uuid.uuid4()),
                    'client_id': c_id,
                    'family_member_name': f"{p_first_name} {client_last_name}",
                    'gender': p_gender,
                    'relationship': 'Parent',
                    'date_of_birth': p_dob,
                    'age': p_age,
                    'monthly_upkeep': round(np.random.choice([0, 100, 200, 300, 400, 500]), 2),
                    'support_until_age': np.random.choice([70, 75, 80, 85, 90, 95])
                })

        family.extend(client_family_list)
        total_upkeep = sum(f['monthly_upkeep'] for f in client_family_list)
        # Generate Master Timeline (Include Starts AND Expiries)
        event_dates = [p['start_date'] for p in client_investments_list + client_insurance_list]
        event_dates += [p['expiry_date'] for p in client_investments_list + client_insurance_list if p['expiry_date'] <= DATE_TODAY]
        
        current_meeting = simulation_start
        while current_meeting <= DATE_TODAY:
            event_dates.append(current_meeting)
            current_meeting += timedelta(days=np.random.randint(90, 365))
        
        all_meeting_dates = sorted(list(set(event_dates)))
        last_date = all_meeting_dates[-1]
        clients[-1]['last_updated'] = last_date
        for f in client_family_list:
            f['last_updated'] = last_date

        for meeting_date in all_meeting_dates:
            years_from_start = (meeting_date - simulation_start).days / 365.25
            current_salary = base_salary * (1.03 ** years_from_start)

            # Employee CPF Rates (only this affects take-home cashflow)
            cpf_rate = 0.20
            if client_age > 70: cpf_rate = 0.05
            elif client_age > 65: cpf_rate = 0.075
            elif client_age > 60: cpf_rate = 0.1
            elif client_age > 55: cpf_rate = 0.125

            # Effective Tax Rate
            tax_rate = 0
            if current_salary > 8000: tax_rate = 0.08
            elif current_salary > 4000: tax_rate = 0.04
            elif current_salary > 2500: tax_rate = 0.01

            # Investment Income Growth (Gradual 4% CAGR)
            current_inv_income = client_inv_income * (1.04 ** years_from_start)
            
            # Lifestyle Expenses linked to CURRENT salary
            current_household_expenses = 500 + (len(client_family_list) * 200) + (current_salary * 0.1) + total_upkeep

            # No mortgages for students/unemployed/under-25s usually
            current_p_loan = client_mortgage if years_from_start < mortgage_end_year else 0
            p_expenses = (current_household_expenses * 0.2) if (has_property or np.random.random() < 0.2) else 0
            
            # If they are a landlord, they definitely have property expenses
            if client_rent > 0: p_expenses = max(p_expenses, 300) 

            # Only pay if the plan has started AND hasn't expired
            def get_monthly_normalized_amt(p, current_date, amt_key, freq_key):
                if not (p['start_date'] <= current_date <= p['expiry_date']):
                    return 0
                if 'payment_term' in p:
                    years_since_start = (current_date - p['start_date']).days / 365.25
                    if years_since_start > p['payment_term']:
                        return 0
                amt = p.get(amt_key, 0)
                freq = p.get(freq_key)
                if not freq or amt == 0: return 0
                return amt * freq_map[freq] / 12

            insurance_total = sum(get_monthly_normalized_amt(p, meeting_date, 'premium_amount', 'payment_frequency') for p in client_insurance_list)
            investment_total = sum(get_monthly_normalized_amt(p, meeting_date, 'contribution_amount', 'contribution_frequency') for p in client_investments_list)

            # Rental Income Growth (2% CAGR) + Noise
            current_rental_income = client_rent * (1.02 ** years_from_start)
            if current_rental_income > 0:
                current_rental_income *= (1 + np.random.uniform(-0.05, 0.05))

            cashflows.append({
                'cashflow_id': str(uuid.uuid4()),
                'client_id': c_id,
                'as_of_date': meeting_date,
                'employment_income_gross': round(current_salary, 2),
                'rental_income': round(current_rental_income, 2),
                'investment_income': round(current_inv_income * (1 + np.random.uniform(-0.3, 0.3)), 2) if current_inv_income > 0 else 0,
                'household_expenses': round(current_household_expenses, 2),
                'income_tax': round(current_salary * tax_rate, 2),
                'insurance_premiums': round(insurance_total, 2),
                'property_expenses': round(p_expenses * (1 + np.random.uniform(-0.1, 0.1)), 2),
                'property_loan_repayment': round(current_p_loan, 2),
                'non_property_loan_repayment': round(current_salary * np.random.uniform(0.05, 0.1), 2) if np.random.random() < 0.3 else 0,
                'cpf_contribution_total': round(min(current_salary, 8000) * cpf_rate, 2),
                'regular_investments': round(investment_total, 2)
            })

            # Investment Valuations
            for inv in client_investments_list:
                if inv['start_date'] <= meeting_date and (inv['expiry_date'] is None or meeting_date <= inv['expiry_date']):
                    years_passed = (meeting_date - inv['start_date']).days / 365.25
                    
                    # Calculate total contributions up to this date
                    total_contributions = 0
                    if inv['contribution_amount'] > 0:
                        periods_per_year = freq_map[inv['contribution_frequency']]
                        total_contributions = inv['contribution_amount'] * (years_passed * periods_per_year)
                    
                    capital_invested = inv['initial_investment'] + total_contributions
                    growth = (1.06 ** years_passed) * (1 + np.random.uniform(-0.05, 0.05))

                    investment_valuations.append({
                        'valuation_id': str(uuid.uuid4()),
                        'policy_id': inv['policy_id'],
                        'as_of_date': meeting_date,
                        'current_value': round(capital_invested * growth, 2)
                    })

            # Insurance Valuations (Only Life Insurance)
            for ins in client_insurance_list:
                if ins['policy_type'] == 'Life Insurance':
                    if ins['start_date'] <= meeting_date and (ins['expiry_date'] is None or meeting_date <= ins['expiry_date']):
                        years_passed = (meeting_date - ins['start_date']).days / 365.25
                        cash_val = (ins['premium_amount'] * 12 * years_passed * 0.4)
                        insurance_valuations.append({
                            'valuation_id': str(uuid.uuid4()),
                            'policy_id': ins['policy_id'],
                            'as_of_date': meeting_date,
                            'current_value': round(cash_val, 2)
                        })

    return (pd.DataFrame(users), pd.DataFrame(clients), pd.DataFrame(investments), pd.DataFrame(insurance),
            pd.DataFrame(investment_valuations), pd.DataFrame(insurance_valuations),
            pd.DataFrame(cashflows), pd.DataFrame(family))

# Generate data
df_users, df_clients, df_investments, df_insurance, df_inv_vals, df_ins_vals, df_cash, df_family = generate_financial_data()

# Export to CSVs
df_users.to_csv('synthetic data/users.csv', index=False)
df_clients.to_csv('synthetic data/clients.csv', index=False)
df_investments.to_csv('synthetic data/client_investments.csv', index=False)
df_insurance.to_csv('synthetic data/client_insurance.csv', index=False)
df_inv_vals.to_csv('synthetic data/investment_valuations.csv', index=False)
df_ins_vals.to_csv('synthetic data/insurance_valuations.csv', index=False)
df_cash.to_csv('synthetic data/cashflow.csv', index=False)
df_family.to_csv('synthetic data/client_family.csv', index=False)

print("Data generation complete:")
print(f"  - users.csv: {len(df_users)} rows")
print(f"  - clients.csv: {len(df_clients)} rows")
print(f"  - client_investments.csv: {len(df_investments)} rows")
print(f"  - client_insurance.csv: {len(df_insurance)} rows")
print(f"  - investment_valuations.csv: {len(df_inv_vals)} rows")
print(f"  - insurance_valuations.csv: {len(df_ins_vals)} rows")
print(f"  - cashflow.csv: {len(df_cash)} rows")
print(f"  - client_family.csv: {len(df_family)} rows")