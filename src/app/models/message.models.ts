export type ServerEvent =
    | { type: 'assistant.started' }
    | { type: 'assistant.token'; text: string }
    | { type: 'assistant.completed' }
    | { type: 'node.started'; node: string }
    | { type: 'node.completed'; node: string }
    | {
        type: 'progress'; node: string; step: string; processed?: number;
        total?: number; percentage?: number
    }
    | {
        type: 'detailed_progress'; node: string; step: string; substep?:
            string; file?: string; processed?: number; total?: number; percentage?:
        number
    }
    | { type: 'state_update'; values: Record<string, any> }
    | { type: 'error'; node?: string; message: string }
    | { type: string;[k: string]: any };

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    text: string;
    meta?: any;
}
export interface StartPayload {
    thread_id: string;
    user_id?: string;
    message?: string;
    attachments?: Array<{
        filename: string; mimeType: string; content?:
            string
    }>;
    chat_history?: Array<{
        filename: string; mimeType: string; content?:
            string
    }>;
}

export interface OutAttachment {
  filename: string;   // the original file name (e.g., "invoice.pdf")
  mimeType: string;   // the MIME type (e.g., "application/pdf", "image/png")
  dataBase64: string; // the file’s raw Base64 content (no data: prefix)
};

export interface ResponsePayload {
    thread_id: string;
    event: string;
    
}

export type  DeepChatResponse = {
  text?: string;
  error?: string;
  role?: 'user' | 'assistant' | 'system';
  // allow extra fields without compiler complaints
  [key: string]: any;
};

export interface  StartPayload {
  thread_id: string;
  user_id?: string;
  message?: string;
  token?: string;
  attachments?: Array<{ filename: string; mimeType: string; content?: string }>;
  chat_history?: Array<{ filename: string; mimeType: string; content?: string }>;
};

