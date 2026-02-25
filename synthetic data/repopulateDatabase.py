import os
import pandas as pd
import subprocess
import sys
import psycopg2
from psycopg2.extras import execute_values
from urllib.parse import urlparse

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    config = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    config[key] = value.strip('"').strip("'")
    return config

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    synth_dir = os.path.join(base_dir, 'synthetic data')
    config = load_env()
    
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

    if not db_url and not db_password:
        print("Error: Missing VITE_SUPABASE_DATABASE_URL or VITE_SUPABASE_PASSWORD in .env.local")
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

        # 3. Schema Reset
        tables = ["public.investment_valuations", "public.insurance_valuations", "public.cashflow", "public.client_plans", "public.clients"]
        for t in tables:
            cur.execute(f"DROP TABLE IF EXISTS {t} CASCADE;")
        
        with open(os.path.join(synth_dir, 'createTables.sql'), 'r') as f:
            cur.execute(f.read())
        print("All tables dropped and recreated.")

        # 4. Repopulate Data
        print("\n--- 3. Repopulating Data ---")
        data_files = [
            ("public.clients", "clients.csv"),
            ("public.client_plans", "client_plans.csv"),
            ("public.cashflow", "cashflow.csv"),
            ("public.investment_valuations", "investment_valuations.csv"),
            ("public.insurance_valuations", "insurance_valuations.csv")
        ]

        for table, file_name in data_files:
            file_path = os.path.join(synth_dir, file_name)
            if not os.path.exists(file_path): continue
        
            df = pd.read_csv(file_path)
            
            columns = ",".join(df.columns)
            rows = [tuple(x) for x in df.where(pd.notnull(df), None).values]
            
            insert_query = f"INSERT INTO {table} ({columns}) VALUES %s"
            execute_values(cur, insert_query, rows)
            print(f"  - Uploaded {len(rows)} rows to {table.replace('public.', '')}.")

        cur.close()
        conn.close()
        print("\n--- Database Repopulated! ---")

    except Exception as e:
        print(f"Database Error: {e}")
        if "translate host name" in str(e):
            print("\nTIP: Use your 'Pooler' host from Supabase settings to avoid DNS issues.")

if __name__ == "__main__":
    main()
