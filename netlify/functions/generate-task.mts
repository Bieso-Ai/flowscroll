import { Context, Request } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export default async (req: Request, context: Context) => {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    if (!ai) return new Response(JSON.stringify({ error: "Server Config Error: No API Key" }), { status: 500 });

    try {
        const body = await req.json();
        let difficulty = typeof body.difficulty === 'number' ? body.difficulty : 1;
        if (difficulty < 1) difficulty = 1;
        if (difficulty > 20) difficulty = 20;

        const type = body.type;
        let prompt = "";
        let schema: any = {};

        const topics = ["Nature", "Technology", "Space", "Daily Life", "Emotions", "Science", "History", "Art"];
        const topic = topics[Math.floor(Math.random() * topics.length)];

        if (type === 'LANG_SYNONYM') {
            prompt = `Generate a challenging English word related to "${topic}". Difficulty: ${difficulty}/20. Return JSON.`;
            schema = {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hint: { type: Type.STRING }
                },
                required: ["word", "synonyms", "hint"]
            };
        } 
        else if (type === 'LANG_RHYME') {
            prompt = `Generate a word related to "${topic}" with rhymes. Difficulty: ${difficulty}/20. Return JSON.`;
            schema = {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    rhymes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hint: { type: Type.STRING }
                },
                required: ["word", "rhymes", "hint"]
            };
        } 
        else if (type === 'LANG_SENTENCE') {
            prompt = `Generate 2 words to form a sentence. Topic: ${topic}. Difficulty: ${difficulty}/20. Return JSON.`;
            schema = {
                type: Type.OBJECT,
                properties: {
                    word1: { type: Type.STRING },
                    word2: { type: Type.STRING },
                    exampleSentence: { type: Type.STRING }
                },
                required: ["word1", "word2", "exampleSentence"]
            };
        } else {
            return new Response("Invalid Task Type", { status: 400 });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 1.2,
                maxOutputTokens: 300
            }
        });

        return new Response(response.text, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("AI Error:", error);
        return new Response(JSON.stringify({ error: "AI Generation Failed" }), { status: 500 });
    }
};
