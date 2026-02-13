
import { GoogleGenAI, Type } from "@google/genai";
import { DietPlan, DiaryEntry } from "../types";

// Always initialize with apiKey from process.env.API_KEY as required by guidelines
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const parseDietFromText = async (text: string): Promise<DietPlan> => {
  const ai = getAI();
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
    // Access .text property directly as it is not a method
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse diet JSON", e);
    throw new Error("Could not understand the diet text. Please try describing it differently.");
  }
};

export const getDiaryInsight = async (entry: DiaryEntry): Promise<string> => {
  const ai = getAI();
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

  // Access .text property directly as it is not a method
  return response.text || "Gracias por compartir esto conmigo. Estoy aquí para escucharte.";
};

/**
 * Stop-Motion Director workflow:
 * Step 1: Generate scene image with gemini-2.5-flash-image (Nano Banana).
 * Step 2: Generate stop-motion video with veo-3.1-fast-generate-preview (Veo).
 */
export const generateClaymationVideo = async (task: string): Promise<string> => {
  const ai = getAI();

  // Paso 1: Generar la Imagen (Nano Banana)
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{
        text: `Hand-crafted Claymation of: ${task}. Cute character, vibrant colors, visible clay fingerprints and tools marks, studio lighting, vertical 9:16 aspect ratio, centered subject.`
      }]
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16"
      }
    }
  });

  let base64Image = '';
  if (imageResponse.candidates && imageResponse.candidates[0].content.parts) {
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Image) throw new Error("Could not generate scene image.");

  // Paso 2: Generar el Video (Veo)
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `A cute stop-motion animation of ${task} in claymation style, playful and tactile movement at 12fps.`,
    image: {
      imageBytes: base64Image,
      mimeType: 'image/png'
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed.");
  
  // Append API key when fetching from the download link as required
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
