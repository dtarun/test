import requests
import os
from dotenv import load_dotenv

load_dotenv()

# The script will use the OPENAI_API_KEY from your .env file
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("❌ ERROR: OPENAI_API_KEY not found in environment.")
    print("Please make sure it's set in your .env file.")
    exit()

print ("API KEY found, checking models...")
url = "https://api.openai.com/v1/models"
headers = {"Authorization": f"Bearer {API_KEY}"}

response = requests.get(url, headers=headers)   

if response.status_code == 200:
    print("✅ Key is valid. Models available:")
    models = response.json()["data"]
    for m in models:
        print("-", m["id"])
else:
    error = response.json().get("error", {})
    print("❌ API call failed")
    print("Message:", error.get("message"))
    # This usually contains the project ID
    if "Project `" in error.get("message", ""):
        proj_id = error["message"].split("Project `")[1].split("`")[0]
        print("🔎 This key belongs to project:", proj_id)
