"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, Send, Sparkles, TrendingUp, Shield, Target,
  BookOpen, Lightbulb, RotateCcw, User, Bot,
} from "lucide-react";
import { useAiChat } from "@/lib/hooks";
import { formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { AIMessage } from "@/types";

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "Analyze my portfolio performance", color: "text-profit" },
  { icon: Shield, text: "What are my biggest portfolio risks?", color: "text-warning" },
  { icon: Target, text: "How much should I invest monthly for retirement?", color: "text-ai" },
  { icon: BookOpen, text: "Explain what P/E ratio means", color: "text-info" },
  { icon: Lightbulb, text: "Find undervalued IT stocks for me", color: "text-warning" },
  { icon: Sparkles, text: "Should I start an SIP or lumpsum?", color: "text-ai" },
];

const WELCOME_MESSAGE: AIMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I'm **InvestIQ Copilot**, your AI-powered financial assistant. 🧠\n\nI have full context of your portfolio and can help you with:\n• Portfolio analysis & rebalancing advice\n• Stock research & comparison\n• Goal planning & SIP calculations\n• Market news & impact analysis\n• Financial education & concepts\n\nWhat would you like to explore today?`,
  timestamp: new Date().toISOString(),
};

export default function AICopilotPage() {
  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useAiChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || chat.isPending) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    let content: string;
    try {
      // POST /api/v1/ai/chat on the ai-advisor service
      const res = await chat.mutateAsync({ message: text, conversation_id: conversationId });
      if (res.conversation_id) setConversationId(res.conversation_id);
      content = (res.answer ?? res.message ?? "I couldn't generate a response right now.") +
        (res.disclaimer ? `\n\n*${res.disclaimer}*` : "");
    } catch {
      content = "⚠️ The AI advisor is unavailable right now. Please try again in a moment.";
    }

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: "assistant", content, timestamp: new Date().toISOString() },
    ]);
  }

  function renderContent(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, '<em class="text-muted-foreground text-xs">$1</em>')
      .replace(/•/g, "&bull;")
      .split("\n")
      .map((line, i) => <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Brain className="h-6 w-6 text-ai" />
            AI Copilot
          </h2>
          <p className="text-sm text-muted-foreground">Your personal AI financial advisor with portfolio context</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMessages([{ ...WELCOME_MESSAGE, id: "welcome-" + Date.now(), content: "Session cleared! How can I help you?" }]);
            setConversationId(null);
          }}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Clear
        </Button>
      </div>

      {/* Quick prompts — only show at start of conversation */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_PROMPTS.map(({ icon: Icon, text, color }) => (
            <button
              key={text}
              onClick={() => sendMessage(text)}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-3 text-left text-sm text-foreground/80 transition-colors hover:border-ai/40 hover:bg-card"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color}`} />
              <span className="leading-tight">{text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary" : "bg-ai/20 border border-ai/30"}`}>
              {msg.role === "user" ? (
                <User className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-ai" />
              )}
            </div>
            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border text-foreground/90 rounded-tl-sm"}`}>
              {renderContent(msg.content)}
              <p className="mt-1 text-[10px] opacity-50">{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}

        {chat.isPending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ai/20 border border-ai/30">
              <Bot className="h-4 w-4 text-ai" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-ai animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask anything about investing, your portfolio, markets…"
          className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={chat.isPending}
        />
        <Button
          variant="ai"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || chat.isPending}
          className="rounded-xl px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
