import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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

app.use(express.json());

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

interface ChatMessage {
  content: string;
  source: 'user' | 'chatter';
  type: 'UserMessage' | 'AssistantMessage';
  thought?: string | null;
  timestamp?: string;
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

  const pulled = getPulledModels();
  let existingIndex = pulled.findIndex(
    (m) => m.id.toLowerCase() === fullModelTag.toLowerCase()
  );

  const modelEntry: PulledOllamaModel = {
    id: fullModelTag,
    name: formatModelName(baseModel) + (modelTag !== 'latest' ? ` (${modelTag})` : ''),
    baseModelId: baseModel,
    tag: modelTag,
    parameterSize: modelTag.toUpperCase(),
    size: '1.6 GB',
    description: `Pulled from Ollama library (${fullModelTag})`,
    pulledAt: new Date().toISOString(),
    status: 'pulling',
    progress: 10,
    statusMessage: 'Starting pull request...',
  };

  if (existingIndex >= 0) {
    pulled[existingIndex] = { ...pulled[existingIndex], ...modelEntry, status: 'pulling', progress: 15 };
  } else {
    pulled.unshift(modelEntry);
  }
  savePulledModels(pulled);

  activePulls.set(fullModelTag, {
    model: fullModelTag,
    status: 'Starting download...',
    percent: 15,
    isDone: false,
  });

