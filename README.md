# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

---

## 🔑 Setting Up Google Gemini API Key

This project uses the **official Google Gemini API** for AI-powered homework solving.

### How to Get Your Gemini API Key

1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Click **"Get API key"**
3. Create a new API key
4. Copy the key

### Setting the Environment Variable

**macOS/Linux:**
```bash
export GEMINI_API_KEY="your_key_here"
```

**Windows PowerShell:**
```powershell
setx GEMINI_API_KEY "your_key_here"
```

### Where the Model is Defined

The Gemini model is configured in the following files:

| File | Line | Variable |
|------|------|----------|
| `supabase/functions/solve-homework/index.ts` | Line 14 | `GEMINI_MODEL` |
| `supabase/functions/follow-up-chat/index.ts` | Line 14 | `GEMINI_MODEL` |
| `supabase/functions/generate-quiz/index.ts` | Line 14 | `GEMINI_MODEL` |

To change the model, edit the `GEMINI_MODEL` variable:
```typescript
// Change this to any Gemini model (e.g., "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash")
const GEMINI_MODEL = "gemini-2.0-flash";
```

---

## 🐍 Python Example Using Official Gemini SDK

Here's how to use the official Google Gemini SDK in Python:

```python
# pip install google-genai

import base64
import os
from google import genai
from google.genai import types

def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-2.0-flash"  # Change this to any Gemini model
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="INSERT_INPUT_HERE"),
            ],
        ),
    ]
    tools = [
        types.Tool(googleSearch=types.GoogleSearch()),
    ]
    generate_content_config = types.GenerateContentConfig(
        tools=tools,
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")

if __name__ == "__main__":
    generate()
```

---

## 🖼️ Using Images with Gemini

To process images with the Gemini API, use `Part.from_bytes`:

```python
from google.genai import types

# Load an image
image_part = types.Part.from_bytes(
    data=open("image.jpg", "rb").read(),
    mime_type="image/jpeg"
)

# Add to your content
contents = [
    types.Content(
        role="user",
        parts=[
            types.Part.from_text(text="Solve this math problem:"),
            image_part,
        ],
    ),
]
```

Supported image formats:
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

---

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
