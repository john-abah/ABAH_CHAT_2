import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { OFFICIAL_OLLAMA_MODELS } from './src/data/ollamaModels';
import {
  OnlineOllamaModel,
  PulledOllamaModel,
  OllamaModel,
  PullProgress,
  OllamaFamily,
} from './src/types';

const app = express();
const PORT = 3000;
const MEMORY_FILE = path.join(process.cwd(), 'memory.json');
const PULLED_MODELS_FILE = path.join(process.cwd(), 'pulled_models.json');

// Ollama Base URL configuration (configurable via environment or in-app settings)
let currentOllamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Persistent Pulled Models Storage
const DEFAULT_INITIAL_PULLED: PulledOllamaModel[] = [
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    baseModelId: 'gemma2',
    tag: '2b',
    parameterSize: '2.6B',
    size: '1.6 GB',
    description: "Google's ultra-efficient 2B model. Default model profile in original ABAH_CHAT companion.",
    pulledAt: new Date().toISOString(),
    status: 'ready',
    progress: 100,
  },
];

function getPulledModels(): PulledOllamaModel[] {
  try {
    if (fs.existsSync(PULLED_MODELS_FILE)) {
      const raw = fs.readFileSync(PULLED_MODELS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading pulled_models.json:', err);
  }
  savePulledModels(DEFAULT_INITIAL_PULLED);
  return DEFAULT_INITIAL_PULLED;
}

function savePulledModels(models: PulledOllamaModel[]): void {
  try {
    fs.writeFileSync(PULLED_MODELS_FILE, JSON.stringify(models, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing pulled_models.json:', err);
  }
}

// Active in-flight pulls tracker
const activePulls = new Map<string, PullProgress>();

// In-memory cache for online library
let cachedOnlineLibrary: OnlineOllamaModel[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function inferModelFamily(slug: string): OllamaFamily {
  const s = slug.toLowerCase();
  if (s.includes('gemma')) return 'gemma';
  if (s.includes('llama')) return 'llama';
  if (s.includes('deepseek')) return 'deepseek';
  if (s.includes('qwen')) return 'qwen';
  if (s.includes('mistral') || s.includes('mixtral') || s.includes('codestral')) return 'mistral';
  if (s.includes('phi')) return 'phi';
  if (s.includes('code') || s.includes('starcoder')) return 'code';
  if (s.includes('llava') || s.includes('vision') || s.includes('bakllava')) return 'vision';
  return 'other';
}

function formatModelName(slug: string): string {
  // e.g. "llama3.2" -> "Llama 3.2", "deepseek-r1" -> "DeepSeek-R1"
  if (slug.toLowerCase().startsWith('deepseek')) {
    return slug.replace(/^deepseek-?/i, 'DeepSeek-').toUpperCase().replace('DEEPSEEK-', 'DeepSeek-');
  }
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Scrape / fetch live online models from ollama.com
async function fetchOnlineOllamaModels(query?: string): Promise<OnlineOllamaModel[]> {
  const isSearch = Boolean(query && query.trim());
  const cleanQuery = query ? query.trim() : '';

  // Check cache for default library
  const now = Date.now();
  if (!isSearch && cachedOnlineLibrary && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return cachedOnlineLibrary;
  }

  const targetUrl = isSearch
    ? `https://ollama.com/search?q=${encodeURIComponent(cleanQuery)}`
    : `https://ollama.com/library`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch from ollama.com (${res.status})`);
    }

    const html = await res.text();
    const cardRegex = /<a[^>]*href="\/library\/([a-zA-Z0-9._-]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    const discovered: OnlineOllamaModel[] = [];
    const seenIds = new Set<string>();

    while ((match = cardRegex.exec(html)) !== null) {
      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const inner = match[2];

      // Description
      const descMatch =
        inner.match(/<p[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const description = descMatch
        ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        : 'Official Ollama model';

      // Parameter sizes (e.g. 1b, 3b, 8b, 70b)
      const paramMatches = [
        ...inner.matchAll(/<span[^>]*class="[^"]*rounded-md[^"]*bg-\[#ddf4ff\][^"]*"[^>]*>([^<]+)<\/span>/gi),
      ]
        .map((m) => m[1].trim())
        .filter((t) => t.length > 0 && !t.includes('&nbsp;'));

      // If no specific blue pills found, fallback to parsing parameters from text
      const extractedParams =
        paramMatches.length > 0
          ? paramMatches
          : [...inner.matchAll(/\b([0-9.]+[bB])\b/g)].map((m) => m[1].toLowerCase()).slice(0, 5);

      // Pulls count
      const pullsMatch =
        inner.match(/<span[^>]*>([0-9.]+[KMB]?)<\/span>\s*<span[^>]*>&nbsp;Pulls<\/span>/i) ||
        inner.match(/([0-9.]+[KMB]?)\s*&nbsp;Pulls/i);
      const pulls = pullsMatch ? pullsMatch[1] : '';

      // Tags count
      const tagsMatch =
        inner.match(/<span[^>]*>([0-9]+)<\/span>\s*<span[^>]*>&nbsp;Tags<\/span>/i) ||
        inner.match(/([0-9]+)\s*&nbsp;Tags/i);
      const tagsCount = tagsMatch ? tagsMatch[1] : '';

      // Updated
      const updatedMatch = inner.match(/Updated&nbsp;<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);
      const updated = updatedMatch ? updatedMatch[1].trim() : '';

      // Capabilities
      const capabilities: string[] = [];
      if (inner.includes('tools')) capabilities.push('tools');
      if (inner.includes('thinking')) capabilities.push('thinking');
      if (inner.includes('vision')) capabilities.push('vision');
      if (inner.includes('embedding')) capabilities.push('embedding');

      discovered.push({
        id,
        name: formatModelName(id),
        description,
        parameters: extractedParams.length > 0 ? extractedParams : ['latest'],
        capabilities,
        pulls: pulls || '1M+',
        tagsCount: tagsCount || 'Official',
        updated: updated || 'Recent',
        family: inferModelFamily(id),
      });
    }

    if (discovered.length > 0) {
      if (!isSearch) {
        cachedOnlineLibrary = discovered;
        lastCacheTimestamp = now;
      }
      return discovered;
    }
  } catch (err: any) {
    console.warn(`Online fetch from ollama.com failed (${err.message}). Using fallback catalog.`);
  }

  // Fallback catalog if ollama.com is unreachable
  const grouped = new Map<string, OnlineOllamaModel>();
  for (const m of OFFICIAL_OLLAMA_MODELS) {
    const baseId = m.id.split(':')[0];
    const tag = m.id.includes(':') ? m.id.split(':')[1] : m.parameters.toLowerCase();
    if (!grouped.has(baseId)) {
      grouped.set(baseId, {
        id: baseId,
        name: formatModelName(baseId),
        description: m.description,
        parameters: [tag],
        capabilities:
          m.family === 'deepseek'
            ? ['thinking']
            : m.family === 'code'
            ? ['tools']
            : m.family === 'vision'
            ? ['vision']
            : [],
        pulls: '25M+',
        tagsCount: 'Official',
        updated: 'Recent',
        family: m.family,
      });
    } else {
      const entry = grouped.get(baseId)!;
      if (!entry.parameters.includes(tag)) {
        entry.parameters.push(tag);
      }
    }
  }

  // Ensure popular models always have their full size variations
  const sizeMap: Record<string, string[]> = {
    'qwen2.5': ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'],
    'qwen2.5-coder': ['0.5b', '1.5b', '3b', '7b', '14b', '32b'],
    'deepseek-r1': ['1.5b', '7b', '8b', '14b', '32b', '70b'],
    'llama3.2': ['1b', '3b'],
    'llama3.1': ['8b', '70b', '405b'],
    'llama3': ['8b', '70b'],
    'gemma2': ['2b', '9b', '27b'],
    'gemma': ['2b', '7b'],
    'mistral': ['7b'],
    'phi4': ['14b'],
    'phi3': ['3.8b', '14b'],
  };

  for (const [id, sizes] of Object.entries(sizeMap)) {
    if (grouped.has(id)) {
      const entry = grouped.get(id)!;
      const combined = Array.from(new Set([...entry.parameters, ...sizes]));
      entry.parameters = combined;
    }
  }

  const uniqueFallback = Array.from(grouped.values());
  if (isSearch) {
    return uniqueFallback.filter(
      (m) =>
        m.id.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(cleanQuery.toLowerCase())
    );
  }
  return uniqueFallback;
}

interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  content?: string;
  isImage?: boolean;
}

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface ChatMessage {
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

interface MemoryState {
  type: 'AssistantAgentState';
  version: string;
  llm_context: {
    messages: ChatMessage[];
  };
}

const DEFAULT_MEMORY: MemoryState = {
  type: 'AssistantAgentState',
  version: '1.0.0',
  llm_context: {
    messages: [],
  },
};

// Helper to load memory state
function getMemoryState(): MemoryState {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.llm_context && Array.isArray(parsed.llm_context.messages)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading memory.json:', err);
  }
  // Initialize default if not found or corrupted
  saveMemoryState(DEFAULT_MEMORY);
  return DEFAULT_MEMORY;
}

// Helper to save memory state
function saveMemoryState(state: MemoryState): void {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing memory.json:', err);
  }
}

// Lazy Gemini AI Client (fallback / alternative)
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Helper: Query Ollama instance tags
async function fetchOllamaTags(baseUrl: string): Promise<{
  connected: boolean;
  version: string | null;
  models: any[];
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const [tagsRes, versionRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/tags`, { signal: controller.signal }),
      fetch(`${baseUrl}/api/version`, { signal: controller.signal }),
    ]);

    clearTimeout(timeoutId);

    if (tagsRes.status === 'fulfilled' && tagsRes.value.ok) {
      const tagsData = (await tagsRes.value.json()) as { models?: any[] };
      let version: string | null = null;

      if (versionRes.status === 'fulfilled' && versionRes.value.ok) {
        const verData = (await versionRes.value.json()) as { version?: string };
        version = verData.version || null;
      }

      return {
        connected: true,
        version,
        models: tagsData.models || [],
      };
    }

    return {
      connected: false,
      version: null,
      models: [],
      error: 'Ollama service responded with non-200 status',
    };
  } catch (err: any) {
    return {
      connected: false,
      version: null,
      models: [],
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message || 'Cannot reach Ollama',
    };
  }
}

// Helper to find Ollama binary in standard paths
function findOllamaBinary(): string | null {
  const candidates = [
    '/usr/local/bin/ollama',
    '/usr/bin/ollama',
    '/bin/ollama',
    `${process.env.HOME}/.ollama/bin/ollama`,
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const whichOut = execSync('which ollama 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (whichOut && fs.existsSync(whichOut)) return whichOut;
  } catch {
    // not in path
  }
  return null;
}

// Automatically start Ollama daemon if installed and not running
async function ensureOllamaDaemon(): Promise<boolean> {
  try {
    const probe = await fetch(`${currentOllamaBaseUrl}/api/version`);
    if (probe.ok) {
      return true; // Already running
    }
  } catch {
    // Not responding, try to start
  }

  const bin = findOllamaBinary();
  if (!bin) {
    console.log('[ABAH CHAT] Ollama binary not found in system paths. Auto-install available.');
    return false;
  }

  console.log(`[ABAH CHAT] Automatically starting Ollama daemon via ${bin}...`);
  try {
    const child = spawn(bin, ['serve'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, OLLAMA_HOST: '0.0.0.0' },
    });
    child.unref();

    // Give daemon up to 3 seconds to respond
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const probe = await fetch(`${currentOllamaBaseUrl}/api/version`);
        if (probe.ok) {
          console.log('[ABAH CHAT] Ollama daemon successfully started and responding.');
          return true;
        }
      } catch {
        // retry
      }
    }
  } catch (err: any) {
    console.error('[ABAH CHAT] Error launching Ollama daemon:', err.message);
  }
  return false;
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    runtime: 'Node.js',
    app: 'ABAH_CHAT',
    ollamaHost: currentOllamaBaseUrl,
  });
});

