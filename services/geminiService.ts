import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { Flashcard, Story, WritingResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Helper for JSON parsing ---
const cleanAndParseJSON = (text: string) => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return null;
  }
};

// --- Reading: Flashcard Generation ---
export const generateFlashcard = async (topic: string): Promise<Flashcard | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a Chinese flashcard for a child learning Chinese. 
      Topic: "${topic}". 
      Return JSON with: word (Chinese characters), pinyin, meaning (English), and a simple exampleSentence (Chinese).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            pinyin: { type: Type.STRING },
            meaning: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
          },
          required: ["word", "pinyin", "meaning", "exampleSentence"]
        }
      }
    });

    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Flashcard error:", error);
    return null;
  }
};

export const generateIllustration = async (word: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: `A cute, simple, flat vector style illustration for children representing the word: "${word}". White background, colorful, cartoon style.`,
    });
    
    // Iterate to find image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image gen error:", error);
    return null;
  }
};

// --- Listening: Story Generation ---
export const generateStory = async (): Promise<Story | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Create a very short (3 sentences), funny story in simple Chinese for a 10-year-old. Include a comprehension question.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING },
          },
          required: ["title", "content", "question", "options", "answer"]
        }
      }
    });
    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Story error:", error);
    return null;
  }
};

// --- Writing: Handwriting Recognition ---
export const checkHandwriting = async (imageBase64: string, targetWord: string): Promise<WritingResult | null> => {
  try {
    // Strip header if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Data
            }
          },
          {
            text: `This is a child's handwriting attempt of the Chinese character "${targetWord}". 
            Rate it from 1 to 10 (10 being perfect). Give brief, encouraging feedback in English. 
            Is it recognizable as "${targetWord}"?`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.NUMBER },
                feedback: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN }
            }
        }
      }
    });

    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Handwriting error:", error);
    return null;
  }
};

// --- Live API Helpers ---
export const createLiveSession = async (
  onOpen: () => void,
  onMessage: (msg: LiveServerMessage) => void,
  onClose: () => void,
  onError: (err: any) => void
) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: onOpen,
      onmessage: onMessage,
      onclose: onClose,
      onerror: onError,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: 'You are a fun, energetic Chinese language tutor for kids named "Panda Laoshi". Speak simple Chinese. Be encouraging. Ask the child simple questions about their day or favorite animals.',
    },
  });
};
