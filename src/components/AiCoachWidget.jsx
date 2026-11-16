import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  Check,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../api';
import { queryKeys } from '../lib/queryClient';
import MarkdownMessage, { isSafeExternalUrl } from './MarkdownMessage';
import { getApiErrorMessage } from '../utils/localize';

export default function AiCoachWidget() {
  const { t } = useTranslation(['ai', 'plan', 'errors']);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history' | 'memories'
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [generatedRawKey, setGeneratedRawKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingMsgId, setApplyingMsgId] = useState(null);
  const [expandedCitationsByMsg, setExpandedCitationsByMsg] = useState({});
  const [errorBanner, setErrorBanner] = useState('');
  const messagesEndRef = useRef(null);

  const queryEnabled = Boolean(isOpen && isAuthenticated);

  const { data: conversations = [] } = useQuery({
    queryKey: queryKeys.ai.conversations,
    queryFn: () => aiAPI.getConversations(),
    enabled: queryEnabled
  });

  const { data: memories = [] } = useQuery({
    queryKey: queryKeys.ai.memories,
    queryFn: () => aiAPI.getMemories(),
    enabled: queryEnabled
  });

  const { data: mcpKeyStatus = { hasKey: false, keyPrefix: null } } = useQuery({
    queryKey: queryKeys.ai.mcpKey,
    queryFn: () => aiAPI.getMcpKeyStatus(),
    enabled: queryEnabled
  });

  const chatMutation = useMutation({
    mutationFn: ({ conversationId: convId, message }) =>
      aiAPI.chat({ conversationId: convId, message }),
    onSuccess: async (data, variables) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== variables.optimisticId),
        data.userMessage,
        data.assistantMessage
      ]);
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations })
      ];
      if (data?.memoriesUpdated) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.ai.memories })
        );
      }
      await Promise.all(invalidations);
    },
    onError: (err, variables) => {
      setMessages((prev) => prev.filter((m) => m.id !== variables.optimisticId));
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.chatFailed')));
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id) => aiAPI.deleteConversation(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations });
      if (conversationId === id) {
        handleNewChat();
      }
    },
    onError: (err) => {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.deleteConversationFailed')));
    }
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: (id) => aiAPI.deleteMemory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ai.memories });
    },
    onError: (err) => {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.deleteMemoryFailed')));
    }
  });

  const generateMcpKeyMutation = useMutation({
    mutationFn: () => aiAPI.generateMcpKey(),
    onSuccess: async (data) => {
      setGeneratedRawKey(data.apiKey);
      queryClient.setQueryData(queryKeys.ai.mcpKey, {
        hasKey: true,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ai.mcpKey });
    },
    onError: (err) => {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.generateKeyFailed')));
    }
  });

  const revokeMcpKeyMutation = useMutation({
    mutationFn: () => aiAPI.revokeMcpKey(),
    onSuccess: async () => {
      queryClient.setQueryData(queryKeys.ai.mcpKey, {
        hasKey: false,
        keyPrefix: null
      });
      setGeneratedRawKey(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.ai.mcpKey });
    },
    onError: (err) => {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.revokeKeyFailed')));
    }
  });

  const applyPlanMutation = useMutation({
    mutationFn: ({ conversationId: convId, messageId, action }) =>
      aiAPI.applyPlan(convId, messageId, action),
    onSuccess: async (result, variables) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === variables.messageId && m.draftPlan
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule.current })
      ]);
    },
    onError: (err) => {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.applyPlanFailed')));
    },
    onSettled: () => {
      setApplyingMsgId(null);
    }
  });

  const isBusy = loading || chatMutation.isPending;
  const mcpKeyLoading =
    generateMcpKeyMutation.isPending || revokeMcpKeyMutation.isPending;

  const toggleCitations = (msgId) => {
    setExpandedCitationsByMsg((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBusy]);

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
    } catch (err) {
      setErrorBanner(getApiErrorMessage(err, t, t('ai:errors.loadConversationFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = (id, e) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(id);
  };

  const handleDeleteMemory = (id) => {
    deleteMemoryMutation.mutate(id);
  };

  const handleGenerateMcpKey = () => {
    setErrorBanner('');
    generateMcpKeyMutation.mutate();
  };

  const handleRevokeMcpKey = () => {
    setErrorBanner('');
    revokeMcpKeyMutation.mutate();
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

  const sendMessage = (textToSend) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || isBusy) return;

    setErrorBanner('');
    setInput('');
    const optimisticId = `temp-${Date.now()}`;
    const optimisticUserMsg = {
      id: optimisticId,
      role: 'user',
      text: trimmed
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    chatMutation.mutate({
      conversationId,
      message: trimmed,
      optimisticId
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleApplyPlan = (msgId, action = 'activate_schedule') => {
    if (!conversationId || applyingMsgId) return;
    setApplyingMsgId(msgId);
    setErrorBanner('');
    applyPlanMutation.mutate({
      conversationId,
      messageId: msgId,
      action
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          aria-label={t('ai:openButtonAria')}
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl font-bold text-sm transition-transform hover:scale-105"
          style={{
            backgroundColor: '#CCFF00',
            color: '#0A0A0A',
            boxShadow: '0 0 24px rgba(204, 255, 0, 0.35)'
          }}
        >
          <Bot size={20} />
          <span>{t('ai:triggerLabel')}</span>
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
                <div className="font-bold text-sm leading-tight">{t('ai:header.title')}</div>
                <div className="text-[11px] text-gray-400">{t('ai:header.subtitle')}</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                title={t('ai:header.newChat')}
                onClick={handleNewChat}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-gray-300"
              >
                <Plus size={16} />
              </button>
              <button
                title={t('ai:header.history')}
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
                title={t('ai:header.memories')}
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
                aria-label={t('ai:closeButtonAria')}
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
                {t('ai:history.title')}
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-500">{t('ai:history.empty')}</p>
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
                        {t('ai:history.messagesCount', { count: c.messageCount })}
                      </div>
                    </div>
                    <button
                      aria-label={t('ai:history.deleteAria', { title: c.title })}
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
                    <span>{t('ai:memories.mcpTitle')}</span>
                  </div>
                  {mcpKeyStatus.hasKey ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-green-950 text-green-400 border border-green-800">
                      {t('ai:memories.mcpActive')}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-neutral-800 text-gray-400">
                      {t('ai:memories.mcpNoKey')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {t('ai:memories.mcpDescription')}
                </p>

                {generatedRawKey ? (
                  <div className="p-2.5 rounded-lg bg-black/60 border border-[#CCFF00]/40 space-y-2">
                    <div className="text-[11px] text-[#CCFF00] font-semibold">
                      {t('ai:memories.mcpNewKeyNotice')}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-gray-200 truncate select-all flex-1 bg-neutral-950 p-1.5 rounded border border-neutral-800">
                        {generatedRawKey}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        aria-label={t('ai:memories.copyKeyAria')}
                        className="px-2.5 py-1.5 text-xs rounded font-bold flex items-center gap-1 shrink-0"
                        style={{ backgroundColor: '#CCFF00', color: '#000' }}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? t('ai:memories.copied') : t('ai:memories.copy')}</span>
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
                      {mcpKeyLoading ? t('ai:memories.revoking') : t('ai:memories.revoke')}
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
                    {mcpKeyLoading ? t('ai:memories.generating') : t('ai:memories.generateKey')}
                  </button>
                )}
              </div>

              {/* Coach Memories List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('ai:memories.coachMemoryTitle', { count: memories.length })}
                </div>
                {memories.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    {t('ai:memories.coachMemoryEmpty')}
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
                        aria-label={t('ai:memories.deleteMemoryAria', { key: m.key })}
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
                {messages.length === 0 && !isBusy && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
                        <Sparkles size={14} className="text-[#CCFF00]" />
                        <span>{t('ai:welcome.title')}</span>
                      </div>
                      {t('ai:welcome.subtitle')}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        t('ai:quickPrompts.analyze'),
                        t('ai:quickPrompts.buildPlan'),
                        t('ai:quickPrompts.editSchedule')
                      ].map((prompt) => (
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
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs ${
                        msg.role === 'user'
                          ? 'bg-[#CCFF00] text-black font-medium whitespace-pre-wrap'
                          : 'bg-neutral-900 text-gray-100 border border-neutral-800'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <MarkdownMessage text={msg.text} />
                      ) : (
                        msg.text
                      )}
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

                    {/* Grounded Citations Panel */}
                    {msg.role === 'assistant' &&
                      Array.isArray(msg.citations) &&
                      msg.citations.length > 0 && (
                        <div className="w-full max-w-[92%] mt-1.5">
                          <button
                            type="button"
                            onClick={() => toggleCitations(msg.id)}
                            aria-expanded={Boolean(expandedCitationsByMsg[msg.id])}
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-[#CCFF00] text-gray-200 transition-colors"
                          >
                            <BookOpen size={12} className="text-[#CCFF00]" />
                            <span>{t('ai:citations.sourcesCount', { count: msg.citations.length })}</span>
                            {expandedCitationsByMsg[msg.id] ? (
                              <ChevronUp size={12} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={12} className="text-gray-400" />
                            )}
                          </button>

                          {expandedCitationsByMsg[msg.id] && (
                            <div className="mt-1.5 space-y-2">
                              {msg.citations.map((cit, idx) => (
                                <div
                                  key={`${msg.id}-cit-${cit.chunkId || idx}`}
                                  className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1 text-[11px]"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: '#CCFF00', color: '#000' }}
                                      >
                                        [{cit.citationNumber || idx + 1}]
                                      </span>
                                      <span className="font-semibold text-white truncate">
                                        {cit.title}
                                      </span>
                                    </div>
                                    {cit.topic && (
                                      <span className="shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-gray-400">
                                        {cit.topic}
                                      </span>
                                    )}
                                  </div>

                                  {cit.section && (
                                    <div className="text-[11px] font-medium text-[#CCFF00]">
                                      {cit.section}
                                    </div>
                                  )}

                                  {(cit.authors || cit.year) && (
                                    <div className="text-[10px] text-gray-400">
                                      {[cit.authors, cit.year ? `(${cit.year})` : null]
                                        .filter(Boolean)
                                        .join(' ')}
                                    </div>
                                  )}

                                  {cit.excerpt && (
                                    <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3">
                                      {cit.excerpt}
                                    </p>
                                  )}

                                  {Array.isArray(cit.references) &&
                                    cit.references.some((ref) => isSafeExternalUrl(ref?.url)) && (
                                      <div className="flex flex-col gap-1 pt-1 border-t border-neutral-800">
                                        {cit.references
                                          .filter((ref) => isSafeExternalUrl(ref?.url))
                                          .map((ref, refIdx) => (
                                            <a
                                              key={`${msg.id}-cit-${idx}-ref-${refIdx}`}
                                              href={ref.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[10px] text-[#CCFF00] hover:underline truncate"
                                            >
                                              <ExternalLink size={10} className="shrink-0" />
                                              <span className="truncate">
                                                {ref.label || ref.doi || ref.url}
                                              </span>
                                            </a>
                                          ))}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          )}
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
                              ? t('ai:draftPlan.modeEditSchedule')
                              : msg.draftPlan.mode === 'update_plan'
                              ? t('ai:draftPlan.modeUpdatePlan')
                              : t('ai:draftPlan.modeNewPlan')}
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
                                {t(`plan:days.${d.dayName}`, { defaultValue: d.dayName })}
                              </span>
                              {d.isRestDay ? (
                                <span className="text-gray-500">{t('ai:draftPlan.restDay')}</span>
                              ) : (
                                <span className="text-[#CCFF00] truncate max-w-[180px]">
                                  {d.workout?.name} ({t('ai:draftPlan.exercisesShort', { count: d.workout?.exercises?.length || 0 })})
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
                                  ? t('ai:draftPlan.appliedSchedule')
                                  : t('ai:draftPlan.savedLibrary')}
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
                                ? t('ai:draftPlan.viewSchedule')
                                : t('ai:draftPlan.viewLibrary')}
                            </button>
                          </div>
                        ) : msg.draftPlan.mode === 'update_plan' ? (
                          <button
                            type="button"
                            disabled={applyingMsgId === msg.id}
                            onClick={() => handleApplyPlan(msg.id, 'update_plan_only')}
                            className="w-full py-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: '#CCFF00', color: '#000' }}
                          >
                            {applyingMsgId === msg.id
                              ? t('ai:draftPlan.updating')
                              : t('ai:draftPlan.updateLibraryPlan')}
                          </button>
                        ) : msg.draftPlan.mode === 'edit_schedule' ? (
                          msg.draftPlan.targetPlanId ? (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                disabled={applyingMsgId === msg.id}
                                onClick={() =>
                                  handleApplyPlan(msg.id, 'update_schedule_only')
                                }
                                className="w-full py-2 px-2 rounded-lg font-bold text-xs border border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00]/10 transition-colors disabled:opacity-50"
                              >
                                {applyingMsgId === msg.id
                                  ? t('ai:draftPlan.updating')
                                  : t('ai:draftPlan.thisWeekOnly')}
                              </button>
                              <button
                                type="button"
                                disabled={applyingMsgId === msg.id}
                                onClick={() =>
                                  handleApplyPlan(msg.id, 'update_schedule_and_plan')
                                }
                                className="w-full py-2 px-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                                style={{ backgroundColor: '#CCFF00', color: '#000' }}
                              >
                                {applyingMsgId === msg.id
                                  ? t('ai:draftPlan.updating')
                                  : t('ai:draftPlan.weekAndTemplate')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={applyingMsgId === msg.id}
                              onClick={() =>
                                handleApplyPlan(msg.id, 'update_schedule_only')
                              }
                              className="w-full py-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                              style={{ backgroundColor: '#CCFF00', color: '#000' }}
                            >
                              {applyingMsgId === msg.id
                                ? t('ai:draftPlan.applying')
                                : t('ai:draftPlan.applyScheduleChanges')}
                            </button>
                          )
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              disabled={applyingMsgId === msg.id}
                              onClick={() => handleApplyPlan(msg.id, 'save_plan')}
                              className="w-full py-2 px-2 rounded-lg font-bold text-xs border border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00]/10 transition-colors disabled:opacity-50"
                            >
                              {applyingMsgId === msg.id
                                ? t('ai:draftPlan.saving')
                                : t('ai:draftPlan.saveToLibrary')}
                            </button>
                            <button
                              type="button"
                              disabled={applyingMsgId === msg.id}
                              onClick={() => handleApplyPlan(msg.id, 'activate_schedule')}
                              className="w-full py-2 px-2 rounded-lg font-bold text-xs transition-opacity disabled:opacity-50"
                              style={{ backgroundColor: '#CCFF00', color: '#000' }}
                            >
                              {applyingMsgId === msg.id
                                ? t('ai:draftPlan.applying')
                                : t('ai:draftPlan.applyNewSchedule')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isBusy && (
                  <div className="text-xs text-gray-400 italic">
                    {t('ai:chat.thinking')}
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
                  placeholder={t('ai:chat.placeholder')}
                  maxLength={1500}
                  className="flex-1 bg-neutral-900 text-xs text-white rounded-xl px-3 py-2.5 border border-neutral-800 focus:outline-none focus:border-[#CCFF00]"
                />
                <button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  aria-label={t('ai:chat.sendAria')}
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