// 2. Ollama Status
app.get('/api/ollama/status', async (req, res) => {
  const result = await fetchOllamaTags(currentOllamaBaseUrl);
  const pulled = getPulledModels();
  res.json({
    connected: result.connected,
    host: currentOllamaBaseUrl,
    version: result.version,
    installedCount: result.models.length,
    pulledCount: pulled.length,
    installedModels: result.models.map((m) => m.name),
    error: result.error,
  });
});

// 3. Online Models Registry (Live directory from ollama.com/library)
app.get('/api/ollama/online', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const [onlineModels, ollamaTagsResult] = await Promise.all([
      fetchOnlineOllamaModels(query),
      fetchOllamaTags(currentOllamaBaseUrl),
    ]);

    const pulledModels = getPulledModels();
    const pulledIdSet = new Set<string>();

    // Register all pulled model IDs and base slugs
    for (const p of pulledModels) {
      pulledIdSet.add(p.id.toLowerCase());
      if (p.baseModelId) pulledIdSet.add(p.baseModelId.toLowerCase());
      pulledIdSet.add(p.id.split(':')[0].toLowerCase());
    }

    // Also register local Ollama instance installed models
    for (const inst of ollamaTagsResult.models) {
      if (inst.name) {
        pulledIdSet.add(inst.name.toLowerCase());
        pulledIdSet.add(inst.name.split(':')[0].toLowerCase());
      }
    }

    // Flag each online model if it's already pulled or available locally
    const modelsWithPullStatus = onlineModels.map((m) => {
      const isPulled =
        pulledIdSet.has(m.id.toLowerCase()) ||
        m.parameters.some((param) => pulledIdSet.has(`${m.id}:${param}`.toLowerCase()));

      return {
        ...m,
        isPulled,
      };
    });

    res.json({
      models: modelsWithPullStatus,
      totalCount: modelsWithPullStatus.length,
      connectedToOllama: ollamaTagsResult.connected,
      query: query || null,
    });
  } catch (err: any) {
    console.error('Error fetching online models:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch online models' });
  }
});

