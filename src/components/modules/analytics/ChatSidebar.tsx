import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Clipboard,
  FileText,
  History,
  Loader2,
  Mic,
  MoreHorizontal,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { ChatVisualization, type VisualizationData } from './ChatVisualization';
import { useApp } from '../../../context/AppContext';
import { API_BASE, authFetch } from '../../../lib/api';
import { API_ROUTES } from '../../../lib/apiRoutes';
import { humanizeAgentStep, sanitizeUserFacingText } from '../../../lib/humanizeAgentStep';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  inlineData?: string;
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
  domain?: string;
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
  mode?: ChatMode;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

interface ConversationSummary {
  id: string;
  title: string;
  mode?: ChatMode;
  updatedAt: Date;
  lastMessage: string;
  questionCount: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type AnalyticsResponse = {
  answer?: string;
  visualizations?: VisualizationData[];
  visualizationConfig?: unknown;
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

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const WELCOME_MESSAGE_PREFIX = 'Hi, I can analyze live shop sales';

const MODE_START_CONTENT: Record<ChatMode, { title: string; prompts: string[] }> = {
  lite: {
    title: 'Ask CeyPOS Analytics',
    prompts: [
      'Show today revenue and order count',
      'What was my best selling product this week?',
      'Summarize yesterday sales',
      'How many unique customers ordered this month?',
    ],
  },
  agent: {
    title: 'CeyPOS Agent',
    prompts: [
      'Find slow moving inventory and suggest restocks',
      'Compare sales by payment method this month',
      'Which products need restocking?',
      'Analyze customer purchase patterns and trends',
    ],
  },
};

const CHART_COMMANDS = [
  ['@barchart', 'Bar'], ['@stackedbar', 'Stacked bar'], ['@columnchart', 'Column'],
  ['@stackedcolumn', 'Stacked column'], ['@linechart', 'Line'], ['@areachart', 'Area'],
  ['@stackedarea', 'Stacked area'], ['@combochart', 'Combo'], ['@piechart', 'Pie'],
  ['@donutchart', 'Donut'], ['@scatterplot', 'Scatter'], ['@bubblechart', 'Bubble'],
  ['@radarchart', 'Radar'], ['@funnelchart', 'Funnel'], ['@waterfallchart', 'Waterfall'],
  ['@treemap', 'Treemap'], ['@gauge', 'Gauge'], ['@kpi', 'KPI'], ['@table', 'Table'],
  ['@heatmap', 'Heatmap'],
] as const;

const inferConversationMode = (conversation: Conversation | ConversationSummary): ChatMode => {
  if (conversation.mode === 'agent') return 'agent';
  if ('messages' in conversation && conversation.messages?.length) {
    const userMessage = conversation.messages.find((message) => message.sender === 'user');
    if (userMessage?.metadata?.mode === 'agent') return 'agent';
  }
  return 'lite';
};

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
            <pre key={index} className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-gray-900 bg-gray-950 p-3 text-xs text-white">
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

const formatElapsed = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const getVisibleAgentSteps = (steps: AgentStep[]) =>
  steps.filter((step) => step.type === 'tool');

const CodexStepLine: React.FC<{ step: AgentStep; isLive: boolean }> = ({ step, isLive }) => {
  const Icon = step.status === 'error' ? AlertCircle : Terminal;
  const isRunning = step.status === 'running';
  const humanized = humanizeAgentStep(step);

  return (
    <div
      className={`chat-step-enter flex min-w-0 items-start gap-2 py-0.5 text-[13px] leading-5 ${
        isRunning && isLive ? 'chat-step-running' : ''
      }`}
    >
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
          step.status === 'error'
            ? 'text-rose-500'
            : isRunning && isLive
              ? 'text-gray-600'
              : 'text-gray-400'
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
            {humanized.domain}
          </span>
          <span
            className={`break-words [overflow-wrap:anywhere] ${
              isRunning && isLive
                ? 'text-gray-600'
                : step.status === 'error'
                  ? 'text-rose-600'
                  : 'text-gray-400'
            }`}
          >
            {humanized.message}
          </span>
        </div>
      </div>
    </div>
  );
};

const CodexAgentTimeline: React.FC<{
  steps: AgentStep[];
  isLive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ steps, isLive, isExpanded, onToggle }) => {
  const visibleSteps = getVisibleAgentSteps(steps);
  if (!visibleSteps.length) return null;

  if (isLive || isExpanded) {
    return (
      <div className="w-full space-y-1">
        {!isLive && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[12px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
            Hide {visibleSteps.length} steps
          </button>
        )}
        <div className="space-y-0.5">
          {visibleSteps.map((step) => (
            <CodexStepLine key={step.id} step={step} isLive={isLive} />
          ))}
        </div>
      </div>
    );
  }

  const latestStep = visibleSteps[visibleSteps.length - 1];
  const latestLabel = latestStep ? humanizeAgentStep(latestStep).message : `${visibleSteps.length} steps`;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-[12px] text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
    >
      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Show {visibleSteps.length} steps · {latestLabel}
      </span>
    </button>
  );
};

