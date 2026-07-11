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
        print("Missing Supabase URL or Key in environment")
        return
        
    supabase = create_client(url, key)
    
    print("--- LATEST WORKFLOW INSTANCES ---")
    res_inst = supabase.table("workflow_instances").select("*").order("created_at", desc=True).limit(5).execute()
    for r in res_inst.data:
        print(f"ID: {r['id']}, Scheme: {r['scheme_id']}, Stage: {r['current_stage']}, Status: {r['status']}, Created: {r['created_at']}")
        
    print("\n--- LATEST CONVERSATION LOGS ---")
    res_logs = supabase.table("conversation_log").select("*").order("created_at", desc=True).limit(15).execute()
    # Print in chronological order (reverse the list)
    for r in reversed(res_logs.data):
        print(f"[{r['created_at']}] {r['role'].upper()}: '{r['text']}'")

if __name__ == "__main__":
    main()