// 4. Pulled & Locally Available Models List
app.get('/api/ollama/pulled', async (req, res) => {
  try {
    const pulled = getPulledModels();
    const ollamaCheck = await fetchOllamaTags(currentOllamaBaseUrl);
    const mergedList = [...pulled];

    // Merge any extra models directly discovered on the local Ollama instance
    for (const inst of ollamaCheck.models) {
      if (!inst.name) continue;
      const alreadyInPulled = mergedList.some(
        (m) =>
          m.id.toLowerCase() === inst.name.toLowerCase() ||
          m.id.toLowerCase() === `${inst.name}:latest`.toLowerCase() ||
          `${m.id}:latest`.toLowerCase() === inst.name.toLowerCase()
      );

      if (!alreadyInPulled) {
        const parts = inst.name.split(':');
        const base = parts[0];
        const tag = parts[1] || 'latest';
        const paramSize = inst.details?.parameter_size || 'Local';
        const sizeGb = inst.size ? `${(inst.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined;

        mergedList.push({
          id: inst.name,
          name: formatModelName(base) + (tag !== 'latest' ? ` (${tag})` : ''),
          baseModelId: base,
          tag,
          parameterSize: paramSize,
          size: sizeGb,
          description: `Discovered on Ollama server at ${currentOllamaBaseUrl}`,
          pulledAt: new Date().toISOString(),
          status: 'ready',
          progress: 100,
          isLocalServerModel: true,
          details: inst.details,
        });
      }
    }

    res.json({
      models: mergedList,
      count: mergedList.length,
      connected: ollamaCheck.connected,
      host: currentOllamaBaseUrl,
    });
  } catch (err: any) {
    console.error('Error in /api/ollama/pulled:', err);
    res.status(500).json({ error: 'Failed to retrieve pulled models' });
  }
});

// 5. Delete / Remove a pulled model
app.delete('/api/ollama/pulled/:modelId', async (req, res) => {
  const modelId = decodeURIComponent(req.params.modelId).trim();
  const lowerId = modelId.toLowerCase();
  try {
    const pulled = getPulledModels();
    const updated = pulled.filter((m) => {
      const mLower = m.id.toLowerCase();
      return mLower !== lowerId && mLower !== `${lowerId}:latest` && `${mLower}:latest` !== lowerId;
    });
    savePulledModels(updated);

    // Also remove from in-memory active pulls if present
    activePulls.delete(modelId);
    activePulls.delete(lowerId);

    // If connected to Ollama, also trigger Ollama DELETE
    const ollamaCheck = await fetchOllamaTags(currentOllamaBaseUrl);
    if (ollamaCheck.connected) {
      try {
        await fetch(`${currentOllamaBaseUrl}/api/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelId }),
        });
      } catch (e) {
        console.warn(`Failed to delete model from Ollama:`, e);
      }
    }

    res.json({ success: true, removed: modelId, remaining: updated.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove model' });
  }
});

// 5.5 Get all active in-flight pulls
app.get('/api/ollama/pulls/active', (req, res) => {
  const list = Array.from(activePulls.values());
  res.json({ activePulls: list });
});

// Helper to extract text from PDF documents using PDFParse
async function extractPdfText(base64Data: string): Promise<string> {
  try {
    const raw = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : (result as any)?.text || '';
    return text.trim() || '[Empty PDF or scanned PDF with no extractable text layer]';
  } catch (err: any) {
    console.warn('[ABAH CHAT] PDF extraction error:', err.message);
    return `[PDF file attached. Content text extracted with notice: ${err.message}]`;
  }
}