const WorkingStatus: React.FC<{ elapsedSeconds: number }> = ({ elapsedSeconds }) => (
  <div className="space-y-2">
    <p className="text-[13px] text-gray-500">
      Working for{' '}
      <span className={elapsedSeconds < 2 ? 'chat-working-shimmer font-medium' : 'font-medium text-gray-600'}>
        {formatElapsed(elapsedSeconds)}
      </span>
    </p>
    <div className="h-px w-full bg-gray-200" />
  </div>
);

const ThinkingIndicator: React.FC = () => (
  <div className="flex items-center gap-2 py-1 text-[13px] text-gray-500">
    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
    <span className="chat-working-shimmer">Thinking</span>
  </div>
);

const StartSurface: React.FC<{
  mode: ChatMode;
  onPickPrompt: (prompt: string) => void;
}> = ({ mode, onPickPrompt }) => {
  const content = MODE_START_CONTENT[mode];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center py-8 text-center">
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="px-2 text-sm font-semibold text-gray-950">{content.title}</h3>
      </div>

      <div className="grid w-full gap-2">
        {content.prompts.map((prompt) => (
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
};

const getConversationPreview = (conversation: Conversation | ConversationSummary) => {
  if ('messages' in conversation && conversation.messages?.length) {
    const last = [...conversation.messages].reverse().find((message) => message.message.trim());
    if (last?.message) return last.message.trim();
  }
  return conversation.lastMessage?.trim() ?? '';
};

const normalizeMessage = (message: Message): Message => ({
  ...message,
  timestamp: new Date(message.timestamp),
});

const normalizeConversation = (conversation: Conversation): Conversation => ({
  ...conversation,
  createdAt: new Date(conversation.createdAt),
  updatedAt: new Date(conversation.updatedAt),
  messages: conversation.messages.map(normalizeMessage),
  mode: inferConversationMode(conversation),
});

const normalizeSummary = (conversation: ConversationSummary): ConversationSummary => ({
  ...conversation,
  updatedAt: new Date(conversation.updatedAt),
  questionCount: Number(conversation.questionCount ?? 0),
  lastMessage: conversation.lastMessage ?? '',
  mode: inferConversationMode(conversation),
});

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const { activeShopId, currentUser } = useApp();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('lite');
  const [isListening, setIsListening] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [workingElapsed, setWorkingElapsed] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [expandedStepMessageIds, setExpandedStepMessageIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamStartRef = useRef<number | null>(null);
  const modeDropdownRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const userEmail = currentUser?.email ?? '';

  const normalizedShopId = useMemo(() => {
    if (!activeShopId) return null;
    return String(activeShopId).replace(/^shop_/, '').replace(/\.db$/i, '');
  }, [activeShopId]);

  const requestRecentChats = useCallback(async () => {
    const response = await authFetch(
      `${API_BASE}${API_ROUTES.analytics.chatsForShop(normalizedShopId ?? '', userEmail)}`
    );
    if (!response.ok) {
      throw new Error('Failed to load recent chats');
    }
    const data = (await response.json()) as { conversations?: ConversationSummary[] };
    return (data.conversations ?? []).map(normalizeSummary);
  }, [normalizedShopId, userEmail]);

  const requestConversation = useCallback(async (conversationId: string) => {
    const response = await authFetch(
      `${API_BASE}${API_ROUTES.analytics.conversationForShop(
        conversationId,
        normalizedShopId ?? '',
        userEmail,
      )}`
    );
    if (!response.ok) {
      throw new Error('Failed to load chat');
    }
    const data = (await response.json()) as { conversation: Conversation };
    return normalizeConversation(data.conversation);
  }, [normalizedShopId, userEmail]);

  const requestNewChat = useCallback(async (mode: ChatMode = 'lite') => {
    const response = await authFetch(`${API_BASE}${API_ROUTES.analytics.chats}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: normalizedShopId, userEmail, mode }),
    });
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    const data = (await response.json()) as { conversation: Conversation };
    return normalizeConversation(data.conversation);
  }, [normalizedShopId, userEmail]);

  const requestDeleteChat = useCallback(async (conversationId: string) => {
    const response = await authFetch(
      `${API_BASE}${API_ROUTES.analytics.conversationForShop(
        conversationId,
        normalizedShopId ?? '',
        userEmail,
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

  const liteConversations = useMemo(
    () => filteredConversations.filter((conversation) => inferConversationMode(conversation) === 'lite'),
    [filteredConversations],
  );

  const agentConversations = useMemo(
    () => filteredConversations.filter((conversation) => inferConversationMode(conversation) === 'agent'),
    [filteredConversations],
  );

  const syncConversationPreview = useCallback(
    (conversationId: string, preview: string, updatedAt = new Date()) => {
      const trimmedPreview = preview.trim();
      if (!conversationId || !trimmedPreview) return;
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, lastMessage: trimmedPreview, updatedAt }
            : conversation,
        ),
      );
    },
    [],
  );

  const toggleStepExpand = useCallback((messageId: string) => {
    setExpandedStepMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);
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
            lastMessage: message.message.trim() ? message.message : conversation.lastMessage,
            questionCount:
              message.sender === 'user' ? conversation.questionCount + 1 : conversation.questionCount,
            updatedAt: new Date(),
            mode: conversation.mode ?? chatMode,
          };
        }),
      );
    },
    [activeConversationId, updateActiveConversation, chatMode],
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

      if (patch.message?.trim()) {
        syncConversationPreview(targetId, patch.message);
      }
    },
    [activeConversationId, syncConversationPreview, updateActiveConversation],
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
    const lastMessage = getConversationPreview(conversation);
    const questionCount = conversation.messages.filter((message) => message.sender === 'user').length;
    return {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      lastMessage,
      questionCount,
      mode: inferConversationMode(conversation),
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
          const conversation = await requestNewChat('lite');
          if (cancelled) return;
          setChatMode('lite');
          setConversations([buildSummaryFromConversation(conversation)]);
          setActiveConversation(conversation);
          setActiveConversationId(conversation.id);
          setShowRecent(false);
          return;
        }

        setConversations(recent);
        const preferred = recent.find((conversation) => inferConversationMode(conversation) === 'lite') ?? recent[0];
        const conversation = await requestConversation(preferred.id);
        if (cancelled) return;
        setChatMode(inferConversationMode(conversation));
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
    if (!showRecent || !normalizedShopId || !userEmail) return;
    let cancelled = false;
    requestRecentChats()
      .then((recent) => {
        if (!cancelled) setConversations(recent);
      })
      .catch((error) => {
        console.warn('Failed to refresh recent chats', error);
      });
    return () => {
      cancelled = true;
    };
  }, [showRecent, normalizedShopId, requestRecentChats, userEmail]);

  useEffect(() => {
    if (!showModeDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModeDropdown]);

  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages, autoScroll, isLoading, workingElapsed]);

  useEffect(() => {
    if (!isLoading) {
      streamStartRef.current = null;
      setWorkingElapsed(0);
      setIsThinking(false);
      return;
    }

    streamStartRef.current = Date.now();
    setWorkingElapsed(0);
    const interval = window.setInterval(() => {
      if (streamStartRef.current) {
        setWorkingElapsed(Math.floor((Date.now() - streamStartRef.current) / 1000));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isLoading]);

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
    requestNewChat(chatMode)
      .then((conversation) => {
        const summary = buildSummaryFromConversation(conversation);
        setConversations((prev) => [summary, ...prev.filter((item) => item.id !== summary.id)].slice(0, 6));
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
        setChatInput('');
        setAttachments([]);
        setAutoScroll(true);
        focusInput();
      })
      .catch((error) => {
        console.warn('Failed to create chat', error);
      });
  };

  const handleChangeChatMode = (nextMode: ChatMode, initialInput = '') => {
    setShowModeDropdown(false);
    if (nextMode === chatMode || !normalizedShopId || !userEmail) return;

    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
    }

    setChatMode(nextMode);
    requestNewChat(nextMode)
      .then((conversation) => {
        const summary = buildSummaryFromConversation(conversation);
        setConversations((prev) => [summary, ...prev.filter((item) => item.id !== summary.id)].slice(0, 6));
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
        setChatInput(initialInput);
        setAttachments([]);
        setAutoScroll(true);
        focusInput();
      })
      .catch((error) => {
        console.warn('Failed to start chat for mode', error);
      });
  };

  const handleOpenConversation = (conversationId: string) => {
    if (!normalizedShopId || !userEmail) return;
    requestConversation(conversationId)
      .then((conversation) => {
        const mode = inferConversationMode(conversation);
        setChatMode(mode);
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
      let inlineData: string | undefined;
      if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        preview = (await file.text()).slice(0, 4000);
      } else if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/') || file.type === 'application/pdf') {
        inlineData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
          reader.onerror = () => reject(reader.error || new Error('Could not read attachment'));
          reader.readAsDataURL(file);
        });
      }
      nextAttachments.push({
        id: createId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        preview,
        inlineData,
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

    const response = await authFetch(
      `${API_BASE}${API_ROUTES.analytics.conversationMessagesStream(conversationId)}`,
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        shopId: normalizedShopId,
        userEmail,
        attachments: sentAttachments.map(({ name, size, type, preview, inlineData }) => ({ name, size, type, preview, inlineData })),
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
        setIsThinking(false);
        appendToMessage(aiMessageId, payload.delta, conversationId);
      }

      if (eventName === 'status') {
        setIsThinking(true);
      }

      if (eventName === 'step' && payload.step) {
        setIsThinking(false);
        appendAgentStep(aiMessageId, payload.step, conversationId);
      }

      if (eventName === 'done') {
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
        setExpandedStepMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(aiMessageId);
          return next;
        });
        syncConversationPreview(
          conversationId,
          payload.answer || 'Sorry, I could not generate a response.',
          payload.conversation?.updatedAt ? new Date(payload.conversation.updatedAt) : new Date(),
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
        const conversation = await requestNewChat(chatMode);
        const summary = buildSummaryFromConversation(conversation);
        setConversations((prev) => [summary, ...prev.filter((item) => item.id !== summary.id)].slice(0, 6));
        setActiveConversation(conversation);
        setActiveConversationId(conversation.id);
        setShowRecent(false);
        setChatInput('');
        setAttachments([]);
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
      className={`relative isolate flex h-full min-w-0 shrink-0 flex-col overflow-visible border-l border-gray-200 bg-white shadow-sm transition-[width] duration-300 ${
        isOpen ? 'w-full md:w-[440px] lg:w-[480px] xl:w-[520px]' : 'w-[52px]'
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="absolute -left-4 top-1/2 z-[60] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#c5f542] text-gray-950 shadow-sm transition hover:brightness-95 pointer-events-auto"
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {showRecent ? (
                  <button
                    type="button"
                    onClick={() => setShowRecent(false)}
                    className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                    title="Back to chat"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-950">
                    {showRecent ? 'Recent chats' : activeConversation?.title ?? 'AI Analytics'}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {showRecent ? 'Lite and agent chats for this shop' : (currentUser?.email ?? 'Shop assistant')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {!showRecent && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRecent(true)}
                      className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                      title="Recent chats"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                      title="New chat"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          {showRecent ? (
            <div className="flex-1 overflow-y-auto bg-white px-4 py-5">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-950">Recent chats</h3>
                <p className="text-xs text-gray-500">Grouped by chat mode for this shop.</p>
              </div>

              {([
                { key: 'lite' as const, label: 'Lite mode', items: liteConversations },
                { key: 'agent' as const, label: 'Agent mode', items: agentConversations },
              ]).map((section) => (
                <div key={section.key} className="mb-6 last:mb-0">
                  <div className="mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {section.label}
                    </h4>
                  </div>

                  {section.items.length === 0 ? (
                    <p className="rounded-md border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-500">
                      No {section.key} chats yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {section.items.map((conversation) => {
                        const preview = getConversationPreview(conversation);
                        const previewText = preview ? sanitizeUserFacingText(preview) : '';
                        const isActive = conversation.id === activeConversation?.id;
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
                              isActive
                                ? 'border-gray-300 bg-gray-100'
                                : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold leading-5 text-gray-950">
                                  {conversation.title}
                                </p>
                          <p className="mt-0.5 line-clamp-1 text-[12px] leading-5 text-gray-600">
                            {previewText || 'No messages yet'}
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
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
          <div ref={scrollAreaRef} onScroll={handleScroll} className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white px-4 py-5">
            <div className="space-y-3">
              {!(activeConversation?.messages ?? []).some((message) => message.sender === 'user') && (
                <StartSurface mode={chatMode} onPickPrompt={handlePickPrompt} />
              )}
              {activeConversation?.messages.map((message) => {
                if (isWelcomeMessage(message)) return null;
                const isUser = message.sender === 'user';
                const isAgentMessage = !isUser && message.metadata?.mode === 'agent';
                const agentSteps = message.metadata?.agentSteps ?? [];
                const hasAgentSteps = !isUser && agentSteps.length > 0;
                const isStreaming = message.status === 'streaming';
                const isLiveAgentStream = isStreaming && isAgentMessage && isLoading;
                const showWorkingStatus = isLiveAgentStream && (workingElapsed > 0 || isThinking || hasAgentSteps);
                const showThinkingOnly =
                  isStreaming && !message.message && !hasAgentSteps && (isThinking || chatMode === 'agent');

                if (isUser) {
                  return (
                    <div key={message.id} className="group flex justify-end">
                      <div className="flex max-w-[92%] flex-col items-end gap-1.5">
                        <div
                          className="rounded-2xl border border-gray-200/80 bg-gray-100 px-4 py-3 text-sm leading-6 text-gray-950 shadow-sm break-words [overflow-wrap:anywhere]"
                          style={{ backgroundColor: '#f3f4f6' }}
                        >
                          <MarkdownMessage text={sanitizeUserFacingText(message.message)} />
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 grid gap-2">
                              {message.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex min-w-0 items-center gap-2 rounded-md border border-gray-300/60 bg-white/80 px-2 py-1.5 text-xs"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="truncate">{attachment.name}</span>
                                  <span className="ml-auto text-gray-500">{formatBytes(attachment.size)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(message)}
                            className="rounded p-1 hover:bg-gray-200"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Clipboard className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="group flex justify-start">
                    <div className="flex w-full max-w-full flex-col items-start gap-2">
                      {showWorkingStatus && <WorkingStatus elapsedSeconds={workingElapsed} />}

                      {hasAgentSteps && (
                        <CodexAgentTimeline
                          steps={agentSteps}
                          isLive={isLiveAgentStream}
                          isExpanded={expandedStepMessageIds.has(message.id)}
                          onToggle={() => toggleStepExpand(message.id)}
                        />
                      )}

                      {showThinkingOnly && <ThinkingIndicator />}

                      {message.message ? (
                        <div
                          className={`w-full text-sm leading-6 text-gray-950 break-words [overflow-wrap:anywhere] ${
                            message.status === 'error' ? 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2' : ''
                          }`}
                        >
                          <MarkdownMessage text={sanitizeUserFacingText(message.message)} />
                        </div>
                      ) : isStreaming && !hasAgentSteps && !showThinkingOnly ? (
                        <ThinkingIndicator />
                      ) : null}

                      {message.visualizations && message.visualizations.length > 0 && (
                        <div className="w-full space-y-2">
                          {message.visualizations.map((visualization, index) => (
                            <ChatVisualization key={`${message.id}-${index}`} visualization={visualization} />
                          ))}
                        </div>
                      )}

                      {!isStreaming && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(message)}
                            className="rounded p-1 hover:bg-gray-200"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Clipboard className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button type="button" className="rounded p-1 hover:bg-gray-200" title="More actions">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
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

          <footer className="border-t border-gray-200 bg-white p-3">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
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

            <div className="relative rounded-2xl border border-gray-300 bg-white shadow-sm focus-within:border-gray-400">
              {chatMode === 'agent' && /^@[^\s]*$/.test(chatInput) && (
                <div className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                  <div className="px-2 py-1.5"><p className="text-xs font-semibold text-gray-900">Insert a visualization</p><p className="text-[11px] text-gray-500">Choose a chart, then describe the data you want.</p></div>
                  <div className="grid grid-cols-2 gap-1">
                    {CHART_COMMANDS.filter(([command]) => command.startsWith(chatInput.toLowerCase())).map(([command, chartLabel]) => (
                      <button key={command} type="button" onClick={() => { setChatInput(`${command} `); focusInput(); }} className="rounded-lg px-2 py-2 text-left hover:bg-blue-50">
                        <span className="block text-xs font-medium text-gray-900">{chartLabel}</span><span className="block text-[10px] text-blue-600">{command}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                ref={inputRef}
                placeholder={
                  chatMode === 'agent'
                    ? isLoading
                      ? 'Ask for follow-up changes'
                      : 'Ask Agent to analyze, calculate, and use tools'
                    : 'Ask a quick analytics question'
                }
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="max-h-40 min-h-[52px] w-full resize-none rounded-t-2xl border-0 bg-transparent px-3.5 py-3 text-sm text-gray-950 outline-none placeholder:text-gray-400 disabled:opacity-70"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-2 py-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,application/pdf,text/*,.csv,.json" className="hidden" onChange={handleFilesSelected} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
                    title="Add images, documents, audio, video, or data files"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <div className="relative" ref={modeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowModeDropdown((value) => !value)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 text-[12px] font-medium text-gray-700 hover:bg-gray-100"
                      title="Select chat mode"
                    >
                      {chatMode === 'agent' ? 'Agent' : 'Lite'}
                      <ChevronDown className={`h-3 w-3 transition ${showModeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showModeDropdown && (
                      <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[148px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleChangeChatMode('lite')}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-gray-50 ${
                            chatMode === 'lite' ? 'font-medium text-gray-950' : 'text-gray-600'
                          }`}
                        >
                          Lite
                          {chatMode === 'lite' && <Check className="ml-auto h-3.5 w-3.5 text-gray-700" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeChatMode('agent')}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-gray-50 ${
                            chatMode === 'agent' ? 'font-medium text-gray-950' : 'text-gray-600'
                          }`}
                        >
                          Agent
                          {chatMode === 'agent' && <Check className="ml-auto h-3.5 w-3.5 text-gray-700" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => { if (chatMode !== 'agent') handleChangeChatMode('agent', '@'); else setChatInput('@'); focusInput(); }} className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-gray-600 hover:bg-gray-100" title="Insert visualization command">
                    @ Chart
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                      isListening ? 'bg-[#c5f542] text-gray-950' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={isListening ? 'Stop voice typing' : 'Voice typing'}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  {activeConversation && activeConversation.messages.length > 1 && !isLoading && (
                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(activeConversation.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete current chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isLoading ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition hover:bg-gray-800"
                      title="Stop response"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || !normalizedShopId}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#c5f542] text-gray-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {isLoading && (
              <div className="mt-2 flex items-center justify-end text-[11px] text-gray-500">
                <span className="flex items-center gap-1 text-gray-600">
                  {chatMode === 'agent' ? (
                    <>
                      Working for <span className="font-medium">{formatElapsed(workingElapsed)}</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Streaming
                    </>
                  )}
                </span>
              </div>
            )}
          </footer>
            </>
          )}
        </>
      )}
    </aside>
  );
};
