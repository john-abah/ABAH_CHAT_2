export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  content?: string; // Text content or Base64 data URL
  isImage?: boolean;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatMessage {
  id?: string;
  content: string;
  source: 'user' | 'chatter';
  type: 'UserMessage' | 'AssistantMessage';
  thought?: string | null;
  timestamp?: string;
  attachments?: ChatAttachment[];
  sources?: SearchSource[];
  searchQuery?: string;
}

export interface MemoryState {
  type: 'AssistantAgentState';
  version: string;
  llm_context: {
    messages: ChatMessage[];
  };
}

export type OllamaFamily =
  | 'gemma'
  | 'llama'
  | 'deepseek'
  | 'qwen'
  | 'mistral'
  | 'phi'
  | 'code'
  | 'compact'
  | 'vision'
  | 'other';

export interface OnlineOllamaModel {
  id: string; // e.g. 'llama3.2', 'deepseek-r1', 'gemma2'
  name: string;
  description: string;
  parameters: string[]; // e.g. ['2b', '9b', '27b']
  capabilities: string[]; // e.g. ['tools', 'thinking', 'vision']
  pulls: string; // e.g. '119.7M'
  tagsCount: string; // e.g. '93'
  updated: string; // e.g. '1 year ago'
  family: OllamaFamily;
  isPulled?: boolean;
}

export interface PulledOllamaModel {
  id: string; // e.g. 'gemma2:2b', 'deepseek-r1:1.5b'
  name: string;
  baseModelId?: string; // e.g. 'gemma2'
  tag?: string; // e.g. '2b'
  parameterSize?: string;
  size?: string; // e.g. '1.6 GB'
  description?: string;
  pulledAt: string;
  status: 'ready' | 'pulling' | 'failed';
  progress?: number; // 0 - 100
  statusMessage?: string;
  isLocalServerModel?: boolean;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface PullProgress {
  model: string;
  status: string;
  percent?: number;
  completed?: number;
  total?: number;
  digest?: string;
  error?: string;
  isDone?: boolean;
}

export interface OllamaModel {
  id: string; // e.g. 'gemma2:2b', 'llama3.2:3b'
  name: string; // e.g. 'Gemma 2 2B'
  family: OllamaFamily;
  parameters: string; // e.g. '2B', '3B', '8B', '70B'
  description: string;
  size?: string; // e.g. '1.6 GB'
  contextLength?: string; // e.g. '8K', '32K', '128K'
  installed?: boolean;
  recommended?: boolean;
  pullCommand?: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaStatus {
  connected: boolean;
  host: string;
  version: string | null;
  installedCount: number;
  pulledCount?: number;
  error?: string | null;
}