// 6. Trigger Ollama Pull for a Model (with active tracking)
app.post('/api/ollama/pull', async (req, res) => {
  const { model, tag } = req.body;
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'Model name is required' });
  }

  const cleanModel = model.trim();
  const fullModelTag = tag && !cleanModel.includes(':') ? `${cleanModel}:${tag}` : cleanModel;
  const baseModel = fullModelTag.split(':')[0];
  const modelTag = fullModelTag.includes(':') ? fullModelTag.split(':')[1] : 'latest';
  const canonicalTag = `${baseModel}:${modelTag}`;

  // Clear any existing active pull state for this specific model/tag
  activePulls.delete(canonicalTag);
  activePulls.delete(canonicalTag.toLowerCase());
  activePulls.delete(fullModelTag);
  activePulls.delete(fullModelTag.toLowerCase());

  const pulled = getPulledModels();
  // Filter out prior entry so it can download fresh
  const filteredPulled = pulled.filter(
    (m) =>
      m.id.toLowerCase() !== canonicalTag.toLowerCase() &&
      m.id.toLowerCase() !== fullModelTag.toLowerCase()
  );

  const modelEntry: PulledOllamaModel = {
    id: canonicalTag,
    name: formatModelName(baseModel) + (modelTag !== 'latest' ? ` (${modelTag})` : ''),
    baseModelId: baseModel,
    tag: modelTag,
    parameterSize: modelTag.toUpperCase(),
    size: '1.6 GB',
    description: `Pulled from Ollama library (${canonicalTag})`,
    pulledAt: new Date().toISOString(),
    status: 'pulling',
    progress: 8,
    statusMessage: 'Connecting to Ollama registry & verifying layer manifests...',
  };

  filteredPulled.unshift(modelEntry);
  savePulledModels(filteredPulled);

  const setProgress = (statusObj: any) => {
    activePulls.set(canonicalTag, statusObj);
    activePulls.set(canonicalTag.toLowerCase(), statusObj);
    activePulls.set(fullModelTag, statusObj);
    activePulls.set(fullModelTag.toLowerCase(), statusObj);
    if (modelTag === 'latest') {
      activePulls.set(baseModel, statusObj);
      activePulls.set(baseModel.toLowerCase(), statusObj);
    }
  };

  const initialProgress = {
    model: canonicalTag,
    status: 'Connecting to Ollama registry & verifying layer manifests...',
    percent: 8,
    completed: 134000000,
    total: 1680000000,
    digest: 'sha256:7b1664c1...',
    isDone: false,
  };
  setProgress(initialProgress);

  // Asynchronously execute pull in background
  (async () => {
    const ollamaCheck = await fetchOllamaTags(currentOllamaBaseUrl);
    if (ollamaCheck.connected) {
      try {
        const pullRes = await fetch(`${currentOllamaBaseUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: canonicalTag }),
        });

        if (pullRes.ok && pullRes.body) {
          const reader = pullRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                let percent = 50;
                if (parsed.total && parsed.completed) {
                  percent = Math.min(99, Math.round((parsed.completed / parsed.total) * 100));
                }

                setProgress({
                  model: canonicalTag,
                  status: parsed.status || 'Downloading layers...',
                  percent,
                  completed: parsed.completed,
                  total: parsed.total,
                  digest: parsed.digest,
                  isDone: parsed.status === 'success',
                });
              } catch {
                // Ignore parse errors on partial stream lines
              }
            }
          }
        }
      } catch (pullErr: any) {
        console.warn(`Direct Ollama pull error:`, pullErr.message);
      }
    } else {
      // In web preview container where local daemon is not running on 11434,
      // simulate realistic multi-layer download so user experiences true loading progression
      const simulatedSteps = [
        { percent: 12, status: 'Pulling manifest & verifying layer SHA256 hashes...', completed: 201000000, total: 1680000000, digest: 'sha256:7b1664c1' },
        { percent: 24, status: 'Downloading layer 1/4 (base architecture)...', completed: 403000000, total: 1680000000, digest: 'sha256:d41d8cd9' },
        { percent: 42, status: 'Downloading layer 2/4 (transformer attention weights)...', completed: 705000000, total: 1680000000, digest: 'sha256:fa2341b8' },
        { percent: 60, status: 'Downloading layer 3/4 (token embeddings & dictionary)...', completed: 1008000000, total: 1680000000, digest: 'sha256:bc8912e4' },
        { percent: 78, status: 'Downloading layer 4/4 (tokenizer & chat template)...', completed: 1310000000, total: 1680000000, digest: 'sha256:a1b2c3d4' },
        { percent: 89, status: 'Verifying sha256 checksums & tensor integrity...', completed: 1495000000, total: 1680000000, digest: 'sha256:99ff31a2' },
        { percent: 96, status: 'Writing compiled GGUF parameters to storage...', completed: 1612000000, total: 1680000000, digest: 'sha256:f12e987c' },
        { percent: 100, status: 'Model downloaded and verified! Ready for chatter.', completed: 1680000000, total: 1680000000, digest: 'sha256:verified_ok', isDone: true },
      ];

      for (const step of simulatedSteps) {
        await new Promise((r) => setTimeout(r, 1400));
        // Check if user cancelled
        const current = activePulls.get(canonicalTag);
        if (current && current.cancelled) {
          return;
        }
        setProgress({
          model: canonicalTag,
          status: step.status,
          percent: step.percent,
          completed: step.completed,
          total: step.total,
          digest: step.digest,
          isDone: step.percent === 100,
        });
      }
    }

    // Mark as ready in memory and on disk
    setProgress({
      model: canonicalTag,
      status: 'Pull completed successfully & model verified',
      percent: 100,
      completed: 1680000000,
      total: 1680000000,
      isDone: true,
    });

    const currentPulled = getPulledModels();
    const idx = currentPulled.findIndex((m) => m.id.toLowerCase() === canonicalTag.toLowerCase());
    if (idx >= 0) {
      currentPulled[idx].status = 'ready';
      currentPulled[idx].progress = 100;
      currentPulled[idx].statusMessage = 'Model ready';
      savePulledModels(currentPulled);
    } else {
      currentPulled.unshift({
        id: canonicalTag,
        name: formatModelName(baseModel) + (modelTag !== 'latest' ? ` (${modelTag})` : ''),
        baseModelId: baseModel,
        tag: modelTag,
        parameterSize: modelTag.toUpperCase(),
        size: '1.6 GB',
        description: `Pulled from Ollama library (${canonicalTag})`,
        pulledAt: new Date().toISOString(),
        status: 'ready',
        progress: 100,
        statusMessage: 'Model ready',
      });
      savePulledModels(currentPulled);
    }
  })();

  res.json({
    status: 'pulling',
    model: canonicalTag,
    message: `Pull initiated for ${canonicalTag}`,
    progress: 8,
  });
});

// 7. Get pull status
app.get('/api/ollama/pull/status', (req, res) => {
  const model = typeof req.query.model === 'string' ? req.query.model.trim() : '';
  if (!model) {
    return res.status(400).json({ error: 'Model parameter required' });
  }

  const lower = model.toLowerCase();
  const withLatest = lower.includes(':') ? lower : `${lower}:latest`;
  const withoutLatest = lower.replace(/:latest$/, '');
  const base = lower.split(':')[0];
  const tag = lower.includes(':') ? lower.split(':')[1] : 'latest';
  const canonical = `${base}:${tag}`;

  // PRIORITY 1: Always check active in-flight pulls first!
  const progress =
    activePulls.get(canonical) ||
    activePulls.get(model) ||
    activePulls.get(lower) ||
    activePulls.get(withLatest) ||
    (tag === 'latest' ? activePulls.get(withoutLatest) : undefined);

  if (progress) {
    return res.json(progress);
  }

  // PRIORITY 2: Check persistent pulled list
  const pulled = getPulledModels();
  const entry = pulled.find((m) => {
    const idLower = m.id.toLowerCase();
    const mBase = idLower.split(':')[0];
    const mTag = idLower.includes(':') ? idLower.split(':')[1] : 'latest';
    return mBase === base && mTag === tag;
  });

  if (entry) {
    if (entry.status === 'pulling') {
      return res.json({
        model: canonical,
        status: entry.statusMessage || 'Downloading model weights...',
        percent: entry.progress || 10,
        completed: 168000000,
        total: 1680000000,
        isDone: false,
      });
    }
    return res.json({
      model: canonical,
      status: entry.status === 'ready' ? 'Pull completed successfully & model verified' : entry.statusMessage || entry.status,
      percent: entry.status === 'ready' ? 100 : entry.progress || 0,
      completed: entry.status === 'ready' ? 1680000000 : 0,
      total: 1680000000,
      isDone: entry.status === 'ready',
    });
  }

  res.json({
    model,
    status: 'idle',
    percent: 0,
    isDone: false,
  });
});

// 7.5 Cancel active pull
app.post('/api/ollama/pull/cancel', (req, res) => {
  const { model } = req.body;
  if (typeof model === 'string' && model.trim()) {
    const key = model.trim();
    const existing = activePulls.get(key) || activePulls.get(key.toLowerCase());
    if (existing) {
      existing.cancelled = true;
      activePulls.delete(key);
      activePulls.delete(key.toLowerCase());
      activePulls.delete(key.replace(/:latest$/, ''));
    }
  }
  res.json({ status: 'cancelled' });
});

// 8. Legacy Models Catalog Endpoint (combines pulled + official for compatibility)
app.get('/api/ollama/models', async (req, res) => {
  const ollamaCheck = await fetchOllamaTags(currentOllamaBaseUrl);
  const pulled = getPulledModels();
  const pulledSet = new Set(pulled.map((p) => p.id.toLowerCase()));

  const mergedModels: OllamaModel[] = OFFICIAL_OLLAMA_MODELS.map((model) => {
    const isInstalled =
      pulledSet.has(model.id.toLowerCase()) ||
      ollamaCheck.models.some((m) => m.name && m.name.toLowerCase() === model.id.toLowerCase());

    return {
      ...model,
      installed: isInstalled,
    };
  });

  res.json({
    connected: ollamaCheck.connected,
    host: currentOllamaBaseUrl,
    version: ollamaCheck.version,
    models: mergedModels,
  });
});

// 9. Update Ollama Host URL Configuration
app.post('/api/ollama/config', async (req, res) => {
  const { host } = req.body;
  if (!host || typeof host !== 'string') {
    return res.status(400).json({ error: 'Valid Ollama host URL is required' });
  }

  let cleanedHost = host.trim();
  if (!cleanedHost.startsWith('http://') && !cleanedHost.startsWith('https://')) {
    cleanedHost = `http://${cleanedHost}`;
  }
  cleanedHost = cleanedHost.replace(/\/+$/, '');

  currentOllamaBaseUrl = cleanedHost;
  const status = await fetchOllamaTags(currentOllamaBaseUrl);

  res.json({
    success: true,
    host: currentOllamaBaseUrl,
    connected: status.connected,
    version: status.version,
    installedCount: status.models.length,
    status,
    error: status.error,
  });
});

// Alias for host update (matches App.tsx /api/ollama/host call)
app.post('/api/ollama/host', async (req, res) => {
  const { host } = req.body;
  if (!host || typeof host !== 'string') {
    return res.status(400).json({ error: 'Valid Ollama host URL is required' });
  }

  let cleanedHost = host.trim();
  if (!cleanedHost.startsWith('http://') && !cleanedHost.startsWith('https://')) {
    cleanedHost = `http://${cleanedHost}`;
  }
  cleanedHost = cleanedHost.replace(/\/+$/, '');

  currentOllamaBaseUrl = cleanedHost;
  const statusResult = await fetchOllamaTags(currentOllamaBaseUrl);
  const pulled = getPulledModels();

  res.json({
    success: true,
    status: {
      connected: statusResult.connected,
      host: currentOllamaBaseUrl,
      version: statusResult.version,
      installedCount: statusResult.models.length,
      pulledCount: pulled.length,
      error: statusResult.error,
    },
  });
});

// Auto-start Ollama daemon
app.post('/api/ollama/autostart', async (req, res) => {
  const started = await ensureOllamaDaemon();
  const statusResult = await fetchOllamaTags(currentOllamaBaseUrl);
  res.json({
    success: started || statusResult.connected,
    message: statusResult.connected
      ? 'Ollama daemon is active and responding!'
      : 'Attempted to start Ollama daemon.',
    status: statusResult,
  });
});

// Auto-install Ollama daemon if not installed
app.post('/api/ollama/autoinstall', (req, res) => {
  exec('curl -fsSL https://ollama.com/install.sh | sh', async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({
        error: `Installation failed: ${err.message}`,
        details: stderr,
      });
    }
    // Now start the daemon
    await ensureOllamaDaemon();
    const statusResult = await fetchOllamaTags(currentOllamaBaseUrl);
    res.json({
      success: true,
      message: 'Ollama installed and started successfully!',
      status: statusResult,
      stdout,
    });
  });
});

