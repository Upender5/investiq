"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, Send, Sparkles, TrendingUp, Shield, Target,
  BookOpen, Lightbulb, RotateCcw, User, Bot,
} from "lucide-react";
import { useAiChat } from "@/lib/hooks";
import { AI_DISCLAIMER } from "@/lib/mock-data";
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

/** Offline fallback when the ai-advisor service (port 9001) is unreachable. */
function generateOfflineResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("risk")) {
    return `**Portfolio Risk Analysis:**\n\n🔴 **High Concentration Risk:** IT sector = 42% of portfolio (recommended: <25%)\n\n🟡 **Moderate Concerns:**\n• TCS and HDFC showing negative P&L — watch support levels\n• No defensive sector exposure (FMCG, Pharma, Utilities)\n\n🟢 **Strengths:**\n• RELIANCE provides energy sector hedge\n• WIPRO momentum is bullish\n• Portfolio Beta ~0.92 (slightly defensive)\n\n**Risk Score: 6.2/10** (Moderate-High)\n\nConsider adding 1 FMCG stock (HUL or Nestle) to reduce volatility.\n\n*${AI_DISCLAIMER}*`;
  }
  if (q.includes("retirement") || q.includes("monthly")) {
    return `**Retirement Planning Analysis:**\n\nAssuming you're 26 years old targeting retirement at 60:\n\n📊 **Goal:** ₹5 Crore corpus in 34 years\n\n**Monthly Investment Required:**\n• Equity MF SIP: **₹8,500/month** (assuming 12% CAGR)\n• Debt/PPF: **₹3,000/month** (assuming 7% returns)\n• **Total: ₹11,500/month**\n\n**Recommended Allocation:**\n• 70% Large Cap Index Fund (NIFTY 50)\n• 20% Flexi Cap Fund\n• 10% International Fund\n\n💡 **Pro Tip:** Step up your SIP by 10% annually — this alone can add ₹1.2 Cr to your corpus!\n\n*${AI_DISCLAIMER}*`;
  }
  if (q.includes("sip") || q.includes("lumpsum")) {
    return `**SIP vs Lumpsum — Which is Better?**\n\n**SIP (Systematic Investment Plan):**\n✅ Rupee cost averaging — buy more units when markets fall\n✅ Disciplined investing — removes emotion\n✅ Start with as little as ₹100/month\n✅ **Best for:** Regular income earners, volatile markets\n\n**Lumpsum:**\n✅ Better returns when markets are at a low\n✅ Full investment works from Day 1\n✅ **Best for:** When you have a large corpus and markets are undervalued\n\n**InvestIQ Recommendation:**\nFor most investors, **SIP wins** due to market uncertainty. If markets correct 10%+, consider deploying 20-30% as lumpsum on top of your regular SIP.\n\n*${AI_DISCLAIMER}*`;
  }
  if (q.includes("p/e") || q.includes("pe ratio")) {
    return `**P/E Ratio Explained Simply:**\n\nP/E (Price-to-Earnings) ratio tells you how much you're paying for every ₹1 of a company's profit.\n\n**Formula:** P/E = Stock Price ÷ Earnings Per Share (EPS)\n\n**Example:** If TCS trades at ₹3,650 and EPS is ₹130:\nP/E = 3650 ÷ 130 = **28.1x**\n\n**How to use it:**\n• P/E < 15: Generally considered cheap (value zone)\n• P/E 15–25: Fair value for quality companies\n• P/E > 30: Expensive — growth must justify it\n\n**Sector context matters!** IT sector typically trades at 22–30x P/E, while banking trades at 12–18x.\n\n*${AI_DISCLAIMER}*`;
  }
  return `Great question! Based on your portfolio profile, here are my key insights:\n\n**Portfolio Status:** Your current portfolio of ₹1,25,430 shows a strong 17.1% return overall.\n\n**Key Observations:**\n• IT sector is overweight at ~42% (INFY + TCS + HCLTECH) vs recommended 25%\n• Good diversification across Energy (Reliance) and Banking (HDFC)\n• WIPRO shows strong momentum at +17.86% P&L\n\n**Recommendations:**\n1. Consider booking partial profits in INFY (up 12%) to reduce IT concentration\n2. Add 1–2 defensive positions (FMCG or Pharma) for better sector balance\n3. Your idle cash could generate ~6% in liquid funds\n\n*${AI_DISCLAIMER}*`;
}

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
      content = (res.answer ?? res.message ?? generateOfflineResponse(text)) +
        (res.disclaimer ? `\n\n*${res.disclaimer}*` : "");
    } catch {
      content = generateOfflineResponse(text);
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
