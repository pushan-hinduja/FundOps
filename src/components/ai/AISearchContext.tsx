"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export interface ThinkingStatus {
  toolName: string;
  iteration: number;
  results: { toolName: string; summary: string }[];
}

export interface SessionInfo {
  id: string;
  title: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

export interface InsightInfo {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
}

interface AISearchContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  // Streaming support
  streamingContent: string;
  setStreamingContent: React.Dispatch<React.SetStateAction<string>>;
  thinkingStatus: ThinkingStatus | null;
  setThinkingStatus: React.Dispatch<React.SetStateAction<ThinkingStatus | null>>;
  // Abort support
  abortControllerRef: React.RefObject<AbortController | null>;
  // Session support
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  sessions: SessionInfo[];
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  // Insights
  insights: InsightInfo[];
  dismissInsight: (id: string) => void;
}

const AISearchContext = createContext<AISearchContextType | undefined>(undefined);

export function AISearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [insights, setInsights] = useState<InsightInfo[]>([]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/chat/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.sessions || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            lastMessageAt: s.last_message_at,
            messageCount: s.message_count,
          }))
        );
      }
    } catch {
      // Silently fail — sessions are non-critical
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/chat/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(sessionId);
        setMessages(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.messages || [])
            .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
        );
        setIsExpanded(true);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setStreamingContent("");
    setThinkingStatus(null);
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/insights");
      if (response.ok) {
        const data = await response.json();
        setInsights(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.insights || []).map((i: any) => ({
            id: i.id,
            type: i.insight_type,
            title: i.title,
            description: i.description,
            priority: i.priority,
          }))
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  const dismissInsight = useCallback(async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch("/api/ai/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId: id }),
      });
    } catch {
      // Silently fail
    }
  }, []);

  // Load sessions and insights on mount
  useEffect(() => {
    loadSessions();
    loadInsights();
  }, [loadSessions, loadInsights]);

  return (
    <AISearchContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isExpanded,
        setIsExpanded,
        messages,
        addMessage,
        setMessages,
        clearMessages,
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
      }}
    >
      {children}
    </AISearchContext.Provider>
  );
}

export function useAISearch() {
  const context = useContext(AISearchContext);
  if (context === undefined) {
    throw new Error("useAISearch must be used within an AISearchProvider");
  }
  return context;
}