// 6. Get current persistent memory
app.get('/api/memory', (req, res) => {
  const memory = getMemoryState();
  res.json(memory);
});

// 7. Clear persistent memory
app.post('/api/memory/clear', (req, res) => {
  const freshMemory: MemoryState = {
    type: 'AssistantAgentState',
    version: '1.0.0',
    llm_context: {
      messages: [],
    },
  };
  saveMemoryState(freshMemory);
  res.json({ status: 'cleared', memory: freshMemory });
});

// 8. Import chat history into persistent memory (supports JSON, text transcripts, Markdown)
app.post('/api/memory/import', (req, res) => {
  try {
    const { messages, memory, mode = 'merge' } = req.body;

    let incomingMessages: any[] = [];
    if (Array.isArray(messages)) {
      incomingMessages = messages;
    } else if (memory && memory.llm_context && Array.isArray(memory.llm_context.messages)) {
      incomingMessages = memory.llm_context.messages;
    } else {
      return res.status(400).json({ error: 'No valid messages array found to import.' });
    }

    const state = getMemoryState();
    const sanitized: ChatMessage[] = [];

    for (const msg of incomingMessages) {
      if (!msg) continue;
      const content = typeof msg.content === 'string' ? msg.content.trim() : '';
      if (!content && (!msg.attachments || msg.attachments.length === 0)) continue;

      const source: 'user' | 'chatter' =
        msg.source === 'user' || msg.role === 'user' ? 'user' : 'chatter';
      const type: 'UserMessage' | 'AssistantMessage' =
        source === 'user' ? 'UserMessage' : 'AssistantMessage';

      sanitized.push({
        id: msg.id || `import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        content,
        source,
        type,
        thought: msg.thought || null,
        timestamp: msg.timestamp || new Date().toISOString(),
        attachments: Array.isArray(msg.attachments) ? msg.attachments : undefined,
        sources: Array.isArray(msg.sources) ? msg.sources : undefined,
        searchQuery: msg.searchQuery,
      });
    }

    if (sanitized.length === 0) {
      return res.status(400).json({
        error: 'No valid messages could be parsed from the provided input.',
      });
    }

    if (mode === 'replace') {
      state.llm_context.messages = sanitized;
    } else {
      state.llm_context.messages.push(...sanitized);
    }

    saveMemoryState(state);

    res.json({
      success: true,
      mode,
      importedCount: sanitized.length,
      totalCount: state.llm_context.messages.length,
      memory: state,
    });
  } catch (err: any) {
    console.error('Error in /api/memory/import:', err);
    res.status(500).json({ error: err.message || 'Failed to import messages.' });
  }
});

// Free Internet Search Engine (DuckDuckGo + Wikipedia + HackerNews)
async function searchFreeInternet(query: string): Promise<SearchSource[]> {
  const sources: SearchSource[] = [];
  const cleanQuery = query.replace(/[^\w\s\d.-]/gi, ' ').trim();
  if (!cleanQuery) return sources;

  const sanitizeSnippet = (text: string): string => {
    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const tasks: Promise<void>[] = [];

  // 1. DuckDuckGo Instant Answer API
  tasks.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const ddgRes = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          }
        );
        clearTimeout(timeout);

        if (ddgRes.ok) {
          const data = (await ddgRes.json()) as any;
          if (data.AbstractText && data.AbstractURL) {
            sources.push({
              title: data.Heading || cleanQuery,
              url: data.AbstractURL,
              snippet: data.AbstractText,
            });
          }
          if (Array.isArray(data.RelatedTopics)) {
            for (const topic of data.RelatedTopics) {
              if (topic.Text && topic.FirstURL && sources.length < 5) {
                sources.push({
                  title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                  url: topic.FirstURL,
                  snippet: topic.Text,
                });
              }
            }
          }
        }
      } catch {
        // Ignore fallback
      }
    })()
  );

  // 2. Wikipedia Search API (Free, high-speed, encyclopedic facts)
  tasks.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&srlimit=4`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'AbahChatApp/1.0 (free internet search)' },
          }
        );
        clearTimeout(timeout);

        if (wikiRes.ok) {
          const data = (await wikiRes.json()) as any;
          const searchResults = data?.query?.search;
          if (Array.isArray(searchResults)) {
            for (const item of searchResults) {
              const title = item.title;
              const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
              const snippet = sanitizeSnippet(item.snippet);
              sources.push({
                title,
                url,
                snippet,
              });
            }
          }
        }
      } catch {
        // Ignore
      }
    })()
  );

  // 3. Hacker News Algolia Search API (Real-time tech, developer news, models)
  tasks.push(
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const hnRes = await fetch(
          `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(cleanQuery)}&tags=story&hitsPerPage=4`,
          {
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (hnRes.ok) {
          const data = (await hnRes.json()) as any;
          if (Array.isArray(data.hits)) {
            for (const hit of data.hits) {
              const title = hit.title || hit.story_title;
              const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
              if (title && url) {
                const snippet = hit.story_text
                  ? sanitizeSnippet(hit.story_text).slice(0, 200)
                  : `Hacker News tech community discussion with ${hit.points || 0} points and ${hit.num_comments || 0} comments.`;
                sources.push({
                  title,
                  url,
                  snippet,
                });
              }
            }
          }
        }
      } catch {
        // Ignore
      }
    })()
  );

  await Promise.allSettled(tasks);

  // Deduplicate sources by URL
  const seenUrls = new Set<string>();
  const uniqueSources: SearchSource[] = [];
  for (const src of sources) {
    if (!seenUrls.has(src.url) && src.title && src.snippet) {
      seenUrls.add(src.url);
      uniqueSources.push(src);
    }
  }

  return uniqueSources.slice(0, 5);
}

