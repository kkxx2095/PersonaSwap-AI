
import { GoogleGenAI } from "@google/genai";

export const processPersonaSwap = async (
  sourceBase64: string,
  targetBase64List: string[]
): Promise<string> => {
  // Always initialize a new client instance within the function scope to ensure the most current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct parts for the request
  const sourcePart = {
    inlineData: {
      data: sourceBase64.split(',')[1],
      mimeType: "image/png"
    }
  };

  const targetParts = targetBase64List.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1],
      mimeType: "image/png"
    }
  }));

  const prompt = `
    TASK: High-Fidelity Persona Swap.
    
    INSTRUCTION: I have provided a 'Source Image' and a set of 'Target Persona Images'. 
    Your goal is to replace the person in the 'Source Image' with the identity found in the 'Target Persona Images'.
    
    CRITICAL CONSTRAINTS:
    1. IDENTITY: The new face must clearly be the same individual as shown in the 'Target Persona Images'.
    2. EXPRESSION & EMOTION: You MUST perfectly preserve the EXACT facial expression, mouth shape, and emotional state of the person in the 'Source Image'. If the original person is crying, the swapped person must be crying with the same intensity. If they are laughing, the swapped person must be laughing. Gaze direction and head tilt must be identical.
    3. HAIR: The hairstyle, hair color, and texture must match the target persona's characteristics while fitting the head pose of the source.
    4. CLOTHING: The outfit should be updated to match the style/clothes of the target persona, but adapted to fit the pose and lighting of the source scene.
    5. PRESERVATION: The background, environment, lighting, shadows, art style, and every other detail of the 'Source Image' MUST REMAIN UNCHANGED.
    6. INTEGRATION: The resulting image must look like a real, unedited photograph.
    
    Please output the modified image only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        ...targetParts,
        sourcePart,
        { text: prompt }
      ]
    }
  });

  // Iteratively search all response parts for an image, as the model may return both text and image components
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("Failed to generate image. The model did not return an image part.");
};
