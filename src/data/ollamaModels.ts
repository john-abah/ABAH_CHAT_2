import { OllamaModel, OnlineOllamaModel, OllamaFamily } from '../types';

export interface ModelSizeOption {
  tag: string;
  label: string;
  size: string;
  vram: string;
  recommended?: boolean;
}

export const KNOWN_MODEL_SIZES: Record<string, ModelSizeOption[]> = {
  'qwen2.5': [
    { tag: '0.5b', label: '0.5B (Edge)', size: '398 MB', vram: '1 GB' },
    { tag: '1.5b', label: '1.5B (Mobile)', size: '986 MB', vram: '2 GB' },
    { tag: '3b', label: '3B (Lightweight)', size: '2.0 GB', vram: '3.5 GB' },
    { tag: '7b', label: '7B (Standard)', size: '4.7 GB', vram: '6 GB', recommended: true },
    { tag: '8b', label: '8B (Balanced)', size: '5.1 GB', vram: '6.5 GB' },
    { tag: '12b', label: '12B (Extended)', size: '7.8 GB', vram: '10 GB' },
    { tag: '14b', label: '14B (High Precision)', size: '9.0 GB', vram: '12 GB' },
    { tag: '32b', label: '32B (Pro Workstation)', size: '20 GB', vram: '24 GB' },
    { tag: '72b', label: '72B (Full Enterprise)', size: '47 GB', vram: '64 GB' },
  ],
  'qwen2.5-coder': [
    { tag: '0.5b', label: '0.5B (Code Minimal)', size: '398 MB', vram: '1 GB' },
    { tag: '1.5b', label: '1.5B (Code Mobile)', size: '986 MB', vram: '2 GB' },
    { tag: '3b', label: '3B (Code Fast)', size: '2.0 GB', vram: '3.5 GB' },
    { tag: '7b', label: '7B (Code Balanced)', size: '4.7 GB', vram: '6 GB', recommended: true },
    { tag: '14b', label: '14B (Code Advanced)', size: '9.0 GB', vram: '12 GB' },
    { tag: '32b', label: '32B (Code Frontier)', size: '20 GB', vram: '24 GB' },
  ],
  'deepseek-r1': [
    { tag: '1.5b', label: '1.5B (Distill Qwen)', size: '1.1 GB', vram: '2 GB' },
    { tag: '7b', label: '7B (Distill Qwen)', size: '4.7 GB', vram: '6 GB' },
    { tag: '8b', label: '8B (Distill Llama)', size: '4.9 GB', vram: '6.5 GB', recommended: true },
    { tag: '14b', label: '14B (Deep Thinking)', size: '9.0 GB', vram: '12 GB' },
    { tag: '32b', label: '32B (Pro Reasoning)', size: '20 GB', vram: '24 GB' },
    { tag: '70b', label: '70B (Max Reasoning)', size: '43 GB', vram: '56 GB' },
  ],
  'gemma2': [
    { tag: '2b', label: '2B (Ultra Fast)', size: '1.6 GB', vram: '2.5 GB', recommended: true },
    { tag: '9b', label: '9B (High Quality)', size: '5.5 GB', vram: '8 GB' },
    { tag: '27b', label: '27B (Research Grade)', size: '16 GB', vram: '20 GB' },
  ],
  'llama3.2': [
    { tag: '1b', label: '1B (Ultra Compact)', size: '1.3 GB', vram: '2 GB' },
    { tag: '3b', label: '3B (Fast Assistant)', size: '2.0 GB', vram: '3.5 GB', recommended: true },
  ],
  'llama3.3': [
    { tag: '70b', label: '70B (State-of-the-Art)', size: '43 GB', vram: '56 GB', recommended: true },
  ],
  'llama3.1': [
    { tag: '8b', label: '8B (Flagship Base)', size: '4.7 GB', vram: '6 GB', recommended: true },
    { tag: '70b', label: '70B (Heavy Production)', size: '40 GB', vram: '52 GB' },
    { tag: '405b', label: '405B (Cluster Scale)', size: '229 GB', vram: '300 GB' },
  ],
  'llama3.2-vision': [
    { tag: '11b', label: '11B (Vision Base)', size: '7.9 GB', vram: '10 GB', recommended: true },
    { tag: '90b', label: '90B (Vision Flagship)', size: '55 GB', vram: '72 GB' },
  ],
  'mistral': [
    { tag: '7b', label: '7B (Classic Instructor)', size: '4.1 GB', vram: '5.5 GB', recommended: true },
  ],
  'mixtral': [
    { tag: '8x7b', label: '8x7B (MoE 46.7B)', size: '26 GB', vram: '32 GB', recommended: true },
    { tag: '8x22b', label: '8x22B (MoE 141B)', size: '79 GB', vram: '96 GB' },
  ],
  'phi4': [
    { tag: '14b', label: '14B (Microsoft Synthetic)', size: '9.1 GB', vram: '12 GB', recommended: true },
  ],
  'phi3.5': [
    { tag: '3.8b', label: '3.8B (Compact Reasoning)', size: '2.2 GB', vram: '3.5 GB', recommended: true },
  ],
  'qwq': [
    { tag: '32b', label: '32B (Qwen Reasoning)', size: '20 GB', vram: '24 GB', recommended: true },
  ],
  'smollm2': [
    { tag: '135m', label: '135M (Micro Edge)', size: '270 MB', vram: '512 MB' },
    { tag: '360m', label: '360M (Pocket)', size: '720 MB', vram: '1 GB' },
    { tag: '1.7b', label: '1.7B (Compact)', size: '1.8 GB', vram: '2.5 GB', recommended: true },
  ],
  'codellama': [
    { tag: '7b', label: '7B (Code Base)', size: '3.8 GB', vram: '5 GB', recommended: true },
    { tag: '13b', label: '13B (Code Medium)', size: '7.4 GB', vram: '9.5 GB' },
    { tag: '34b', label: '34B (Code Heavy)', size: '19 GB', vram: '24 GB' },
    { tag: '70b', label: '70B (Code Max)', size: '39 GB', vram: '50 GB' },
  ],
  'starcoder2': [
    { tag: '3b', label: '3B (Fast Autocomplete)', size: '1.7 GB', vram: '2.5 GB' },
    { tag: '7b', label: '7B (Standard Code)', size: '4.0 GB', vram: '5.5 GB', recommended: true },
    { tag: '15b', label: '15B (High Performance)', size: '9.1 GB', vram: '12 GB' },
  ],
  'llava': [
    { tag: '7b', label: '7B (Visual Chat)', size: '4.7 GB', vram: '6.5 GB', recommended: true },
    { tag: '13b', label: '13B (Detailed Vision)', size: '8.0 GB', vram: '10.5 GB' },
    { tag: '34b', label: '34B (High Res Vision)', size: '20 GB', vram: '26 GB' },
  ],
  'granite3-dense': [
    { tag: '2b', label: '2B (IBM Dense)', size: '1.5 GB', vram: '2.5 GB' },
    { tag: '8b', label: '8B (IBM Enterprise)', size: '4.9 GB', vram: '6.5 GB', recommended: true },
  ],
  'tinyllama': [
    { tag: '1.1b', label: '1.1B (Sub-2GB Lightweight)', size: '637 MB', vram: '1.5 GB', recommended: true },
  ],
  'command-r': [
    { tag: '35b', label: '35B (Cohere RAG)', size: '20 GB', vram: '24 GB', recommended: true },
  ],
};