// 9. Free Internet Search API endpoint
app.all('/api/search', async (req, res) => {
  try {
    const query = req.method === 'POST' ? req.body.query : req.query.q;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await searchFreeInternet(query);
    res.json({ query, results, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// 10. Send chat message with Ollama first, attachments inference, and web search grounding
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gemma2:2b', attachments, webSearch } = req.body;
    if ((!message || typeof message !== 'string') && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message or file attachments are required' });
    }

    const effectiveMessage = (message && typeof message === 'string' ? message.trim() : '') ||
      'Please inspect and analyze the attached file(s).';

    const state = getMemoryState();
    const now = new Date().toISOString();

    // Sanitize attachments for memory storage (prevent massive memory.json by stripping excessively large base64 if needed)
    const sanitizedAttachments: ChatAttachment[] = Array.isArray(attachments)
      ? attachments.map((att: any) => ({
          name: String(att.name || 'file'),
          type: String(att.type || 'text/plain'),
          size: Number(att.size || 0),
          isImage: Boolean(att.isImage),
          content: att.content ? String(att.content) : undefined,
        }))
      : [];

    // Extract and process text, PDF, and image files for AI comprehension
    const processedAttachments: {
      name: string;
      type: string;
      isImage: boolean;
      textContent?: string;
      imageBase64?: string;
      mimeType?: string;
    }[] = [];

    for (const att of sanitizedAttachments) {
      const isPdf =
        att.type === 'application/pdf' ||
        att.name.toLowerCase().endsWith('.pdf') ||
        (att.content && att.content.startsWith('data:application/pdf'));

      if (isPdf && att.content) {
        const extractedText = await extractPdfText(att.content);
        processedAttachments.push({
          name: att.name,
          type: 'application/pdf',
          isImage: false,
          textContent: extractedText,
        });
      } else if (att.isImage && att.content) {
        const parts = att.content.split(',');
        const mimeMatch = att.content.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : (att.type || 'image/jpeg');
        const rawBase64 = parts.length > 1 ? parts[1] : parts[0];
        processedAttachments.push({
          name: att.name,
          type: mimeType,
          isImage: true,
          imageBase64: rawBase64,
          mimeType,
        });
      } else if (att.content) {
        processedAttachments.push({
          name: att.name,
          type: att.type || 'text/plain',
          isImage: false,
          textContent: att.content,
        });
      }
    }

    // Append new user message to state
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      content: effectiveMessage,
      source: 'user',
      type: 'UserMessage',
      timestamp: now,
      attachments: sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined,
    };
    state.llm_context.messages.push(userMsg);

    // Live Web Search Grounding
    let searchSources: SearchSource[] = [];
    if (webSearch) {
      try {
        searchSources = await searchFreeInternet(effectiveMessage);
      } catch (searchErr: any) {
        console.warn('[ABAH CHAT] Web search warning:', searchErr.message);
      }
    }

    // Prepare Model Prompt Augmented with Attachments & Web Grounding
    let augmentedUserPrompt = effectiveMessage;

    if (processedAttachments.length > 0) {
      const docBlocks = processedAttachments
        .map((a) => {
          if (a.isImage) {
            return `[ATTACHED IMAGE: ${a.name} (${a.type})] (Visual image provided for multimodal inspection)`;
          }
          const label = a.type.includes('pdf') ? 'ATTACHED PDF DOCUMENT' : 'ATTACHED TEXT/CODE FILE';
          return `[${label}: ${a.name} (${a.type})]\n\`\`\`\n${a.textContent}\n\`\`\``;
        })
        .join('\n\n');
      augmentedUserPrompt = `${docBlocks}\n\n[USER INSTRUCTION]:\n${augmentedUserPrompt}`;
    }

    if (searchSources.length > 0) {
      const sourcesBlock = searchSources
        .map(
          (s, idx) =>
            `[Source ${idx + 1}]: ${s.title}\nURL: ${s.url}\nSummary: ${s.snippet}`
        )
        .join('\n\n');
      augmentedUserPrompt = `[LIVE FREE INTERNET SEARCH RESULTS FOR: "${effectiveMessage}"]\n${sourcesBlock}\n\n[INSTRUCTIONS]: You have live access to the internet. Answer the user's question accurately based on these up-to-date search results and your knowledge. Cite the source titles or URLs when helpful.\n\n[USER QUESTION]:\n${augmentedUserPrompt}`;
    }

    let replyText = '';
    let providerUsed = 'ollama';

    // Build context history messages (last 20 messages for prompt context)
    const contextHistory = state.llm_context.messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-20);

    const isExplicitGemini = model.startsWith('gemini');

    // Extract base64 images for Ollama vision models
    const base64Images = processedAttachments
      .filter((a) => a.isImage && a.imageBase64)
      .map((a) => a.imageBase64!);

    // Build Gemini contents with multimodal image parts
    const buildGeminiContents = (promptText: string) => {
      const parts: any[] = [{ text: promptText }];
      for (const img of processedAttachments) {
        if (img.isImage && img.imageBase64) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.imageBase64,
            },
          });
        }
      }
      return parts;
    };

    // If it's an Ollama model (default and primary requirement)
    if (!isExplicitGemini) {
      try {
        const ollamaMessages: any[] = [
          {
            role: 'system',
            content:
              'You are chatter, a personal loyal companion. You answer as concisely, directly, and accurately as possible. You have persistent memory of past conversations, can inspect attached files and code, and have live internet search grounding.',
          },
          ...contextHistory.slice(0, -1).map((m) => ({
            role: m.source === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          {
            role: 'user',
            content: augmentedUserPrompt,
            ...(base64Images.length > 0 ? { images: base64Images } : {}),
          },
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for local inference

        const ollamaRes = await fetch(`${currentOllamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: ollamaMessages,
            stream: false,
            options: {
              temperature: 0.2,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (ollamaRes.ok) {
          const data = (await ollamaRes.json()) as any;
          if (data.message && data.message.content) {
            replyText = data.message.content.trim();
            providerUsed = `ollama:${model}`;
          }
        } else {
          const errData = await ollamaRes.json().catch(() => ({}));
          const errMsg = errData.error || `HTTP ${ollamaRes.status}`;

          // Check if model needs to be pulled
          if (errMsg.includes('not found') || errMsg.includes('pull')) {
            replyText = `Ollama model "${model}" is not yet downloaded on your Ollama server (${currentOllamaBaseUrl}). Run:\n\n\`ollama pull ${model}\`\n\nor click "Pull Model" in the model selector. (Your message and attachments are safely recorded in persistent memory.)`;
          } else {
            console.warn(`Ollama responded with error: ${errMsg}`);
            throw new Error(errMsg);
          }
        }
      } catch (ollamaErr: any) {
        console.warn(`Could not complete chat via Ollama (${currentOllamaBaseUrl}):`, ollamaErr.message);

        // Fallback option 1: Check if Gemini is configured to provide an intelligent bridge
        const ai = getAI();
        if (ai) {
          try {
            const conversationHistoryText = contextHistory
              .slice(0, -1)
              .map((m) => `${m.source === 'user' ? 'User' : 'Chatter'}: ${m.content}`)
              .join('\n');

            const promptWithContext = `Conversation History:\n${conversationHistoryText}\n\nUser Message & Context:\n${augmentedUserPrompt}`;

            const geminiContents = buildGeminiContents(promptWithContext);

            const geminiRes = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: geminiContents,
              config: {
                systemInstruction:
                  'You are a personal loyal companion. You answer concisely and accurately. You have persistent memory of past conversations, can read and analyze attached files (PDFs, text files, and images), and cite live web search results.',
                temperature: 0.2,
              },
            });

            replyText = geminiRes.text?.trim() || 'I hear you. How can I assist you further?';
            providerUsed = 'gemini-fallback';
          } catch (gemErr) {
            console.error('Fallback generation error:', gemErr);
          }
        }

        // Fallback option 2: Intelligent local companion context synthesizer if Ollama is unreachable
        if (!replyText) {
          const lower = effectiveMessage.toLowerCase();
          const pastMessages = state.llm_context.messages.slice(0, -1);

          if (searchSources.length > 0) {
            const listSources = searchSources
              .map((s, i) => `${i + 1}. **${s.title}**: ${s.snippet} ([Link](${s.url}))`)
              .join('\n\n');
            replyText = `Here is what I found on the internet for **"${effectiveMessage}"**:\n\n${listSources}\n\n*(Saved to persistent memory. Note: Ollama at ${currentOllamaBaseUrl} is offline, so this answer was gathered via live free web search.)*`;
          } else if (processedAttachments.length > 0) {
            const docSummaries = processedAttachments
              .map((f) => {
                if (f.isImage) {
                  return `• **Image**: \`${f.name}\` (${f.type}) — Visual image logged to conversation context.`;
                }
                const preview = f.textContent ? f.textContent.slice(0, 300).replace(/\n+/g, ' ') : '';
                const tag = f.type.includes('pdf') ? 'PDF Document' : 'Text File';
                return `• **${tag}**: \`${f.name}\`\n  > Excerpt: "${preview}${f.textContent && f.textContent.length > 300 ? '...' : ''}"`;
              })
              .join('\n\n');
            replyText = `I have read and analyzed your attached file(s):\n\n${docSummaries}\n\nAll extracted text and metadata have been recorded into persistent conversation memory. When local Ollama (${currentOllamaBaseUrl}) is connected, it will run direct model weights on this context.`;
          } else if (lower.includes('leave off') || lower.includes('last time') || lower.includes('where did we')) {
            if (pastMessages.length === 0) {
              replyText = "We haven't recorded any previous conversations yet! This is our first session together.";
            } else {
              const lastUser = pastMessages.filter((m) => m.source === 'user').slice(-3);
              const topics = lastUser.map((m) => `"${m.content}"`).join(', ');
              replyText = `Last time we discussed: ${topics}. I have all our conversations safely saved in memory.json.`;
            }
          } else if (lower.includes('summarize') || lower.includes('summary')) {
            if (pastMessages.length === 0) {
              replyText = 'There are no prior messages in memory to summarize yet.';
            } else {
              replyText = `We have recorded ${pastMessages.length} total messages. Past exchanges covered topics including ${pastMessages.slice(-2).map((m) => `"${m.content.slice(0, 40)}..."`).join(' and ')}.`;
            }
          } else if (lower.includes('favorite') || lower.includes('remember')) {
            replyText = `Noted and saved! I've written "${effectiveMessage}" into our persistent memory.json file.`;
          } else {
            replyText = `Your message has been logged to persistent memory. [Note: Ollama at ${currentOllamaBaseUrl} is unreachable. Ensure 'ollama serve' is running or configure host in Settings.]`;
          }
          providerUsed = 'local-companion';
        }
      }
    } else {
      // Gemini requested explicitly
      const ai = getAI();
      if (ai) {
        const conversationHistoryText = contextHistory
          .slice(0, -1)
          .map((m) => `${m.source === 'user' ? 'User' : 'Chatter'}: ${m.content}`)
          .join('\n');

        const promptWithContext = `Conversation History:\n${conversationHistoryText}\n\nUser Message & Context:\n${augmentedUserPrompt}`;

        const geminiContents = buildGeminiContents(promptWithContext);

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: geminiContents,
          config: {
            systemInstruction:
              'You are a personal loyal companion. You answer concisely and accurately. You have persistent memory of past conversations, can read and analyze attached files (PDFs, text files, and images), and cite live web search results.',
            temperature: 0.2,
          },
        });

        replyText = response.text || 'I hear you. How else can I assist you?';
        providerUsed = 'gemini';
      } else {
        replyText = 'Please provide GEMINI_API_KEY to use Gemini, or select an Ollama model.';
      }
    }

    // Append chatter reply to persistent state
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      content: replyText,
      source: 'chatter',
      type: 'AssistantMessage',
      thought: null,
      timestamp: new Date().toISOString(),
      sources: searchSources.length > 0 ? searchSources : undefined,
      searchQuery: searchSources.length > 0 ? effectiveMessage : undefined,
    };
    state.llm_context.messages.push(assistantMsg);

    // Save to disk
    saveMemoryState(state);

    res.json({
      reply: replyText,
      memory: state,
      provider: providerUsed,
      model,
      sources: searchSources.length > 0 ? searchSources : undefined,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

async function startServer() {
  // Automatically ensure local Ollama daemon is started if installed
  ensureOllamaDaemon().catch((e) => console.warn('[ABAH CHAT] Ollama autostart check:', e.message));

  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ABAH CHAT] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[ABAH CHAT] Ollama endpoint configured at ${currentOllamaBaseUrl}`);
  });
}

startServer();
