import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Square,
  Edit2,
  Check,
  X,
  Bot,
  User as UserIcon,
  MessageSquare,
  Layers,
  ChevronDown,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AIMode, AIModeConfig, Conversation, Message, AIContextOptions, JournalEntry } from '../types';
import {
  getConversations,
  saveConversation,
  deleteConversation,
  getConversationMessages,
  saveMessage,
  getJournalEntries,
} from '../services/storageService';
import { streamGeminiChat } from '../services/geminiService';

const AI_MODES: AIModeConfig[] = [
  {
    id: 'reflect',
    label: 'Reflect',
    description: 'Mindful, empathetic mirror exploring emotions and values',
    iconName: 'Sparkles',
    tagline: 'Deep introspection',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Concise synthesis of thoughts and takeaways',
    iconName: 'FileText',
    tagline: 'Key points',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    description: 'Creative exploration and divergent possibilities',
    iconName: 'Lightbulb',
    tagline: 'Idea expansion',
  },
  {
    id: 'challenge',
    label: 'Challenge Me',
    description: 'Constructive devil’s advocate questioning hidden assumptions',
    iconName: 'ShieldAlert',
    tagline: 'Cognitive reframing',
  },
  {
    id: 'action_plan',
    label: 'Action Plan',
    description: 'Concrete, prioritized steps and milestone checklists',
    iconName: 'ListTodo',
    tagline: 'Practical steps',
  },
  {
    id: 'coach',
    label: 'Coach',
    description: 'Socratic inquiry guiding you to discover your own solutions',
    iconName: 'Target',
    tagline: 'Guided questions',
  },
  {
    id: 'find_patterns',
    label: 'Find Patterns',
    description: 'Identifies recurring themes across authorized journal history',
    iconName: 'BrainCircuit',
    tagline: 'Pattern analysis',
  },
];

