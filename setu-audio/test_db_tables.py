import os
import httpx
import sys
from dotenv import load_dotenv

# Add setu-audio paths
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

load_dotenv()

def main():
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not url or not key:
        print("Missing Supabase credentials")
        return
        
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }
    
    try:
        response = httpx.get(f"{url}/rest/v1/", headers=headers)
        if response.status_code == 200:
            schema = response.json()
            definitions = schema.get("definitions", {})
            print("Tables found in schema:")
            for table_name in sorted(definitions.keys()):
                print(f"  - {table_name}")
        else:
            print(f"Failed to fetch schema: Code {response.status_code}, {response.text}")
    except Exception as e:
        print(f"Error querying schema: {e}")

if __name__ == "__main__":
    main()
