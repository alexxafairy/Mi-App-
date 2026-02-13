
import { GoogleGenAI, Type } from "@google/genai";
import { DietPlan, DiaryEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const parseDietFromText = async (text: string): Promise<DietPlan> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this doctor-prescribed diet text and organize it into a structured meal schedule with dishes and ingredients. 
    Assign a 'category' to each meal (breakfast, snack, lunch, dinner, or other).
    If some information is missing, use your expert knowledge to suggest balanced dishes that align with the provided guidelines.
    
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          schedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                dish: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { 
                  type: Type.STRING, 
                  description: "Must be one of: breakfast, snack, lunch, dinner, other" 
                },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["time", "dish", "description", "category"]
            }
          },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "schedule"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse diet JSON", e);
    throw new Error("Could not understand the diet text. Please try describing it differently.");
  }
};

export const getDiaryInsight = async (entry: DiaryEntry): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As a supportive psychological companion, analyze this diary entry (in Spanish) and provide a brief, warm, and empathetic insight. Focus on helping the user identify cognitive distortions in their automatic thoughts.
    
    Situación: ${entry.situacion}
    Emociones: ${entry.emociones}
    Pensamientos: ${entry.pensamientosAutomaticos}`,
    config: {
      systemInstruction: "You are a warm, supportive psychologist specializing in Cognitive Behavioral Therapy. Keep insights under 100 words."
    }
  });

  return response.text || "Gracias por compartir esto conmigo. Estoy aquí para escucharte.";
};
