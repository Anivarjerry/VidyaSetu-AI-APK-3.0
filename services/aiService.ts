
import { GoogleGenAI, Content } from "@google/genai";
import { Role } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UserContext {
  userName: string;
  role: Role;
  className?: string;
  liveData?: string;
}

export interface AIResponse {
  messages: string[];
}

const getISTDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a response using Google Gemini API for Chat.
 */
export const getGeminiChatResponse = async (
  messages: ChatMessage[],
  language: 'en' | 'hi',
  context: UserContext
): Promise<AIResponse> => {
  try {
    const { userName, role, liveData } = context;
    const todayDate = getISTDate();

    // Comprehensive system instruction for school context & behavioral constraints
    const systemInstruction = `
    IDENTITY: You are "VidyaSetu AI", a helpful, human-like school assistant.
    USER: ${userName} (Role: ${role}).
    TODAY: ${todayDate} (IST).
    LANGUAGE: Strictly respond in ${language === 'hi' ? 'Hindi (Devanagari)' : 'English'}.

    BEHAVIOR:
    1. Respond naturally like a human assistant.
    2. Only answer questions related to "VidyaSetu AI" app, school management, study materials, or the provided live data.
    3. If asked about unrelated topics (movies, politics, etc.), decline politely: 
       - EN: "I apologize, but I am specifically designed to assist with school-related queries and education."
       - HI: "क्षमा करें, मुझे केवल स्कूल से संबंधित प्रश्नों और शिक्षा में सहायता करने के लिए प्रशिक्षित किया गया है।"
    4. Provide clear, list-wise answers for complex info.
    5. Use the LIVE DATA below to answer specific questions about Homework, Attendance, and Notices.
    
    APP STRUCTURE KNOWLEDGE:
    - Home Tab: Shows dashboard cards based on role.
    - Action Tab: Admin management (Schools, Users, Transport).
    - Features: Attendance Tracking, Daily Homework/Tasks, Live Bus Tracking, Leave Management, Broadcast Notices, and Analytics.

    LIVE SCHOOL DATA:
    ${liveData || "No data updated for current session yet."}
    `;

    // Prepare history: exclude the last message (current prompt)
    const historyMessages = messages.slice(0, -1);
    const history: Content[] = historyMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const result = await chat.sendMessage({ message: lastMessage.content });
    const fullText = result.text || "";

    // Logic to split response into multiple parts for a more dynamic "multi-message" feel
    const messageParts = fullText
      .split(/\n\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    return { 
      messages: messageParts.length > 0 ? messageParts : [language === 'hi' ? "माफ़ कीजिये, मैं समझ नहीं पाया।" : "I'm sorry, I couldn't process that."]
    };

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { 
      messages: [language === 'hi' ? "कनेक्शन एरर। कृपया पुनः प्रयास करें।" : "Connection error. Please try again."] 
    };
  }
};

/**
 * Generates a structured JSON schedule using Gemini
 */
export const generateClassSchedule = async (
    className: string,
    subjects: string[],
    teachers: { name: string, tier: string, skills: string[] }[]
): Promise<{ day: string, period: number, subject: string, teacher_name: string }[]> => {
    try {
        const prompt = `
        Create a weekly time table (Mon-Sat, 8 periods) for Class: ${className}.
        Subjects to cover: ${subjects.join(', ')}.
        Available Teachers: ${JSON.stringify(teachers)}.
        
        Rules:
        1. Assign subjects evenly across the week.
        2. Assign the best matching teacher for each subject based on their skills (primary/secondary).
        3. Prioritize 'Expert' tier teachers for difficult subjects (Maths, Science).
        4. If no exact match, assign a 'Floater' or leave blank.
        5. Return ONLY a valid JSON array of objects with keys: day (Monday-Saturday), period (1-8), subject, teacher_name.
        6. Do not include any explanation text, just the JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        console.error("AI Schedule Error", e);
        return [];
    }
};