export const OFFICIAL_OLLAMA_MODELS: OllamaModel[] = [
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    family: 'gemma',
    parameters: '2B',
    description: "Google's lightweight, ultra-fast 2B parameter model. Highly efficient companion model.",
    size: '1.6 GB',
    contextLength: '8K',
    recommended: true,
  },
  {
    id: 'deepseek-r1:8b',
    name: 'DeepSeek-R1 8B',
    family: 'deepseek',
    parameters: '8B',
    description: 'First-class open reasoning model with chain-of-thought thinking verification.',
    size: '4.9 GB',
    contextLength: '64K',
    recommended: true,
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen 2.5 7B',
    family: 'qwen',
    parameters: '7B',
    description: 'Powerful foundation model by Alibaba Cloud with exceptional reasoning and knowledge.',
    size: '4.7 GB',
    contextLength: '128K',
    recommended: true,
  },
  {
    id: 'qwen2.5:14b',
    name: 'Qwen 2.5 14B',
    family: 'qwen',
    parameters: '14B',
    description: 'Superior coding, math, and structured tool comprehension in a balanced 14B footprint.',
    size: '9.0 GB',
    contextLength: '128K',
  },
  {
    id: 'qwen2.5:3b',
    name: 'Qwen 2.5 3B',
    family: 'qwen',
    parameters: '3B',
    description: 'Compact, high-throughput model suitable for mobile and lightweight desktop setups.',
    size: '2.0 GB',
    contextLength: '32K',
  },
  {
    id: 'qwen2.5:0.5b',
    name: 'Qwen 2.5 0.5B',
    family: 'qwen',
    parameters: '0.5B',
    description: 'Ultra-small edge model (~398MB) capable of running on virtually any CPU or phone.',
    size: '398 MB',
    contextLength: '32K',
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    family: 'llama',
    parameters: '3B',
    description: "Meta's highly capable compact model optimized for edge devices and fast latency.",
    size: '2.0 GB',
    contextLength: '128K',
    recommended: true,
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 1B',
    family: 'llama',
    parameters: '1B',
    description: 'Ultra-efficient 1B model that runs smoothly even on lower-spec mobile devices.',
    size: '1.3 GB',
    contextLength: '128K',
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    family: 'llama',
    parameters: '8B',
    description: "Meta's industry-standard flagship 8B model with 128K context window.",
    size: '4.7 GB',
    contextLength: '128K',
    recommended: true,
  },
  {
    id: 'phi4:14b',
    name: 'Phi-4 14B',
    family: 'phi',
    parameters: '14B',
    description: 'State-of-the-art synthetic data reasoning model trained by Microsoft Research.',
    size: '9.1 GB',
    contextLength: '16K',
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    family: 'mistral',
    parameters: '7B',
    description: 'Classic, highly tuned instruction-following model by Mistral AI.',
    size: '4.1 GB',
    contextLength: '32K',
  },
  {
    id: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder 7B',
    family: 'code',
    parameters: '7B',
    description: 'Dedicated coding expert trained on 5.5T tokens of code across 92 languages.',
    size: '4.7 GB',
    contextLength: '128K',
  },
  {
    id: 'smollm2:1.7b',
    name: 'SmolLM2 1.7B',
    family: 'compact',
    parameters: '1.7B',
    description: 'Hugging Face compact flagship outperforming larger models in conversation.',
    size: '1.8 GB',
    contextLength: '8K',
  },
  {
    id: 'llava:7b',
    name: 'LLaVA 7B (Vision)',
    family: 'vision',
    parameters: '7B',
    description: 'Multimodal vision assistant capable of analyzing images alongside conversation.',
    size: '4.7 GB',
    contextLength: '4K',
  }
];
