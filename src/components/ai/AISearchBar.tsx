"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Sparkles, HelpCircle, Plus, Send, X, Search, Database, Mail, BarChart3, Loader2, MessageSquarePlus, History } from "lucide-react";
import { useAISearch } from "./AISearchContext";
import type { ThinkingStatus } from "./AISearchContext";

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table: line starts with | and next line is a separator like |---|
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1].trim())) {
      const headerCells = line.split("|").filter((c) => c.trim() !== "").map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter((c) => c.trim() !== "").map((c) => c.trim()));
        i++;
      }
      elements.push(
        <div key={elements.length} className="overflow-x-auto my-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="text-left py-1.5 px-2 font-semibold text-white/90">
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-white/10 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 px-2 text-white/80">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list items
    if (/^[\-\*]\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\-\*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="list-disc list-inside space-y-0.5 my-1">
          {listItems.map((item, li) => (
            <li key={li}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Headers: #, ##, ###
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const cls = level === 1
        ? "text-base font-bold text-white mt-3 mb-1"
        : level === 2
        ? "text-sm font-bold text-white mt-2.5 mb-1"
        : "text-sm font-semibold text-white mt-2 mb-0.5";
      elements.push(
        <p key={elements.length} className={cls}>{renderInlineMarkdown(headerText)}</p>
      );
      i++;
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      elements.push(<div key={elements.length} className="h-2" />);
      i++;
      continue;
    }

    // Regular text line
    elements.push(
      <p key={elements.length}>{renderInlineMarkdown(line)}</p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const TOOL_DISPLAY_NAMES: Record<string, { label: string; icon: string }> = {
  query_lps: { label: "Searching LPs", icon: "search" },
  get_deal_pipeline: { label: "Loading pipeline", icon: "database" },
  get_commitment_status: { label: "Checking commitments", icon: "database" },
  get_email_history: { label: "Searching emails", icon: "mail" },
  get_engagement_scores: { label: "Analyzing engagement", icon: "chart" },
  get_deal_analytics: { label: "Analyzing deal", icon: "chart" },
  get_wire_status: { label: "Checking wires", icon: "database" },
  get_investor_updates: { label: "Loading updates", icon: "database" },
  search_across_all: { label: "Searching everything", icon: "search" },
  draft_email: { label: "Drafting email", icon: "mail" },
};

function ToolIcon({ icon }: { icon: string }) {
  const cls = "w-3 h-3";
  switch (icon) {
    case "search": return <Search className={cls} />;
    case "database": return <Database className={cls} />;
    case "mail": return <Mail className={cls} />;
    case "chart": return <BarChart3 className={cls} />;
    default: return <Loader2 className={`${cls} animate-spin`} />;
  }
}

const suggestedQueries = [
  "How many committed LPs do I have?",
  "What's the total pipeline value?",
];

// Parse SSE events from a text chunk (may contain multiple events or partial ones)
function parseSSEEvents(buffer: string): { events: { type: string; data: string }[]; remaining: string } {
  const events: { type: string; data: string }[] = [];
  const lines = buffer.split("\n");
  let currentType = "";
  let currentData = "";
  let remaining = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("event: ")) {
      currentType = line.slice(7);
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6);
    } else if (line === "" && currentType && currentData) {
      events.push({ type: currentType, data: currentData });
      currentType = "";
      currentData = "";
    } else if (line === "") {
      // Empty line without complete event, reset
      currentType = "";
      currentData = "";
    }
  }

  // If we have a partial event at the end, keep it in the buffer
  if (currentType || currentData) {
    const partialLines: string[] = [];
    if (currentType) partialLines.push(`event: ${currentType}`);
    if (currentData) partialLines.push(`data: ${currentData}`);
    remaining = partialLines.join("\n");
  }

  return { events, remaining };
}

interface AISearchBarProps {
  isDashboard?: boolean;
}

export default function AISearchBar({ isDashboard = false }: AISearchBarProps) {
  const {
    isOpen,
    setIsOpen,
    isExpanded,
    setIsExpanded,
    messages,
    addMessage,
    isLoading,
    setIsLoading,
    streamingContent,
    setStreamingContent,
    thinkingStatus,
    setThinkingStatus,
    abortControllerRef,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    loadSessions,
    loadSession,
    startNewSession,
    insights,
    dismissInsight,
  } = useAISearch();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // On dashboard, always show expanded. On other pages, show bubble
  const showFullBar = isDashboard || isOpen;

  useEffect(() => {
    if (showFullBar && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showFullBar]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, thinkingStatus]);

  const handleSubmit = useCallback(async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const searchQuery = customQuery || query;
    if (!searchQuery.trim() || isLoading) return;

    // Add user message
    addMessage({ role: "user", content: searchQuery });
    setQuery("");
    setIsLoading(true);
    setIsExpanded(true);
    setStreamingContent("");
    setThinkingStatus(null);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: searchQuery,
          sessionId: currentSessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        addMessage({ role: "assistant", content: `Error: ${errorData.error || "Request failed"}` });
        return;
      }

      if (!response.body) {
        addMessage({ role: "assistant", content: "Error: No response stream" });
        return;
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEEvents(buffer);
        buffer = remaining;

        for (const event of events) {
          try {
            const data = JSON.parse(event.data);

            switch (event.type) {
              case "thinking":
                setThinkingStatus((prev: ThinkingStatus | null) => ({
                  toolName: data.toolName,
                  iteration: data.iteration,
                  results: prev?.results || [],
                }));
                break;

              case "tool_result":
                setThinkingStatus((prev: ThinkingStatus | null) => ({
                  toolName: prev?.toolName || data.toolName,
                  iteration: prev?.iteration || 1,
                  results: [
                    ...(prev?.results || []),
                    { toolName: data.toolName, summary: data.summary },
                  ],
                }));
                break;

              case "text_delta":
                accumulatedText += data.delta;
                setStreamingContent(accumulatedText);
                // Clear thinking when text starts streaming
                setThinkingStatus(null);
                break;

              case "done":
                // Finalize: add the complete message and reset streaming state
                if (accumulatedText) {
                  addMessage({ role: "assistant", content: accumulatedText });
                  setStreamingContent("");
                }
                break;

              case "error":
                addMessage({ role: "assistant", content: `Error: ${data.message}` });
                break;

              case "session":
                if (data.sessionId) {
                  setCurrentSessionId(data.sessionId);
                  loadSessions();
                }
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }

      // Handle case where stream ended without a done event
      if (accumulatedText && streamingContent) {
        addMessage({ role: "assistant", content: accumulatedText });
        setStreamingContent("");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — add partial content if any
        if (streamingContent) {
          addMessage({ role: "assistant", content: streamingContent + "\n\n*(cancelled)*" });
          setStreamingContent("");
        }
      } else {
        addMessage({
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        });
      }
    } finally {
      setIsLoading(false);
      setThinkingStatus(null);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [query, isLoading, messages, addMessage, setIsLoading, setIsExpanded, setStreamingContent, setThinkingStatus, abortControllerRef, streamingContent, currentSessionId, setCurrentSessionId, loadSessions]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(undefined, suggestion);
  };

  // Floating bubble for non-dashboard pages
  if (!showFullBar) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-105"
        aria-label="Open AI Search"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  // Dashboard version with grey background wrapper
  if (isDashboard) {
    return (
      <DashboardAISearch
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        messages={messages}
        isLoading={isLoading}
        streamingContent={streamingContent}
        thinkingStatus={thinkingStatus}
        query={query}
        setQuery={setQuery}
        inputRef={inputRef}
        handleSubmit={handleSubmit}
        handleSuggestionClick={handleSuggestionClick}
        sessions={sessions}
        onNewChat={startNewSession}
        onLoadSession={loadSession}
        insights={insights}
        onDismissInsight={dismissInsight}
      />
    );
  }

  // Non-dashboard version (opened from bubble)
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={() => {
          setIsOpen(false);
          setIsExpanded(false);
        }}
      />

      {/* Search Bar Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[745px] z-50 flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
        {/* Chat Messages - shown when expanded */}
        {isExpanded && (messages.length > 0 || streamingContent || thinkingStatus) && (
          <div className="mb-4 flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 px-1 scrollbar-thin">
              <MessageList
                messages={messages}
                streamingContent={streamingContent}
                thinkingStatus={thinkingStatus}
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Suggested Queries - shown when not expanded */}
        {!isExpanded && (
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            {suggestedQueries.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7a7a7f] hover:bg-[#8a8a8f] text-xs text-white/70 hover:text-white transition-all duration-200 shadow-md"
              >
                <span>{suggestion}</span>
                <Plus className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Main Search Bar */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-primary rounded-2xl p-2 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <form onSubmit={handleSubmit} className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isExpanded ? "Ask a follow-up question..." : "Ask anything or search"}
                className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 text-sm outline-none py-3 px-2"
              />
            </form>
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !query.trim()}
              className="w-10 h-10 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsExpanded(false);
            }}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#5a5a5f] text-white shadow-md flex items-center justify-center hover:bg-[#6a6a6f] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// ===== Shared Message List Component =====

interface MessageListProps {
  messages: { role: "user" | "assistant"; content: string }[];
  streamingContent: string;
  thinkingStatus: ThinkingStatus | null;
  isLoading: boolean;
}

function MessageList({ messages, streamingContent, thinkingStatus, isLoading }: MessageListProps) {
  return (
    <>
      {messages.map((message, index) =>
        message.role === "user" ? (
          <div key={index} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[#8a8a8f] text-white shadow-lg">
              <p className="text-sm whitespace-pre-wrap">{renderInlineMarkdown(message.content)}</p>
            </div>
          </div>
        ) : (
          <div key={index} className="text-sm text-white/90 px-1">
            {renderMarkdown(message.content)}
          </div>
        )
      )}

      {/* Thinking indicator */}
      {thinkingStatus && (
        <div className="px-1 space-y-1.5">
          {thinkingStatus.results.map((result, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/50">
              <ToolIcon icon={TOOL_DISPLAY_NAMES[result.toolName]?.icon || "default"} />
              <span>{result.summary}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{TOOL_DISPLAY_NAMES[thinkingStatus.toolName]?.label || thinkingStatus.toolName}...</span>
          </div>
        </div>
      )}

      {/* Streaming content */}
      {streamingContent && (
        <div className="text-sm text-white/90 px-1">
          {renderMarkdown(streamingContent)}
        </div>
      )}

      {/* Basic loading indicator */}
      {isLoading && !thinkingStatus && !streamingContent && (
        <div className="flex items-center gap-2 text-xs text-white/50 px-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}
    </>
  );
}

// ===== Dashboard Version =====

interface DashboardAISearchProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  messages: { role: "user" | "assistant"; content: string }[];
  isLoading: boolean;
  streamingContent: string;
  thinkingStatus: ThinkingStatus | null;
  query: string;
  setQuery: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e?: React.FormEvent, customQuery?: string) => void;
  handleSuggestionClick: (suggestion: string) => void;
  sessions: { id: string; title: string | null; lastMessageAt: string | null; messageCount: number }[];
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => Promise<void>;
  insights: { id: string; type: string; title: string; description: string; priority: string }[];
  onDismissInsight: (id: string) => void;
}

function DashboardAISearch({
  isExpanded,
  setIsExpanded,
  messages,
  isLoading,
  streamingContent,
  thinkingStatus,
  query,
  setQuery,
  inputRef,
  handleSubmit,
  handleSuggestionClick,
  sessions,
  onNewChat,
  onLoadSession,
  insights,
  onDismissInsight,
}: DashboardAISearchProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, thinkingStatus]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[745px]">
      <div className="ai-search-wrapper bg-[#6b6b70] rounded-3xl p-4 pb-3 shadow-xl w-full">
        {/* Chat Messages - shown when expanded */}
        {isExpanded && (messages.length > 0 || streamingContent || thinkingStatus) && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b border-white/10">
              <span className="text-sm font-medium text-white/90">
                FundOps Agent
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onNewChat(); }}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="New chat"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-white/70" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="Chat history"
                  >
                    <History className="w-3.5 h-3.5 text-white/70" />
                  </button>
                  {showHistory && sessions.length > 0 && (
                    <div className="absolute bottom-8 right-0 w-64 bg-[#4a4a4f] rounded-xl shadow-xl border border-white/10 overflow-hidden z-10">
                      <div className="max-h-48 overflow-y-auto">
                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => {
                              onLoadSession(session.id);
                              setShowHistory(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                          >
                            <p className="text-xs text-white/90 truncate">
                              {session.title || "Untitled chat"}
                            </p>
                            <p className="text-[10px] text-white/40">
                              {session.messageCount} messages
                              {session.lastMessageAt && (
                                <> &middot; {new Date(session.lastMessageAt).toLocaleDateString()}</>
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Messages - scrollable */}
            <div className="max-h-72 overflow-y-auto mb-3 space-y-3 px-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <MessageList
                messages={messages}
                streamingContent={streamingContent}
                thinkingStatus={thinkingStatus}
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        {/* Suggestions / Insights - shown when not expanded */}
        {!isExpanded && (
          insights.length > 0 ? (
            <div className="mb-3 px-2 space-y-1.5">
              {insights.slice(0, 3).map((insight) => (
                <button
                  key={insight.id}
                  onClick={() => {
                    handleSuggestionClick("Tell me more about this: " + insight.title);
                    onDismissInsight(insight.id);
                  }}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-xl bg-[#7a7a7f]/50 hover:bg-[#8a8a8f]/50 text-left transition-all duration-200 group"
                >
                  <span className={
                    "mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 " +
                    (insight.priority === "urgent" || insight.priority === "high"
                      ? "bg-orange-400"
                      : "bg-blue-400")
                  } />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/90 truncate">{insight.title}</p>
                    <p className="text-[10px] text-white/50 truncate">{insight.description}</p>
                  </div>
                  <X
                    className="w-3 h-3 text-white/30 hover:text-white/70 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismissInsight(insight.id);
                    }}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-3 px-2">
              {suggestedQueries.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7a7a7f] hover:bg-[#8a8a8f] text-xs text-white/70 hover:text-white transition-all duration-200"
                >
                  <span>{suggestion}</span>
                  <Plus className="w-3 h-3" />
                </button>
              ))}
            </div>
          )
        )}

        {/* Main Search Bar */}
        <div className="flex items-center gap-2 bg-primary rounded-2xl p-2">
          <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isExpanded ? "Ask a follow-up question..." : "Ask anything or search"}
              className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 text-sm outline-none py-3 px-2"
            />
          </form>
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || !query.trim()}
            className="w-10 h-10 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 disabled:opacity-50 flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
