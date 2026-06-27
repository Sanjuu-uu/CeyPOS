import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Code2,
  Database,
  FileText,
  History,
  Loader2,
  Mic,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  Wrench,
  Zap,
  X,
} from 'lucide-react';
import { ChatVisualization, type VisualizationData } from './ChatVisualization';
import { useApp } from '../../../context/AppContext';
import { API_BASE } from '../../../lib/api';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  message: string;
  timestamp: Date;
  status: 'sending' | 'streaming' | 'sent' | 'error';
  attachments?: Attachment[];
  visualizations?: VisualizationData[];
  metadata?: MessageMetadata;
}

type ChatMode = 'lite' | 'agent';

interface AgentStep {
  id: string;
  type: string;
  title: string;
  detail?: string;
  status: 'running' | 'done' | 'error';
  at?: string;
}

interface MessageMetadata {
  mode?: ChatMode;
  agentSteps?: AgentStep[];
  usage?: {
    promptTokens?: number;
    candidateTokens?: number;
    thoughtsTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
    estimatedQuestionsPerUsd?: number | null;
  } | null;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
  lastMessage: string;
  questionCount: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface VisualizationConfig {
  provider: string;
  configured: boolean;
  baseUrl: string | null;
  serviceId: string | null;
}

type AnalyticsResponse = {
  answer?: string;
  visualizations?: VisualizationData[];
  visualizationConfig?: VisualizationConfig;
  mode?: ChatMode;
  agentSteps?: AgentStep[];
  step?: AgentStep;
  usage?: MessageMetadata['usage'];
  conversation?: {
    title?: string;
    updatedAt?: string;
  };
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const ACCENT = '#ecff76';
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const WELCOME_MESSAGE_PREFIX = 'Hi, I can analyze live shop sales';

const PROMPT_SUGGESTIONS = [
  'Show today revenue and order count',
  'Find slow moving inventory',
  'Compare sales by payment method',
  'Which products need restocking?',
];

const CONTEXT_CHIPS = ['Live SQLite', 'Sales', 'Inventory', 'Customers'];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};


const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatConversationTime = (date: Date) =>
  date.toLocaleDateString([], { month: 'short', day: 'numeric' });

const isWelcomeMessage = (message: Message) =>
  message.sender === 'ai' && message.message.startsWith(WELCOME_MESSAGE_PREFIX);

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const win = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

const renderInlineMarkdown = (text: string) => {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return segments.map((segment, index) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-900">
          {segment.slice(1, -1)}
        </code>
      );
    }
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });
};

