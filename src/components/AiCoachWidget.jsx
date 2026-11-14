import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  Send,
  Plus,
  History,
  Brain,
  Trash2,
  CheckCircle2,
  Calendar,
  Wrench,
  Sparkles,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../api';

const QUICK_PROMPTS = [
  'Analyze my recent progress',
  'Build a new weekly workout schedule',
  "Edit my current week's schedule"
];

export default function AiCoachWidget() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history' | 'memories'
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [memories, setMemories] = useState([]);
  const [mcpKeyStatus, setMcpKeyStatus] = useState({ hasKey: false, keyPrefix: null });
  const [generatedRawKey, setGeneratedRawKey] = useState(null);
  const [mcpKeyLoading, setMcpKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingMsgId, setApplyingMsgId] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      aiAPI.getConversations().then(setConversations).catch(() => {});
      aiAPI.getMemories().then(setMemories).catch(() => {});
      aiAPI.getMcpKeyStatus().then((status) => {
        if (status) setMcpKeyStatus(status);
      }).catch(() => {});
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  if (!isAuthenticated) {
    return null;
  }

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setErrorBanner('');
    setActiveTab('chat');
  };

  const handleSelectConversation = async (id) => {
    try {
      setLoading(true);
      const data = await aiAPI.getConversation(id);
      setConversationId(data.id);
      setMessages(data.messages || []);
      setActiveTab('chat');
    } catch {
      setErrorBanner('Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await aiAPI.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        handleNewChat();
      }
    } catch {
      setErrorBanner('Failed to delete conversation.');
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await aiAPI.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setErrorBanner('Failed to delete memory item.');
    }
  };

  const handleGenerateMcpKey = async () => {
    setMcpKeyLoading(true);
    setErrorBanner('');
    try {
      const data = await aiAPI.generateMcpKey();
      setGeneratedRawKey(data.apiKey);
      setMcpKeyStatus({
        hasKey: true,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt
      });
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Failed to generate MCP key.');
    } finally {
      setMcpKeyLoading(false);
    }
  };

  const handleRevokeMcpKey = async () => {
    setMcpKeyLoading(true);
    setErrorBanner('');
    try {
      await aiAPI.revokeMcpKey();
      setMcpKeyStatus({ hasKey: false, keyPrefix: null });
      setGeneratedRawKey(null);
    } catch (err) {
      setErrorBanner(err.response?.data?.message || 'Failed to revoke MCP key.');
    } finally {
      setMcpKeyLoading(false);
    }
  };

  const handleCopyKey = async () => {
    if (!generatedRawKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedRawKey);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const sendMessage = async (textToSend) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || loading) return;

    setErrorBanner('');
    setInput('');
    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text: trimmed
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setLoading(true);

    try {
      const data = await aiAPI.chat({
        conversationId,
        message: trimmed
      });
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        data.userMessage,
        data.assistantMessage
      ]);
      if (data.memoriesUpdated) {
        aiAPI.getMemories().then(setMemories).catch(() => {});
      }
      aiAPI.getConversations().then(setConversations).catch(() => {});
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
      setErrorBanner(
        err.response?.data?.message || 'Unable to reach AI Coach right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleApplyPlan = async (msgId, action = 'activate_schedule') => {
    if (!conversationId || applyingMsgId) return;
    setApplyingMsgId(msgId);
    setErrorBanner('');
    try {
      const result = await aiAPI.applyPlan(conversationId, msgId, action);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.draftPlan
            ? {
                ...m,
                draftPlan: {
                  ...m.draftPlan,
                  appliedPlanId: result.planId,
                  appliedScheduleId: result.scheduleId,
                  appliedAt: new Date().toISOString()
                }
              }
            : m
        )
      );
    } catch (err) {
      setErrorBanner(
        err.response?.data?.message || 'Failed to apply schedule changes.'
      );
    } finally {
      setApplyingMsgId(null);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          aria-label="Open AI Coach"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl font-bold text-sm transition-transform hover:scale-105"
          style={{
            backgroundColor: '#CCFF00',
            color: '#0A0A0A',
            boxShadow: '0 0 24px rgba(204, 255, 0, 0.35)'
          }}
        >
          <Bot size={20} />
          <span>AI Coach</span>
        </button>
      ) : (
        <div
          className="w-[92vw] sm:w-[420px] h-[600px] max-h-[82vh] rounded-2xl flex flex-col overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: '#111111',
            borderColor: '#262626',
            color: '#F5F5F5'
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between border-b"
            style={{ backgroundColor: '#161616', borderColor: '#262626' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#CCFF00', color: '#000' }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">FitTrack AI Coach</div>
                <div className="text-[11px] text-gray-400">MCP Powered • Grounded</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                title="New Chat"
                onClick={handleNewChat}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-gray-300"
              >
                <Plus size={16} />
              </button>
              <button
                title="Conversation History"
                onClick={() =>
                  setActiveTab(activeTab === 'history' ? 'chat' : 'history')
                }
                className={`p-1.5 rounded-lg hover:bg-neutral-800 ${
                  activeTab === 'history' ? 'text-[#CCFF00]' : 'text-gray-300'
                }`}
              >
                <History size={16} />
              </button>
              <button
                title="Saved Fitness Memories"
                onClick={() =>
                  setActiveTab(activeTab === 'memories' ? 'chat' : 'memories')
                }
                className={`p-1.5 rounded-lg hover:bg-neutral-800 ${
                  activeTab === 'memories' ? 'text-[#CCFF00]' : 'text-gray-300'
                }`}
              >
                <Brain size={16} />
              </button>
              <button
                aria-label="Close AI Coach"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {errorBanner && (
            <div className="px-3 py-2 text-xs bg-red-950/80 text-red-200 border-b border-red-800">
              {errorBanner}
            </div>
          )}

          {/* Tab Body */}
          {activeTab === 'history' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Past Conversations
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-500">No conversations yet.</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-medium text-white truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {c.messageCount} messages
                      </div>
                    </div>
                    <button
                      aria-label={`Delete conversation ${c.title}`}
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'memories' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* MCP Personal Access Key Card */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Key size={14} className="text-[#CCFF00]" />
                    <span>MCP Access Key</span>
                  </div>
                  {mcpKeyStatus.hasKey ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-950 text-green-400 border border-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-neutral-800 text-gray-400">
                      No Key
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Connect your FitTrack data to external MCP tools (Claude Desktop, Cursor, AI agents).
                </p>

                {generatedRawKey ? (
                  <div className="p-2.5 rounded-lg bg-black/60 border border-[#CCFF00]/40 space-y-2">
                    <div className="text-[11px] text-[#CCFF00] font-semibold">
                      New Key Generated (copy now, it won't be shown again):
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-gray-200 truncate select-all flex-1 bg-neutral-950 p-1.5 rounded border border-neutral-800">
                        {generatedRawKey}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        aria-label="Copy MCP Key"
                        className="px-2.5 py-1.5 text-xs rounded font-bold flex items-center gap-1 shrink-0"
                        style={{ backgroundColor: '#CCFF00', color: '#000' }}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ) : mcpKeyStatus.hasKey ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono text-gray-300">
                      {mcpKeyStatus.keyPrefix}
                    </span>
                    <button
                      type="button"
                      disabled={mcpKeyLoading}
                      onClick={handleRevokeMcpKey}
                      className="px-2.5 py-1 text-xs rounded border border-red-800/80 text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                    >
                      {mcpKeyLoading ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={mcpKeyLoading}
                    onClick={handleGenerateMcpKey}
                    className="w-full py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#CCFF00', color: '#000' }}
                  >
                    {mcpKeyLoading ? 'Generating...' : 'Generate MCP Key'}
                  </button>
                )}
              </div>

              {/* Coach Memories List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Coach Memory ({memories.length}/25)
                </div>
                {memories.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No saved memories yet. Share your goals, schedule, equipment, or injuries in chat!
                  </p>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span
                          className="inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mr-1.5"
                          style={{ backgroundColor: '#CCFF00', color: '#000' }}
                        >
                          {m.category}
                        </span>
                        <span className="text-xs font-semibold text-gray-300">
                          {m.key}:
                        </span>
                        <p className="text-xs text-gray-200 mt-1">{m.value}</p>
                      </div>
                      <button
                        aria-label={`Delete memory ${m.key}`}
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && !loading && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
                        <Sparkles size={14} className="text-[#CCFF00]" />
                        <span>How can I help your training today?</span>
                      </div>
                      Ask me to analyze your workout history, build a new weekly schedule, or adjust your current week&apos;s schedule.
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="text-left text-xs px-3 py-1.5 rounded-full border border-neutral-700 hover:border-[#CCFF00] text-gray-200 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-[#CCFF00] text-black font-medium'
                          : 'bg-neutral-900 text-gray-100 border border-neutral-800'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Tool Trace Badges */}
                    {msg.role === 'assistant' &&
                      Array.isArray(msg.toolTrace) &&
                      msg.toolTrace.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {msg.toolTrace.map((trace, i) => (
                            <span
                              key={`${msg.id}-trace-${i}`}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-gray-400"
                            >
                              <Wrench size={10} className="text-[#CCFF00]" />
                              <span>{trace.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Draft Plan / Schedule Preview Card */}
                    {msg.role === 'assistant' && msg.draftPlan?.plan && (
                      <div className="w-full mt-2 p-3 rounded-xl bg-neutral-900 border border-[#CCFF00]/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#CCFF00', color: '#000' }}
                          >
                            {msg.draftPlan.mode === 'edit_schedule'
                              ? 'Edit Active Schedule'
                              : 'New Weekly Schedule'}
                          </span>
                          <Calendar size={14} className="text-[#CCFF00]" />
                        </div>

                        <div>
                          <div className="text-sm font-bold text-white">
                            {msg.draftPlan.plan.name}
                          </div>
                          {msg.draftPlan.plan.description && (
                            <div className="text-[11px] text-gray-400">
                              {msg.draftPlan.plan.description}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {(msg.draftPlan.plan.days || []).map((d) => (
                            <div
                              key={d.dayOfWeek}
                              className="text-[11px] flex items-center justify-between py-1 border-b border-neutral-800"
                            >
                              <span className="font-semibold text-gray-300">
                                {d.dayName}
                              </span>
                              {d.isRestDay ? (
                                <span className="text-gray-500">Rest Day</span>
                              ) : (
                                <span className="text-[#CCFF00] truncate max-w-[180px]">
                                  {d.workout?.name} ({d.workout?.exercises?.length || 0} ex)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {msg.draftPlan.appliedAt ? (
                          <div className="flex items-center justify-between pt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-[#CCFF00] font-semibold">
                              <CheckCircle2 size={14} />
                              <span>
                                {msg.draftPlan.appliedScheduleId
                                  ? 'Applied to Schedule'
                                  : 'Saved to Plan Library'}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  msg.draftPlan.appliedScheduleId
                                    ? '/weekly-schedule'
                                    : '/weekly-plan-library'
                                )
                              }
                              className="text-xs underline text-gray-200 hover:text-[#CCFF00]"
                            >
                              {msg.draftPlan.appliedScheduleId
                                ? 'View Weekly Schedule'
                                : 'View Plan Library'}
                            </button>
                          </div>
                        ) : msg.draftPlan.mode === 'edit_schedule' ? (
                          <button
                            type="button"
                            disabled={applyingMsgId === msg.id}
                            onClick={() => handleApplyPlan(msg.id, 'activate_schedule')}
                            className="w-full py-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: '#CCFF00', color: '#000' }}
                          >
                            {applyingMsgId === msg.id
                              ? 'Applying...'
                              : 'Apply Schedule Changes'}
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              disabled={applyingMsgId === msg.id}
                              onClick={() => handleApplyPlan(msg.id, 'save_plan')}
                              className="w-full py-2 px-2 rounded-lg font-bold text-xs border border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00]/10 transition-colors disabled:opacity-50"
                            >
                              {applyingMsgId === msg.id
                                ? 'Saving...'
                                : 'Save to Library'}
                            </button>
                            <button
                              type="button"
                              disabled={applyingMsgId === msg.id}
                              onClick={() => handleApplyPlan(msg.id, 'activate_schedule')}
                              className="w-full py-2 px-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                              style={{ backgroundColor: '#CCFF00', color: '#000' }}
                            >
                              {applyingMsgId === msg.id
                                ? 'Applying...'
                                : 'Apply New Schedule'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="text-xs text-gray-400 italic">
                    AI Coach is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSubmit}
                className="p-2.5 border-t flex items-center gap-2"
                style={{ backgroundColor: '#161616', borderColor: '#262626' }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI Coach..."
                  maxLength={1500}
                  className="flex-1 bg-neutral-900 text-xs text-white rounded-xl px-3 py-2.5 border border-neutral-800 focus:outline-none focus:border-[#CCFF00]"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="p-2.5 rounded-xl disabled:opacity-40"
                  style={{ backgroundColor: '#CCFF00', color: '#000' }}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
