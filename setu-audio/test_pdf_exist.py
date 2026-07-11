import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Add setu-audio paths
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

load_dotenv()

def main():
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not url or not key:
        print("Missing Supabase credentials")
        return
        
    supabase = create_client(url, key)
    
    print("Listing files in Supabase bucket 'generated_forms':")
    try:
        files = supabase.storage.from_("generated_forms").list()
        if not files:
            print("No files found in the bucket.")
        else:
            for idx, f in enumerate(files):
                metadata = f.get("metadata", {})
                size = metadata.get("size", "unknown") if metadata else "unknown"
                print(f"  [{idx}] Name: {f['name']} | Size: {size} bytes | Created: {f.get('created_at')}")
    except Exception as e:
        print(f"Error listing storage files: {e}")

if __name__ == "__main__":
    main()