const MarkdownMessage: React.FC<{ text: string }> = ({ text }) => {
  const blocks = text.split(/```/g);
  return (
    <div className="space-y-3 text-sm leading-6 break-words [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const lines = block.replace(/^\w+\n/, '').trim();
          return (
            <pre key={index} className="overflow-x-auto rounded-md border border-gray-900 bg-gray-950 p-3 text-xs text-white">
              <code>{lines}</code>
            </pre>
          );
        }

        return block
          .split(/\n{2,}/)
          .filter((paragraph) => paragraph.trim())
          .map((paragraph, paragraphIndex) => {
            const trimmed = paragraph.trim();
            if (/^[-*]\s/m.test(trimmed)) {
              return (
                <ul key={`${index}-${paragraphIndex}`} className="list-disc space-y-1 pl-5">
                  {trimmed.split('\n').map((line, lineIndex) => (
                    <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^[-*]\s/, ''))}</li>
                  ))}
                </ul>
              );
            }
            return <p key={`${index}-${paragraphIndex}`}>{renderInlineMarkdown(trimmed)}</p>;
          });
      })}
    </div>
  );
};

const AgentSteps: React.FC<{ steps: AgentStep[] }> = ({ steps }) => {
  if (!steps.length) return null;

  return (
    <div className="mb-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <Wrench className="h-3.5 w-3.5" />
        Agent progress
      </div>
      {steps.map((step) => (
        <div key={step.id} className="flex gap-2 text-[12px] leading-5 text-gray-700">
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              step.status === 'error'
                ? 'bg-rose-500'
                : step.status === 'done'
                  ? 'bg-emerald-500'
                  : 'animate-pulse bg-gray-500'
            }`}
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{step.title}</p>
            {step.detail && <p className="break-words text-gray-500 [overflow-wrap:anywhere]">{step.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

const StartSurface: React.FC<{
  shopLabel: string | null;
  onPickPrompt: (prompt: string) => void;
}> = ({ shopLabel, onPickPrompt }) => (
  <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-8">
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-950">Ask CeyPOS Analytics</h3>
        <p className="truncate text-xs text-gray-500">
          {shopLabel ? `Workspace context: ${shopLabel}` : 'Select a shop to use live context'}
        </p>
      </div>
    </div>

    <div className="mb-4 flex flex-wrap gap-1.5">
      {CONTEXT_CHIPS.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600"
        >
          <Database className="h-3 w-3" />
          {chip}
        </span>
      ))}
    </div>

    <div className="grid gap-2">
      {PROMPT_SUGGESTIONS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPickPrompt(prompt)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-[13px] leading-5 text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  </div>
);

const normalizeMessage = (message: Message): Message => ({
  ...message,
  timestamp: new Date(message.timestamp),
});

const normalizeConversation = (conversation: Conversation): Conversation => ({
  ...conversation,
  createdAt: new Date(conversation.createdAt),
  updatedAt: new Date(conversation.updatedAt),
  messages: conversation.messages.map(normalizeMessage),
});

const normalizeSummary = (conversation: ConversationSummary): ConversationSummary => ({
  ...conversation,
  updatedAt: new Date(conversation.updatedAt),
  questionCount: Number(conversation.questionCount ?? 0),
  lastMessage: conversation.lastMessage ?? '',
});

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const { activeShopId, currentUser, currentShop } = useApp();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [config, setConfig] = useState<VisualizationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('lite');
  const [isListening, setIsListening] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const userEmail = currentUser?.email ?? '';

  const normalizedShopId = useMemo(() => {
    if (!activeShopId) return null;
    return String(activeShopId).replace(/^shop_/, '').replace(/\.db$/i, '');
  }, [activeShopId]);

  const shopLabel = useMemo(() => {
    const name = currentShop?.name?.trim();
    if (name) return name;
    return normalizedShopId ?? null;
  }, [currentShop?.name, normalizedShopId]);

  const requestRecentChats = useCallback(async () => {
    const response = await fetch(
      `${API_BASE}/api/analytics/chats?shopId=${encodeURIComponent(
        normalizedShopId ?? ''
      )}&userEmail=${encodeURIComponent(userEmail)}`
    );
    if (!response.ok) {
      throw new Error('Failed to load recent chats');
    }
    const data = (await response.json()) as { conversations?: ConversationSummary[] };
    return (data.conversations ?? []).map(normalizeSummary);
  }, [normalizedShopId, userEmail]);

  const requestConversation = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `${API_BASE}/api/analytics/chats/${encodeURIComponent(
        conversationId
      )}?shopId=${encodeURIComponent(normalizedShopId ?? '')}&userEmail=${encodeURIComponent(
        userEmail
      )}`
    );
    if (!response.ok) {
      throw new Error('Failed to load chat');
    }
    const data = (await response.json()) as { conversation: Conversation };
    return normalizeConversation(data.conversation);
  }, [normalizedShopId, userEmail]);

  const requestNewChat = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/analytics/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: normalizedShopId, userEmail }),
    });
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    const data = (await response.json()) as { conversation: Conversation };
    return normalizeConversation(data.conversation);
  }, [normalizedShopId, userEmail]);

  const requestDeleteChat = useCallback(async (conversationId: string) => {
    const response = await fetch(
      `${API_BASE}/api/analytics/chats/${encodeURIComponent(
        conversationId
      )}?shopId=${encodeURIComponent(normalizedShopId ?? '')}&userEmail=${encodeURIComponent(
        userEmail
      )}`,
      { method: 'DELETE' }
    );
    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }
  }, [normalizedShopId, userEmail]);

  const filteredConversations = useMemo(() => {
    return [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [conversations]);

  const updateActiveConversation = useCallback(
    (updater: (conversation: Conversation) => Conversation) => {
      setActiveConversation((prev) => (prev ? updater(prev) : prev));
    },
    [],
  );

  const appendMessage = useCallback(
    (message: Message, conversationIdOverride?: string) => {
      const targetId = conversationIdOverride ?? activeConversationId;
      if (!targetId) return;
      if (targetId === activeConversationId) {
        updateActiveConversation((conversation) => ({
          ...conversation,
          title:
            conversation.title === 'New analytics chat' && message.sender === 'user'
              ? message.message.slice(0, 56)
              : conversation.title,
          updatedAt: new Date(),
          messages: [...conversation.messages, message],
        }));
      }
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== targetId) return conversation;
          return {
            ...conversation,
            title:
              conversation.title === 'New analytics chat' && message.sender === 'user'
                ? message.message.slice(0, 56)
                : conversation.title,
            lastMessage: message.message,
            questionCount:
              message.sender === 'user' ? conversation.questionCount + 1 : conversation.questionCount,
            updatedAt: new Date(),
          };
        }),
      );
    },
    [activeConversationId, updateActiveConversation],
  );

  const updateMessage = useCallback(
    (messageId: string, patch: Partial<Message>, conversationIdOverride?: string) => {
      const targetId = conversationIdOverride ?? activeConversationId;
      if (!targetId || targetId !== activeConversationId) return;
      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: new Date(),
        messages: conversation.messages.map((message) =>
          message.id === messageId ? { ...message, ...patch } : message,
        ),
      }));
    },
    [activeConversationId, updateActiveConversation],
  );

  const appendToMessage = useCallback(
    (messageId: string, delta: string, conversationIdOverride?: string) => {
      const targetId = conversationIdOverride ?? activeConversationId;
      if (!targetId || targetId !== activeConversationId) return;
      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: new Date(),
        messages: conversation.messages.map((message) =>
          message.id === messageId
            ? { ...message, message: `${message.message}${delta}`, status: 'streaming' }
            : message,
        ),
      }));
    },
    [activeConversationId, updateActiveConversation],
  );

  const appendAgentStep = useCallback(
    (messageId: string, step: AgentStep, conversationIdOverride?: string) => {
      const targetId = conversationIdOverride ?? activeConversationId;
      if (!targetId || targetId !== activeConversationId) return;
      updateActiveConversation((conversation) => ({
        ...conversation,
        updatedAt: new Date(),
        messages: conversation.messages.map((message) => {
          if (message.id !== messageId) return message;
          const metadata = message.metadata ?? {};
          const previousSteps = metadata.agentSteps ?? [];
          return {
            ...message,
            metadata: {
              ...metadata,
              mode: 'agent',
              agentSteps: [...previousSteps.filter((item) => item.id !== step.id), step],
            },
          };
        }),
      }));
    },
    [activeConversationId, updateActiveConversation],
  );

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const buildSummaryFromConversation = (conversation: Conversation): ConversationSummary => {
    const lastMessage = conversation.messages[conversation.messages.length - 1]?.message ?? '';
    const questionCount = conversation.messages.filter((message) => message.sender === 'user').length;
    return {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      lastMessage,
      questionCount,
    };
  };

  useEffect(() => {
    if (!normalizedShopId || !userEmail) {
      setConversations([]);
      setActiveConversation(null);
      setActiveConversationId('');
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const recent = await requestRecentChats();
        if (cancelled) return;

        if (!recent.length) {
          const conversation = await requestNewChat();
          if (cancelled) return;
          setConversations([buildSummaryFromConversation(conversation)]);
          setActiveConversation(conversation);
          setActiveConversationId(conversation.id);
          setShowRecent(false);
          return;
        }

        setConversations(recent);
        const first = recent[0];
        const conversation = await requestConversation(first.id);
        if (cancelled) return;
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
      } catch (error) {
        console.warn('Analytics conversations load failed', error);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [normalizedShopId, requestConversation, requestNewChat, requestRecentChats, userEmail]);

  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages, autoScroll, isLoading]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(156, textarea.scrollHeight)}px`;
  }, [chatInput]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, []);

  const handleScroll = () => {
    const element = scrollAreaRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setAutoScroll(distanceFromBottom < 140);
  };

  const handleStartNewChat = () => {
    if (!normalizedShopId || !userEmail) return;
    requestNewChat()
      .then((conversation) => {
        const summary = buildSummaryFromConversation(conversation);
        setConversations((prev) => [summary, ...prev.filter((item) => item.id !== summary.id)].slice(0, 6));
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
        setChatInput('');
        setAttachments([]);
        setConfig(null);
        setAutoScroll(true);
        focusInput();
      })
      .catch((error) => {
        console.warn('Failed to create chat', error);
      });
  };

  const handleOpenConversation = (conversationId: string) => {
    if (!normalizedShopId || !userEmail) return;
    requestConversation(conversationId)
      .then((conversation) => {
        setActiveConversation(conversation);
        setActiveConversationId(conversationId);
        setShowRecent(false);
        setChatInput('');
        setAttachments([]);
        setAutoScroll(true);
        focusInput();
      })
      .catch((error) => {
        console.warn('Failed to open chat', error);
      });
  };

  const handleDeleteConversation = (conversationId: string, options?: { preferRecent?: boolean }) => {
    if (!normalizedShopId || !userEmail) return;
    const preferRecent = options?.preferRecent ?? false;
    requestDeleteChat(conversationId)
      .then(() => {
        setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
        if (conversationId !== activeConversationId) return;
        setActiveConversation(null);
        setActiveConversationId('');
        if (!preferRecent) {
          handleStartNewChat();
        }
      })
      .catch((error) => {
        console.warn('Failed to delete chat', error);
      });
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const nextAttachments: Attachment[] = [];

    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        nextAttachments.push({
          id: createId(),
          name: `${file.name} (too large)`,
          size: file.size,
          type: file.type || 'application/octet-stream',
        });
        continue;
      }

      let preview: string | undefined;
      if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        preview = (await file.text()).slice(0, 4000);
      }
      nextAttachments.push({
        id: createId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        preview,
      });
    }

    setAttachments((prev) => [...prev, ...nextAttachments].slice(0, 5));
    event.target.value = '';
  };

  const handleToggleVoice = () => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setChatInput((prev) => `${prev}${prev ? '\n' : ''}Voice typing is not supported in this browser.`);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
      setChatInput((prev) => {
        const base = prev.replace(/\s*\[listening:.*?\]$/i, '').trimEnd();
        return `${base}${base ? ' ' : ''}[listening: ${transcript.trim()}]`;
      });
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const streamResponse = async (
    question: string,
    aiMessageId: string,
    sentAttachments: Attachment[],
    conversationIdOverride?: string,
  ) => {
    const conversationId = conversationIdOverride ?? activeConversationId;
    if (!conversationId) {
      throw new Error('No active chat selected');
    }
    const historyPayload = (activeConversation?.messages ?? [])
      .slice(-4)
      .map((message) => ({ sender: message.sender, message: message.message }));

    const response = await fetch(
      `${API_BASE}/api/analytics/chats/${encodeURIComponent(
        conversationId
      )}/messages/stream`,
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        shopId: normalizedShopId,
        userEmail,
        attachments: sentAttachments.map(({ name, size, type, preview }) => ({ name, size, type, preview })),
        history: historyPayload,
        mode: chatMode,
      }),
      signal: abortRef.current?.signal,
    }
    );

    if (!response.ok || !response.body) {
      let data: AnalyticsResponse | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      throw new Error(data?.error ?? `Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const consumeEvent = (eventText: string) => {
      const eventName = eventText.match(/^event:\s*(.+)$/m)?.[1]?.trim() ?? 'message';
      const dataText = eventText
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!dataText) return;
      const payload = JSON.parse(dataText) as AnalyticsResponse & { delta?: string };

      if (eventName === 'chunk' && payload.delta) {
        appendToMessage(aiMessageId, payload.delta, conversationId);
      }

      if (eventName === 'step' && payload.step) {
        appendAgentStep(aiMessageId, payload.step, conversationId);
      }

      if (eventName === 'done') {
        if (payload.visualizationConfig) {
          setConfig(payload.visualizationConfig);
        }
        updateMessage(
          aiMessageId,
          {
          message: payload.answer || 'Sorry, I could not generate a response.',
          visualizations: Array.isArray(payload.visualizations) ? payload.visualizations : [],
          metadata: {
            mode: payload.mode ?? chatMode,
            agentSteps: Array.isArray(payload.agentSteps) ? payload.agentSteps : [],
            usage: payload.usage ?? null,
          },
          status: 'sent',
          },
          conversationId,
        );
        if (payload.conversation && conversationId) {
          const conversationMeta = payload.conversation;
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    title: conversationMeta.title ?? conversation.title,
                    updatedAt: conversationMeta.updatedAt
                      ? new Date(conversationMeta.updatedAt)
                      : conversation.updatedAt,
                  }
                : conversation,
            ),
          );
        }
      }

      if (eventName === 'error') {
        throw new Error(payload.error ?? 'Analytics request failed');
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      events.filter(Boolean).forEach(consumeEvent);
    }
  };

  const handleSendMessage = async () => {
    const question = chatInput.replace(/\s*\[listening:\s*(.*?)\]$/i, ' $1').trim();
    if (!question || isLoading) return;

    if (!normalizedShopId || !userEmail) {
      appendMessage({
        id: createId(),
        sender: 'ai',
        message: 'Analytics chat requires an active shop and signed-in user. Please finish onboarding or refresh after selecting your shop.',
        timestamp: new Date(),
        status: 'error',
        visualizations: [],
      });
      return;
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const conversation = await requestNewChat();
        const summary = buildSummaryFromConversation(conversation);
        setConversations((prev) => [summary, ...prev.filter((item) => item.id !== summary.id)].slice(0, 6));
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
        setChatInput('');
        setAttachments([]);
        setConfig(null);
        setAutoScroll(true);
        conversationId = conversation.id;
      } catch (error) {
        console.warn('Failed to create chat before sending', error);
        return;
      }
    }

    const sentAttachments = attachments;
    const aiMessageId = createId();
    appendMessage({
      id: createId(),
      sender: 'user',
      message: question,
      timestamp: new Date(),
      status: 'sent',
      attachments: sentAttachments,
      metadata: { mode: chatMode },
    }, conversationId);
    appendMessage({
      id: aiMessageId,
      sender: 'ai',
      message: '',
      timestamp: new Date(),
      status: 'streaming',
      visualizations: [],
      metadata: { mode: chatMode, agentSteps: [] },
    }, conversationId);

    setChatInput('');
    setAttachments([]);
    setIsLoading(true);
    setAutoScroll(true);
    focusInput();
    abortRef.current = new AbortController();

    try {
      await streamResponse(question, aiMessageId, sentAttachments, conversationId);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        updateMessage(aiMessageId, {
          message: 'Response stopped.',
          status: 'sent',
        }, conversationId);
      } else {
        updateMessage(aiMessageId, {
          message: `Error: ${(error as Error).message || 'Could not connect to AI service.'}`,
          status: 'error',
        }, conversationId);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      focusInput();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleCopy = async (message: Message) => {
    await navigator.clipboard.writeText(message.message);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1400);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handlePickPrompt = (prompt: string) => {
    setChatInput(prompt);
    focusInput();
  };

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-l border-gray-200 bg-white shadow-sm transition-[width] duration-300 ${
        isOpen ? 'w-full md:w-[340px] xl:w-[380px]' : 'w-[52px]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="absolute -left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#c5f542] text-gray-950 shadow-sm transition hover:brightness-95"
        title={isOpen ? 'Collapse chat' : 'Expand chat'}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {!isOpen ? (
        <div className="flex h-full flex-col items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => {
              setShowRecent(false);
              onToggle();
            }}
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
            title="Open AI chat"
          >
            <PanelRightOpen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              handleStartNewChat();
              onToggle();
            }}
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
            title="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRecent(true);
              onToggle();
            }}
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
            title="Recent chats"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <header className="border-b border-gray-200 bg-white px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-950">AI Analytics</p>
                  <p className="text-xs text-gray-500">{currentUser?.email ?? 'Shop assistant'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setShowRecent((value) => !value)} className="rounded-md p-2 text-gray-600 hover:bg-gray-100" title="Preview recent chats">
                  <History className="h-4 w-4" />
                </button>
                <button type="button" onClick={handleStartNewChat} className="rounded-md bg-[var(--verde-naturale--primary)] p-2 text-gray-950 hover:brightness-95" title="New chat">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" onClick={onToggle} className="rounded-md p-2 text-gray-600 hover:bg-gray-100" title="Collapse">
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>
            </div>

          </header>

          {config && !config.configured && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              Remote chart hosting is not fully configured. Text analysis still works, and chart requests will return a setup notice.
            </div>
          )}

          {showRecent ? (
            <div className="flex-1 overflow-y-auto bg-gray-50/70 px-4 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-950">Recent chats</h3>
                  <p className="text-xs text-gray-500">Stored for this user and shop.</p>
                </div>
              </div>

              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const lastMessage = conversation.lastMessage;
                  return (
                    <div
                      key={conversation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenConversation(conversation.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenConversation(conversation.id);
                        }
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left transition ${
                        conversation.id === activeConversation?.id
                          ? 'border-gray-300 bg-[var(--verde-naturale--primary)]'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold leading-5 text-gray-950">{conversation.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-[12px] leading-5 text-gray-600">
                            {lastMessage || 'No messages yet'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteConversation(conversation.id, { preferRecent: true });
                          }}
                          className="rounded p-1 text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete chat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        <span>{formatConversationTime(conversation.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
          <div ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-gray-50/70 px-4 py-5">
            <div className="space-y-3">
              {!(activeConversation?.messages ?? []).some((message) => message.sender === 'user') && (
                <StartSurface shopLabel={shopLabel} onPickPrompt={handlePickPrompt} />
              )}
              {activeConversation?.messages.map((message) => {
                if (isWelcomeMessage(message)) return null;
                const isUser = message.sender === 'user';
                const hasAgentSteps = !isUser && Boolean(message.metadata?.agentSteps?.length);
                const isEmptyStreaming = message.status === 'streaming' && !message.message && !hasAgentSteps;
                return (
                  <div key={message.id} className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div
                        className={`rounded-lg transition break-words [overflow-wrap:anywhere] ${
                          isEmptyStreaming
                            ? 'border-0 bg-transparent px-1 py-1 shadow-none'
                            : `border border-gray-200 px-4 py-3 shadow-sm ${
                                isUser
                                  ? 'bg-[var(--verde-naturale--primary)] text-gray-950'
                                  : 'bg-white text-gray-950'
                              } ${message.status === 'error' ? 'bg-rose-50' : ''}`
                        }`}
                        style={isUser && !isEmptyStreaming ? { backgroundColor: ACCENT } : undefined}
                      >
                        {isEmptyStreaming ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:120ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:240ms]" />
                            </span>
                          </div>
                        ) : (
                          <>
                            {hasAgentSteps && (
                              <AgentSteps steps={message.metadata?.agentSteps ?? []} />
                            )}
                            {message.message ? (
                              <MarkdownMessage text={message.message} />
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Working
                              </div>
                            )}
                          </>
                        )}

                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 grid gap-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex min-w-0 items-center gap-2 rounded-md border border-gray-900/20 bg-white/60 px-2 py-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate">{attachment.name}</span>
                                <span className="ml-auto text-gray-500">{formatBytes(attachment.size)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {message.visualizations && message.visualizations.length > 0 && (
                        <div className="w-full space-y-2">
                          {message.visualizations.map((visualization, index) => (
                            <ChatVisualization key={`${message.id}-${index}`} visualization={visualization} />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-gray-500 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                        <span>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button type="button" onClick={() => handleCopy(message)} className="rounded p-1 hover:bg-gray-200" title="Copy message">
                          {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                        </button>
                        {!isUser && (
                          <button type="button" className="rounded p-1 hover:bg-gray-200" title="More actions">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>

          {!autoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-lg"
              title="Jump to latest"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </button>
          )}

          <footer className="border-t border-gray-200 bg-white p-4">
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                      className="rounded hover:bg-gray-200"
                      title="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-gray-500">
              <textarea
                ref={inputRef}
                placeholder={chatMode === 'agent' ? 'Ask Agent to analyze, calculate, and use tools' : 'Ask a quick analytics question'}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="max-h-40 min-h-[54px] w-full resize-none border-0 bg-transparent px-3 py-3 text-sm text-gray-950 outline-none placeholder:text-gray-400 disabled:opacity-70"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-2 py-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
                  <div className="mr-1 inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setChatMode('lite')}
                      className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[12px] font-medium ${
                        chatMode === 'lite' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-950'
                      }`}
                      title="Lite mode"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Lite
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatMode('agent')}
                      className={`inline-flex h-7 items-center gap-1 rounded px-2 text-[12px] font-medium ${
                        chatMode === 'agent' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-950'
                      }`}
                      title="Agent mode"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Agent
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-gray-600 hover:bg-gray-100"
                    title="Add context"
                  >
                    <Paperclip className="h-4 w-4" />
                    Context
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`h-8 rounded-md p-2 ${isListening ? 'bg-[var(--verde-naturale--primary)] text-gray-950' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Voice typing"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button type="button" className="h-8 rounded-md p-2 text-gray-600 hover:bg-gray-100" title="Insert code block">
                    <Code2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeConversation && activeConversation.messages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(activeConversation.id)}
                      className="rounded-md p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete current chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isLoading ? (
                    <button type="button" onClick={handleStop} className="rounded-md bg-gray-950 p-2 text-white" title="Stop response">
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || !normalizedShopId}
                      className="rounded-md bg-[var(--verde-naturale--primary)] p-2 text-gray-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span className="inline-flex min-w-0 items-center gap-1">
                <Database className="h-3 w-3 shrink-0" />
                <span className="truncate">{shopLabel ? shopLabel : 'No active shop selected'}</span>
              </span>
              {isLoading && (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {chatMode === 'agent' ? 'Agent working' : 'Streaming'}
                </span>
              )}
            </div>
          </footer>
            </>
          )}
        </>
      )}
    </aside>
  );
};
