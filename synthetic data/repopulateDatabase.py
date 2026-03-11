import os
import pandas as pd
import subprocess
import sys
import psycopg2
from psycopg2.extras import execute_values
from urllib.parse import urlparse

def load_env(base_dir):
    """Load .env.local or .env from project root."""
    for name in ('.env.local', '.env'):
        env_path = os.path.join(base_dir, name)
        if os.path.exists(env_path):
            config = {}
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if '=' in line and not line.startswith('#'):
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip().strip('"').strip("'")
            return config
    return {}

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    synth_dir = os.path.join(base_dir, 'synthetic data')
    config = load_env(base_dir)
    
    # Connection Config
    db_url = config.get('VITE_SUPABASE_DATABASE_URL')
    db_password = config.get('VITE_SUPABASE_PASSWORD')
    db_host_override = config.get('VITE_SUPABASE_DB_HOST')
    supabase_url = config.get('VITE_SUPABASE_URL')

    # Detect if password/host was accidentally a full URL
    for val in [db_url, db_password, db_host_override]:
        if val and val.startswith('postgresql://'):
            db_url = val
            break

    if not db_password:
        env_path = os.path.join(base_dir, '.env.local')
        print(f"Error: Missing VITE_SUPABASE_PASSWORD in .env.local")
        print(f"  Looking for .env at: {os.path.abspath(env_path)}")
        print(f"  File exists: {os.path.exists(env_path)}")
        print(f"  Loaded keys: {list(config.keys())}")
        return
    if not supabase_url and not db_url:
        print("Error: Missing VITE_SUPABASE_URL (your project https URL) in .env.local")
        return

    # 1. Generate Data
    print("--- 1. Generating new data ---")
    try:
        subprocess.run([sys.executable, os.path.join(synth_dir, 'dataGenerator.py')], check=True, cwd=base_dir)
    except Exception as e:
        print(f"Error generating data: {e}")
        return

    # 2. Connect to Database
    print("\n--- 2. Resetting Schema ---")
    try:
        if db_url:
            conn = psycopg2.connect(db_url)
        else:
            project_ref = urlparse(supabase_url).netloc.split('.')[0] if supabase_url else "unknown"
            host = db_host_override or f"db.{project_ref}.supabase.co"
            user = f"postgres.{project_ref}" if "pooler.supabase.com" in host else "postgres"
            conn = psycopg2.connect(dbname='postgres', user=user, password=db_password, host=host, port='5432', sslmode='require')
        
        conn.autocommit = True
        cur = conn.cursor()

        # 3. Schema Reset (clients before users - clients has FK to users)
        tables = [
            "public.ai_feedback",
            "public.investment_valuations",
            "public.insurance_valuations",
            "public.cashflow",
            "public.client_family",
            "public.client_investments",
            "public.client_insurance",
            "public.clients",
            "public.users"
        ]
        for t in tables:
            cur.execute(f"DROP TABLE IF EXISTS {t} CASCADE;")
        
        with open(os.path.join(synth_dir, 'createTables.sql'), 'r') as f:
            cur.execute(f.read())
        print("All tables dropped and recreated.")

        # 4. Repopulate Data (users first - clients has FK to users)
        print("\n--- 3. Repopulating Data ---")
        data_files = [
            ("public.users", "users.csv"),
            ("public.clients", "clients.csv"),
            ("public.client_family", "client_family.csv"),
            ("public.client_investments", "client_investments.csv"),
            ("public.client_insurance", "client_insurance.csv"),
            ("public.cashflow", "cashflow.csv"),
            ("public.investment_valuations", "investment_valuations.csv"),
            ("public.insurance_valuations", "insurance_valuations.csv")
        ]

        for table, file_name in data_files:
            file_path = os.path.join(synth_dir, file_name)
            if not os.path.exists(file_path): 
                print(f"  - Skipping {file_name} (not found)")
                continue
    
            df = pd.read_csv(file_path)
            
            # Force string for columns that might be misinterpreted as numbers
            text_cols = ['mobile_no', 'home_no', 'office_no', 'id_no', 'fin_no', 'postal_district', 'house_block_no', 'unit_no']
            for col in text_cols:
                if col in df.columns:
                    df[col] = df[col].astype(str).replace('nan', None).replace('None', None)

            columns = ",".join(df.columns)
            
            # Use object conversion to ensure None is preserved and not turned back into NaN by Pandas
            rows = [tuple(x) for x in df.astype(object).where(pd.notnull(df), None).values]
            
            try:
                insert_query = f"INSERT INTO {table} ({columns}) VALUES %s"
                execute_values(cur, insert_query, rows)
                print(f"    Uploaded {len(rows)} rows to {table.replace('public.', '')}.")
            except Exception as e:
                print(f"    Error uploading to {table}: {e}")
                if len(rows) > 0:
                    print(f"    Sample Row: {rows[0]}")
                raise e

        cur.close()
        conn.close()
        print("\n--- Database Repopulated! ---")

    except Exception as e:
        print(f"Database Error: {e}")
        if "translate host name" in str(e):
            print("\nTIP: Use your 'Pooler' host from Supabase settings to avoid DNS issues.")

if __name__ == "__main__":
    main()