export const ConversationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState<AIMode>('reflect');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Context Selection
  const [contextOptions, setContextOptions] = useState<AIContextOptions>({
    includeCurrentEntry: false,
    includeRecentEntries: true,
    includeOlderEntries: false,
    includeGoals: true,
    includeArchived: false,
  });
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load conversations & context data
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [convs, entries] = await Promise.all([
        getConversations(user.uid),
        getJournalEntries(user.uid),
      ]);
      setConversations(convs);
      setRecentEntries(entries);

      if (convs.length > 0) {
        setActiveConversationId(convs[0].id);
      } else {
        // Create initial conversation
        handleCreateNewConversation('reflect');
      }
    }
    loadData();
  }, [user]);

  // Load active conversation messages
  useEffect(() => {
    async function loadMessages() {
      if (!user || !activeConversationId) return;
      const msgs = await getConversationMessages(user.uid, activeConversationId);
      setMessages(msgs);
    }
    loadMessages();
  }, [user, activeConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleCreateNewConversation = async (mode: AIMode = selectedMode) => {
    if (!user) return;
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      userId: user.uid,
      title: `Reflection (${mode.replace('_', ' ')})`,
      mode,
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveConversation(user.uid, newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setSelectedMode(mode);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm('Delete this conversation thread?')) {
      await deleteConversation(user.uid, convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConversationId === convId) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          handleCreateNewConversation();
        }
      }
      showToast('Conversation deleted.', 'info');
    }
  };

  const handleClearChat = async () => {
    if (!user || !activeConversationId) return;
    if (window.confirm('Clear all messages in this conversation?')) {
      setMessages([]);
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv) {
        const updated = { ...conv, messageCount: 0, updatedAt: new Date().toISOString() };
        await saveConversation(user.uid, updated);
      }
      showToast('Conversation cleared.', 'info');
    }
  };

  // Construct context string based on user selector
  const buildContextString = (): string => {
    let contextParts: string[] = [];

    if (contextOptions.includeRecentEntries) {
      const recents = recentEntries.slice(0, 3);
      recents.forEach((e) => {
        contextParts.push(`Journal [${e.title}] (${new Date(e.createdAt).toLocaleDateString()}): ${e.aiSummary || e.content.slice(0, 200)}`);
      });
    }

    if (contextOptions.includeOlderEntries) {
      const older = recentEntries.slice(3, 8);
      older.forEach((e) => {
        contextParts.push(`Older Reflection [${e.title}]: ${e.aiSummary || e.content.slice(0, 150)}`);
      });
    }

    return contextParts.join('\n\n');
  };

  // Send message with streaming
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    if (!rawText.trim() || !user || !activeConversationId || isGenerating) return;

    const userMessageId = `msg_${Date.now()}`;
    const userMsg: Message = {
      id: userMessageId,
      conversationId: activeConversationId,
      userId: user.uid,
      role: 'user',
      content: rawText.trim(),
      mode: selectedMode,
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI append
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsGenerating(true);

    await saveMessage(user.uid, activeConversationId, userMsg);

    // Update conversation title if first message
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (currentConv && currentConv.messageCount === 0) {
      const summaryTitle = rawText.trim().slice(0, 35) + (rawText.trim().length > 35 ? '...' : '');
      const updatedConv = {
        ...currentConv,
        title: summaryTitle,
        messageCount: updatedMessages.length,
        lastMessageAt: new Date().toISOString(),
      };
      await saveConversation(user.uid, updatedConv);
      setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? updatedConv : c)));
    }

    // Prepare Model response placeholder
    const aiMessageId = `msg_${Date.now() + 1}`;
    const aiMsgPlaceholder: Message = {
      id: aiMessageId,
      conversationId: activeConversationId,
      userId: user.uid,
      role: 'model',
      content: '',
      mode: selectedMode,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiMsgPlaceholder]);

    // Setup AbortController for Stop Generation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    const contextText = buildContextString();

    await streamGeminiChat({
      messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      mode: selectedMode,
      contextText,
      signal: controller.signal,
      onChunk: (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMessageId ? { ...m, content: accumulatedText } : m))
        );
      },
      onDone: async () => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        if (accumulatedText.trim()) {
          const finalAiMsg: Message = {
            ...aiMsgPlaceholder,
            content: accumulatedText,
          };
          await saveMessage(user.uid, activeConversationId, finalAiMsg);
        }
      },
      onError: (errMsg) => {
        setIsGenerating(false);
        abortControllerRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: `Something went wrong while generating your reflection. Please try again.\n(${errMsg})`,
                }
              : m
          )
        );
        showToast('Error generating AI reflection response.', 'error');
      },
    });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      showToast('Generation stopped.', 'info');
    }
  };

  const handleRegenerateResponse = async () => {
    if (isGenerating || messages.length === 0) return;
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserIdx;
    const userMsg = messages[actualIdx];

    // Truncate messages to just before this AI response
    const trimmed = messages.slice(0, actualIdx + 1);
    setMessages(trimmed);

    // Re-send
    handleSendMessage(userMsg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!user || !activeConversationId || !editContent.trim()) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const updatedMsg: Message = {
      ...msg,
      content: editContent.trim(),
      isEdited: true,
    };

    setMessages((prev) => prev.map((m) => (m.id === msgId ? updatedMsg : m)));
    await saveMessage(user.uid, activeConversationId, updatedMsg);
    setEditingMessageId(null);
    setEditContent('');

    // If it was a user message, trigger regeneration from that point
    if (msg.role === 'user') {
      const idx = messages.findIndex((m) => m.id === msgId);
      const sliced = messages.slice(0, idx);
      setMessages(sliced);
      handleSendMessage(editContent.trim());
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] pb-8 animate-in fade-in duration-200">
      {/* Conversations Drawer / Sidebar List */}
      <div className="w-full lg:w-72 flex flex-col justify-between p-4 rounded-3xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 shrink-0">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/70 dark:border-stone-800">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Conversations
            </span>
            <button
              id="new-conversation-btn"
              onClick={() => handleCreateNewConversation()}
              className="p-1.5 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 transition-opacity"
              title="Start New Thread"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-[35vh] lg:max-h-[55vh] overflow-y-auto pr-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer text-xs transition-all group ${
                    isActive
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-xs'
                      : 'hover:bg-stone-200/70 dark:hover:bg-stone-800/70 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Context Summary Strip */}
        <div className="pt-3 border-t border-stone-200/70 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1 font-medium">
              <Layers className="w-3 h-3 text-amber-500" />
              <span>Context: {contextOptions.includeRecentEntries ? 'Recent 3' : 'Minimal'}</span>
            </span>
            <button
              onClick={() => setShowContextSelector(!showContextSelector)}
              className="hover:underline text-stone-700 dark:text-stone-300"
            >
              Adjust
            </button>
          </div>
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col justify-between rounded-3xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs">
        {/* Chat Header & Mode Selector */}
        <div className="p-4 border-b border-stone-200/80 dark:border-stone-800 space-y-3 bg-stone-100/60 dark:bg-stone-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {activeConv?.title || 'Gemini Reflection'}
                </h2>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Multi-turn mindful inquiry &bull; Mode: {selectedMode.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              >
                Clear Messages
              </button>
            </div>
          </div>

          {/* AI Mode Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {AI_MODES.map((mode) => {
              const isCurrent = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`mode-select-${mode.id}`}
                  onClick={() => setSelectedMode(mode.id)}
                  title={mode.description}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                      : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Context Selector Modal / Drawer */}
          {showContextSelector && (
            <div className="p-3 rounded-2xl bg-stone-200/70 dark:bg-stone-800/80 border border-stone-300/60 dark:border-stone-700 text-xs space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between font-semibold">
                <span>AI Context Inclusion Control (Privacy Protection)</span>
                <button onClick={() => setShowContextSelector(false)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextOptions.includeRecentEntries}
                    onChange={(e) =>
                      setContextOptions({ ...contextOptions, includeRecentEntries: e.target.checked })
                    }
                  />
                  <span>Recent reflections (3 items)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextOptions.includeOlderEntries}
                    onChange={(e) =>
                      setContextOptions({ ...contextOptions, includeOlderEntries: e.target.checked })
                    }
                  />
                  <span>Older reflections</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contextOptions.includeGoals}
                    onChange={(e) =>
                      setContextOptions({ ...contextOptions, includeGoals: e.target.checked })
                    }
                  />
                  <span>Active goals</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Messages Stream Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {messages.length === 0 ? (
            /* Empty State as mandated */
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                No conversations yet.
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm">
                Start a conversation with Gemini. Talk through whatever is on your mind.
              </p>

              {/* Sample starter chips */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
                <button
                  onClick={() => handleSendMessage("I've been feeling stuck with my career recently.")}
                  className="px-3 py-1.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-300/60 text-stone-700 dark:text-stone-300 text-xs text-left"
                >
                  "I've been feeling stuck with my career."
                </button>
                <button
                  onClick={() => handleSendMessage('How can I overcome creative procrastination?')}
                  className="px-3 py-1.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-300/60 text-stone-700 dark:text-stone-300 text-xs text-left"
                >
                  "How can I overcome creative procrastination?"
                </button>
                <button
                  onClick={() => handleSendMessage('Help me plan my priorities for the upcoming month.')}
                  className="px-3 py-1.5 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 hover:bg-stone-300/60 text-stone-700 dark:text-stone-300 text-xs text-left"
                >
                  "Help me plan my priorities for the month."
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isEditing = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-1.5 max-w-[85%] sm:max-w-[78%]">
                    <div
                      className={`p-4 rounded-3xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded-tr-xs'
                          : 'bg-stone-100 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 border border-stone-200/70 dark:border-stone-700/70 rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full text-xs p-2 rounded-xl bg-stone-800 text-stone-100 border border-stone-700 focus:outline-hidden"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-1 rounded-lg text-xs bg-stone-700 text-stone-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2 py-1 rounded-lg text-xs bg-amber-500 text-stone-950 font-semibold"
                            >
                              Save & Reflect
                            </button>
                          </div>
                        </div>
                      ) : (
                        msg.content || (
                          <span className="italic text-stone-400">Gemini is reflecting...</span>
                        )
                      )}
                    </div>

                    {/* Message Actions */}
                    {!isEditing && (
                      <div
                        className={`flex items-center gap-2 text-[10px] text-stone-400 px-1 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.isEdited && <span>(edited)</span>}

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            showToast('Copied to clipboard', 'info');
                          }}
                          className="hover:text-stone-600 dark:hover:text-stone-200"
                          title="Copy text"
                        >
                          <Copy className="w-3 h-3" />
                        </button>

                        {isUser && (
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditContent(msg.content);
                            }}
                            className="hover:text-stone-600 dark:hover:text-stone-200"
                            title="Edit message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300 shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Generating Status Pill */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 animate-pulse pl-11">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini is reflecting...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Controls */}
        <div className="p-4 bg-stone-100/60 dark:bg-stone-900/90 border-t border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <button
                  id="stop-generation-btn"
                  onClick={handleStopGeneration}
                  className="px-3 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Generation</span>
                </button>
              ) : (
                messages.length > 0 && (
                  <button
                    id="regenerate-response-btn"
                    onClick={handleRegenerateResponse}
                    className="px-2.5 py-1 rounded-xl text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 text-xs flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )
              )}
            </div>

            <span className="text-[11px] text-stone-400">
              Reflections are private & non-diagnostic.
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              id="gemini-chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask Gemini to ${selectedMode.replace('_', ' ')} or explore your thoughts...`}
              rows={2}
              className="flex-1 text-sm p-3 rounded-2xl bg-stone-200/60 dark:bg-stone-950 border border-stone-300/70 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-hidden focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-600 resize-none"
            />

            <button
              id="send-chat-message-btn"
              type="submit"
              disabled={!inputMessage.trim() || isGenerating}
              className="p-3.5 rounded-2xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
