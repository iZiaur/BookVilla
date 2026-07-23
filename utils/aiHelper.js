const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");
const OpenAI = require("openai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Use OpenAI SDK but point it to OpenRouter's free API
const openrouter = process.env.OPENROUTER_API_KEY 
    ? new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" }) 
    : null;

/**
 * Generates text using Gemini with a fallback to Groq, then OpenRouter (Free)
 */
async function generateText(prompt) {
    try {
        console.log("Attempting to generate text with Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
        });
        return response.text;
    } catch (geminiError) {
        console.error("Gemini failed:", geminiError.message);
        
        try {
            if (!groq) throw new Error("GROQ_API_KEY not found.");
            console.log("Falling back to Groq (llama-3.3-70b-versatile)...");
            const groqResponse = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
            });
            return groqResponse.choices[0]?.message?.content || "";
        } catch (groqError) {
            console.error("Groq also failed:", groqError.message);
            
            try {
                if (!openrouter) throw new Error("OPENROUTER_API_KEY not found.");
                console.log("Falling back to OpenRouter (Free Llama 3)...");
                const orResponse = await openrouter.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "meta-llama/llama-3-8b-instruct:free",
                });
                return orResponse.choices[0]?.message?.content || "";
            } catch (orError) {
                console.error("OpenRouter also failed:", orError.message);
                throw new Error("All three AI services (Gemini, Groq, OpenRouter) failed");
            }
        }
    }
}

/**
 * Analyzes an image with text using Gemini with a fallback to Groq Vision, then OpenRouter Vision (Free)
 */
async function analyzeImage(prompt, imageBase64, mimeType = "image/jpeg") {
    try {
        console.log("Attempting to analyze image with Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                prompt,
                { inlineData: { data: imageBase64, mimeType: mimeType } }
            ],
        });
        return response.text;
    } catch (geminiError) {
        console.error("Gemini Vision failed:", geminiError.message);
        
        try {
            if (!groq) throw new Error("GROQ_API_KEY not found.");
            console.log("Falling back to Groq Vision (llama-3.2-11b-vision-preview)...");
            const groqResponse = await groq.chat.completions.create({
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                        ],
                    },
                ],
            });
            return groqResponse.choices[0]?.message?.content || "";
        } catch (groqError) {
            console.error("Groq Vision also failed:", groqError.message);
            
            try {
                if (!openrouter) throw new Error("OPENROUTER_API_KEY not found.");
                console.log("Falling back to OpenRouter Vision (Free Llama 3.2)...");
                const orResponse = await openrouter.chat.completions.create({
                    model: "meta-llama/llama-3.2-11b-vision-instruct:free",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                            ],
                        },
                    ],
                });
                return orResponse.choices[0]?.message?.content || "";
            } catch (orError) {
                console.error("OpenRouter Vision also failed:", orError.message);
                throw new Error("All three AI Vision services failed");
            }
        }
    }
module.exports = { generateText, analyzeImage };
