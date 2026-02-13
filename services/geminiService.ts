
import { GoogleGenAI, Type } from "@google/genai";
import { DietPlan, DiaryEntry } from "../types";

// Always initialize with apiKey from process.env.API_KEY as required by guidelines
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const MEAL_KEYWORDS = ['desayuno', 'comida', 'cena', 'colación', 'colacion', 'snack', 'almuerzo'];

const mapMealCategory = (label: string): 'breakfast' | 'snack' | 'lunch' | 'dinner' | 'other' => {
  const v = label.toLowerCase();
  if (v.includes('desayuno')) return 'breakfast';
  if (v.includes('colación') || v.includes('colacion') || v.includes('snack')) return 'snack';
  if (v.includes('comida') || v.includes('almuerzo')) return 'lunch';
  if (v.includes('cena')) return 'dinner';
  return 'other';
};

/**
 * Parser determinista local para formatos estructurados en texto plano.
 * Útil para dietas con formato "DÍA X / SEMANA Y / Comida: ..."
 */
const parseDietStructuredText = (text: string): DietPlan | null => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const schedule: DietPlan['schedule'] = [];
  let currentDay = '';
  let currentMealLabel = '';
  let currentMealLines: string[] = [];

  const flushMeal = () => {
    if (!currentMealLabel || currentMealLines.length === 0) return;
    const description = currentMealLines.join(' ').replace(/\s+/g, ' ').trim();
    const firstIngredient = currentMealLines[0] || description;
    const ingredients = description
      .split(/[,+]/)
      .map(s => s.trim())
      .filter(Boolean);

    const dayPrefix = currentDay ? `${currentDay} · ` : '';
    schedule.push({
      time: `${dayPrefix}${currentMealLabel}`,
      dish: firstIngredient,
      description,
      category: mapMealCategory(currentMealLabel),
      ingredients: ingredients.length > 0 ? ingredients : [description],
      completed: false,
    });

    currentMealLabel = '';
    currentMealLines = [];
  };

  for (const line of lines) {
    // Detectar DÍA
    const dayMatch = line.match(/D[IÍ]A\s*\d+/i);
    if (dayMatch) {
      flushMeal();
      currentDay = dayMatch[0].toUpperCase();
      continue;
    }

    // Detectar Comida (keywords)
    const maybeMeal = line.replace(':', '').trim().toLowerCase();
    if (MEAL_KEYWORDS.some(k => maybeMeal === k || maybeMeal.startsWith(`${k} `))) {
      flushMeal();
      currentMealLabel = line.replace(':', '').trim();
      continue;
    }

    // Ignorar líneas de cabecera tipo SEMANA o separadores visuales
    if (line.match(/^⚡|^🔥|^SEMANA/i)) {
      flushMeal();
      continue;
    }

    // Si tenemos una comida activa, acumular contenido
    if (currentMealLabel) {
      currentMealLines.push(line);
    }
  }

  flushMeal();

  if (schedule.length === 0) return null;

  return {
    name: 'Plan nutricional personalizado',
    schedule,
    recommendations: [
      'Mantén buena hidratación durante el día.',
      'Ajusta porciones con tu especialista según evolución.',
    ],
  };
};

export const parseDietFromText = async (text: string): Promise<DietPlan> => {
  // Intentar primero parseo manual si el formato es muy estándar
  const parsedManual = parseDietStructuredText(text);
  if (parsedManual && parsedManual.schedule.length > 5) return parsedManual;

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
    const parsed = JSON.parse(response.text || '{}');
    return {
      name: parsed?.name || 'Plan nutricional generado',
      schedule: Array.isArray(parsed?.schedule)
        ? parsed.schedule.map((meal: any) => ({
            time: meal?.time || 'Sin horario',
            dish: meal?.dish || 'Comida sugerida',
            description: meal?.description || meal?.dish || 'Sin descripción',
            category: meal?.category || 'other',
            ingredients: Array.isArray(meal?.ingredients) && meal.ingredients.length > 0
              ? meal.ingredients
              : [meal?.dish || 'Ingrediente no especificado'],
            completed: false
          }))
        : [],
      recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
    };
  } catch (e) {
    console.error("Failed to parse diet JSON", e);
    throw new Error("No pudimos procesar el texto de la dieta. Por favor, intenta pegarla con un formato más claro (ej: Desayuno: ...)");
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

  return response.text || "Gracias por compartir esto conmigo. Estoy aquí para escucharte.";
};

/**
 * Stop-Motion Director workflow
 */
export const generateClaymationVideo = async (task: string): Promise<string> => {
  const ai = getAI();

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
  
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
