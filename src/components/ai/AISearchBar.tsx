"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, HelpCircle, Plus, Send, X } from "lucide-react";
import { useAISearch } from "./AISearchContext";

const suggestedQueries = [
  "How many committed LPs do I have?",
  "What's the total pipeline value?",
];

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
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const searchQuery = customQuery || query;
    if (!searchQuery.trim() || isLoading) return;

    // Add user message
    addMessage({ role: "user", content: searchQuery });
    setQuery("");
    setIsLoading(true);
    setIsExpanded(true);

    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();

      if (data.error) {
        addMessage({ role: "assistant", content: `Error: ${data.error}` });
      } else {
        addMessage({ role: "assistant", content: data.response });
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        query={query}
        setQuery={setQuery}
        inputRef={inputRef}
        handleSubmit={handleSubmit}
        handleSuggestionClick={handleSuggestionClick}
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
        {isExpanded && messages.length > 0 && (
          <div className="mb-4 flex-1 flex flex-col min-h-0">
            {/* Messages - scrollable, takes full available height */}
            <div className="flex-1 overflow-y-auto space-y-3 px-1 scrollbar-thin">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-lg ${
                      message.role === "user"
                        ? "bg-[#8a8a8f] text-white"
                        : "bg-[#5a5a5f] text-white/90"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#5a5a5f] rounded-2xl px-4 py-2.5 shadow-lg">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
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
            {/* Icon Button */}
            <button className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity">
              <Sparkles className="w-5 h-5 text-white" />
            </button>

            {/* Input */}
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

            {/* Send Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !query.trim()}
              className="w-10 h-10 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          {/* Close button */}
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

interface DashboardAISearchProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  messages: { role: "user" | "assistant"; content: string }[];
  isLoading: boolean;
  query: string;
  setQuery: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e?: React.FormEvent, customQuery?: string) => void;
  handleSuggestionClick: (suggestion: string) => void;
}

function DashboardAISearch({
  isExpanded,
  setIsExpanded,
  messages,
  isLoading,
  query,
  setQuery,
  inputRef,
  handleSubmit,
  handleSuggestionClick,
}: DashboardAISearchProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[745px]">
      <div className="ai-search-wrapper bg-[#6b6b70] rounded-3xl p-4 pb-3 shadow-xl w-full">
        {/* Chat Messages - shown when expanded */}
        {isExpanded && messages.length > 0 && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
                <span className="text-sm font-medium text-white/90">
                  AI Assistant
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            {/* Messages - scrollable */}
            <div className="max-h-72 overflow-y-auto mb-3 space-y-3 px-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-[#8a8a8f] text-white"
                        : "bg-[#5a5a5f] text-white/90"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#5a5a5f] rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}

        {/* Suggested Queries - shown when not expanded */}
        {!isExpanded && (
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
        )}

        {/* Main Search Bar - used for all messages */}
        <div className="flex items-center gap-2 bg-primary rounded-2xl p-2">
          {/* Icon Button */}
          <button className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <Sparkles className="w-5 h-5 text-white" />
          </button>

          {/* Input */}
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

          {/* Send Button */}
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