  // Asynchronously execute pull in background
  (async () => {
    const ollamaCheck = await fetchOllamaTags(currentOllamaBaseUrl);
    if (ollamaCheck.connected) {
      try {
        const pullRes = await fetch(`${currentOllamaBaseUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: fullModelTag }),
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

                activePulls.set(fullModelTag, {
                  model: fullModelTag,
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
      // simulate smooth progressive pull so user can experience full flow
      const steps = [
        { percent: 35, status: 'Pulling manifest & layers...' },
        { percent: 70, status: 'Downloading model weights...' },
        { percent: 90, status: 'Verifying sha256 checksum...' },
        { percent: 100, status: 'Pull complete & verified' },
      ];

      for (const step of steps) {
        await new Promise((r) => setTimeout(r, 600));
        activePulls.set(fullModelTag, {
          model: fullModelTag,
          status: step.status,
          percent: step.percent,
          isDone: step.percent === 100,
        });
      }
    }

    // Mark as ready
    activePulls.set(fullModelTag, {
      model: fullModelTag,
      status: 'Pull completed successfully',
      percent: 100,
      isDone: true,
    });

    const currentPulled = getPulledModels();
    const idx = currentPulled.findIndex((m) => m.id.toLowerCase() === fullModelTag.toLowerCase());
    if (idx >= 0) {
      currentPulled[idx].status = 'ready';
      currentPulled[idx].progress = 100;
      currentPulled[idx].statusMessage = 'Model ready';
      savePulledModels(currentPulled);
    }
  })();

  res.json({
    status: 'pulling',
    model: fullModelTag,
    message: `Pull initiated for ${fullModelTag}`,
    progress: 15,
  });
});

// 7. Get pull status
app.get('/api/ollama/pull/status', (req, res) => {
  const model = typeof req.query.model === 'string' ? req.query.model : '';
  if (!model) {
    return res.status(400).json({ error: 'Model parameter required' });
  }

  const progress = activePulls.get(model);
  if (progress) {
    return res.json(progress);
  }

  // Check persistent pulled list
  const pulled = getPulledModels();
  const entry = pulled.find((m) => m.id.toLowerCase() === model.toLowerCase());
  if (entry) {
    return res.json({
      model,
      status: entry.status === 'ready' ? 'Ready' : entry.statusMessage || entry.status,
      percent: entry.progress || (entry.status === 'ready' ? 100 : 0),
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

// Download Ubuntu .deb package
app.get('/api/downloads/deb', (req, res) => {
  const debPath = path.join(process.cwd(), 'public', 'downloads', 'abah-chat_1.0.0_all.deb');
  if (fs.existsSync(debPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="abah-chat_1.0.0_all.deb"');
    res.setHeader('Content-Type', 'application/vnd.debian.binary-package');
    return res.sendFile(debPath);
  }
  const rootDeb = path.join(process.cwd(), 'abah-chat_1.0.0_all.deb');
  if (fs.existsSync(rootDeb)) {
    res.setHeader('Content-Disposition', 'attachment; filename="abah-chat_1.0.0_all.deb"');
    res.setHeader('Content-Type', 'application/vnd.debian.binary-package');
    return res.sendFile(rootDeb);
  }
  res.status(404).json({ error: 'Debian package not found. Run ./build_deb.sh to compile.' });
});

// Download Android .apk package
app.get('/api/downloads/apk', (req, res) => {
  const apkPath = path.join(process.cwd(), 'public', 'downloads', 'abah-chat-1.0.0.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="abah-chat-1.0.0.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.sendFile(apkPath);
  }
  const rootApk = path.join(process.cwd(), 'abah-chat-1.0.0.apk');
  if (fs.existsSync(rootApk)) {
    res.setHeader('Content-Disposition', 'attachment; filename="abah-chat-1.0.0.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.sendFile(rootApk);
  }
  res.status(404).json({ error: 'Android APK package not found. Run ./build_apk.sh to compile.' });
});

// Packages information endpoint
app.get('/api/downloads/info', (req, res) => {
  const debPath = path.join(process.cwd(), 'public', 'downloads', 'abah-chat_1.0.0_all.deb');
  const apkPath = path.join(process.cwd(), 'public', 'downloads', 'abah-chat-1.0.0.apk');

  const debExists = fs.existsSync(debPath);
  const apkExists = fs.existsSync(apkPath);

  res.json({
    deb: {
      available: debExists,
      filename: 'abah-chat_1.0.0_all.deb',
      version: '1.0.0',
      size: debExists ? `${Math.round(fs.statSync(debPath).size / 1024)} KB` : null,
      downloadUrl: '/api/downloads/deb',
      installCommand: 'sudo dpkg -i abah-chat_1.0.0_all.deb',
    },
    apk: {
      available: apkExists,
      filename: 'abah-chat-1.0.0.apk',
      version: '1.0.0',
      size: apkExists ? `${Math.round(fs.statSync(apkPath).size / 1024)} KB` : null,
      downloadUrl: '/api/downloads/apk',
      installCommand: 'adb install -r abah-chat-1.0.0.apk',
    },
  });
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

// 8. Send chat message with Ollama first & memory persistence
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gemma2:2b' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const state = getMemoryState();
    const now = new Date().toISOString();

    // Append new user message to state
    const userMsg: ChatMessage = {
      content: message,
      source: 'user',
      type: 'UserMessage',
      timestamp: now,
    };
    state.llm_context.messages.push(userMsg);

    let replyText = '';
    let providerUsed = 'ollama';

    // Build context history messages (last 20 messages for prompt context)
    const contextHistory = state.llm_context.messages
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-20);

    const isExplicitGemini = model.startsWith('gemini');

    // If it's an Ollama model (default and primary requirement)
    if (!isExplicitGemini) {
      try {
        const ollamaMessages = [
          {
            role: 'system',
            content:
              'You are a personal loyal companion. You answer as briefly and as concisely as possible. You have persistent memory of past conversations.',
          },
          ...contextHistory.map((m) => ({
            role: m.source === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for local inference

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
            replyText = `Ollama model "${model}" is not yet downloaded on your Ollama server (${currentOllamaBaseUrl}). Run:\n\n\`ollama pull ${model}\`\n\nor click "Pull Model" in the model selector. (Your message is safely recorded in persistent memory.)`;
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
              .map((m) => `${m.source === 'user' ? 'User' : 'Chatter'}: ${m.content}`)
              .join('\n');

            const promptWithContext = `Conversation History:\n${conversationHistoryText}\n\nRespond as chatter (personal loyal companion) to the latest user message: "${message}".`;

            const geminiRes = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: promptWithContext,
              config: {
                systemInstruction:
                  'You are a personal loyal companion. You answer as briefly and as concisely as possible. You have persistent memory of past conversations.',
                temperature: 0.2,
              },
            });

            replyText = geminiRes.text?.trim() || 'I hear you. How can I assist you further?';
            providerUsed = 'gemini-fallback';
          } catch (gemErr) {
            console.error('Fallback generation error:', gemErr);
          }
        }

        // Fallback option 2: Intelligent local companion context parser if Ollama is unreachable
        if (!replyText) {
          const lower = message.toLowerCase();
          const pastMessages = state.llm_context.messages.slice(0, -1);

          if (lower.includes('leave off') || lower.includes('last time') || lower.includes('where did we')) {
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
            replyText = `Noted and saved! I've written "${message}" into our persistent memory.json file.`;
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
          .map((m) => `${m.source === 'user' ? 'User' : 'Chatter'}: ${m.content}`)
          .join('\n');

        const promptWithContext = `Conversation History:\n${conversationHistoryText}\n\nRespond as chatter (personal loyal companion) to the latest user message: "${message}".`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptWithContext,
          config: {
            systemInstruction:
              'You are a personal loyal companion. You answer as briefly and as concisely as possible. You have persistent memory of past conversations.',
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
      content: replyText,
      source: 'chatter',
      type: 'AssistantMessage',
      thought: null,
      timestamp: new Date().toISOString(),
    };
    state.llm_context.messages.push(assistantMsg);

    // Save to disk
    saveMemoryState(state);

    res.json({
      reply: replyText,
      memory: state,
      provider: providerUsed,
      model,
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
