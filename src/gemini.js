const systemInstruction = `You are a parser for a vehicle log application. Analyze the user's natural language input and extract structured log data.
We support five types of records: "fuel", "trips", "service", "expenses", and "schedule".
Classify the input into one of these types and return a JSON object with the following schema:
{
  "type": "fuel" | "trips" | "service" | "expenses" | "schedule",
  "data": { ... }
}

JSON schemas for "data" based on "type":
1. "fuel":
   - "amount": number or null (numeric value only)
   - "pricePerLiter": number or null (numeric value only)
   - "fuelCity": string or null
   - "note": string or null
2. "trips":
   - "distance": number or null (numeric value only)
   - "destination": string or null
   - "category": "Work" | "Family" | "Business" | "Personal" (default to "Work")
   - "note": string or null
3. "service":
   - "serviceType": string (e.g. "Oil Change", "Insurance", "Tire rotation")
   - "cost": number or null (numeric value only)
   - "note": string or null
4. "expenses":
   - "category": "Parking" | "Toll" | "Accessories" | "Miscellaneous" (default to "Miscellaneous")
   - "amount": number or null (numeric value only)
   - "note": string or null
5. "schedule":
   - "name": string (e.g. "Office commute", "Gym trip")
   - "destination": string or null
   - "distance": number or null (numeric value only)
   - "repeat": "Daily" | "Weekly" | "Monthly" | "Yearly" (default to "Daily")
   - "completionTime": string (HH:MM format, e.g., "18:00", default to "18:00")
   - "startDate": string (YYYY-MM-DD format, default to today's date)
   - "weekdays": string (comma-separated list of Mon, Tue, Wed, Thu, Fri, Sat, Sun. e.g. "Mon,Tue,Wed,Thu,Fri")
   - "notes": string or null

Provide only the raw JSON. Do not include markdown code block formatting. Just the pure JSON string.
Today's date is: ${new Date().toISOString().slice(0, 10)}.`;

export async function parseInputWithAI(inputString) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured in .env. Please configure VITE_GEMINI_API_KEY.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemInstruction}\n\nUser Input: "${inputString}"`
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }
  
  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text from Gemini API.");
  }
  
  return JSON.parse(text.trim());
}
