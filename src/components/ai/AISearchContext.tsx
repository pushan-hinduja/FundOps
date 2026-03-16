"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ThinkingStatus {
  toolName: string;
  iteration: number;
  results: { toolName: string; summary: string }[];
}

interface AISearchContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
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

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AISearchContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isExpanded,
        setIsExpanded,
        messages,
        addMessage,
        clearMessages,
        isLoading,
        setIsLoading,
        streamingContent,
        setStreamingContent,
        thinkingStatus,
        setThinkingStatus,
        abortControllerRef,
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
