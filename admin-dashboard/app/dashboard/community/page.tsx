"use client";

import { useState } from "react";
import {
  Users, ThumbsUp, MessageCircle, TrendingUp, Star,
  Send, Hash, Search, Bell, Pin,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { DiscussionPost } from "@/types";

const MOCK_POSTS: DiscussionPost[] = [
  { id: "p1", author: "Karthik Rajan", initials: "KR", content: "RELIANCE showing strong volume accumulation near ₹2580 support. RSI at 42 — classic oversold territory. I'm adding here with a target of ₹2,850. Stop loss at ₹2,520. What do others think?", symbol: "RELIANCE", likes: 48, replies: 23, createdAt: "2026-06-09T08:30:00Z", tags: ["technical", "accumulate"] },
  { id: "p2", author: "Sunita Patel", initials: "SP", content: "Just completed the Investing 101 course on InvestIQ — absolutely brilliant for beginners! My takeaway: index funds + SIP + patience = wealth. Started a ₹5000/month SIP in Nifty 50 index fund today. Small steps 🚀", likes: 92, replies: 41, createdAt: "2026-06-09T07:15:00Z", tags: ["beginner", "sip", "mindset"] },
  { id: "p3", author: "Vijay Malhotra", initials: "VM", content: "Intraday update: TCS bouncing off 200 DMA at ₹3580. Took a long at ₹3595 with target ₹3680 and SL ₹3560. Risk:Reward = 1:2.4. Strict risk management is key — never risk more than 1% of capital on a single trade.", symbol: "TCS", likes: 35, replies: 18, createdAt: "2026-06-08T14:20:00Z", tags: ["intraday", "technical"] },
  { id: "p4", author: "Meera Krishnan", initials: "MK", content: "TCS Q4 FY26 results beat estimates! Revenue grew 7.2% QoQ. Management commentary very bullish on AI-related demand. Upgrading my target from ₹3,900 to ₹4,200. LTCG-friendly holding for me! 📈", symbol: "TCS", likes: 67, replies: 29, createdAt: "2026-06-08T12:00:00Z", tags: ["results", "fundamental"] },
  { id: "p5", author: "Dev Kapoor", initials: "DK", content: "Iron Condor on NIFTY at 24000 strikes — collected ₹8,400 premium. IV at 65th percentile makes this attractive. Will close at 50% profit. Options sellers, how's your theta working today?", likes: 28, replies: 15, createdAt: "2026-06-07T10:30:00Z", tags: ["options", "strategy", "f&o"] },
];

const TRENDING_STOCKS = [
  { symbol: "RELIANCE", posts: 142, sentiment: "Bullish", change: 1.37 },
  { symbol: "TCS", posts: 98, sentiment: "Neutral", change: -1.22 },
  { symbol: "INFY", posts: 76, sentiment: "Bullish", change: 1.33 },
  { symbol: "BAJFINANCE", posts: 65, sentiment: "Bullish", change: 1.71 },
  { symbol: "ADANIENT", posts: 54, sentiment: "Bearish", change: -2.14 },
];

const EXPERT_CHANNELS = [
  { name: "NIFTY Daily Picks", expert: "TechPro Vijay", followers: 12400, badge: "SEBI RA", posts: 3 },
  { name: "Fundamental Gems", expert: "Meera FA", followers: 8900, badge: "CFA", posts: 1 },
  { name: "Options Flow", expert: "OptionsKing Dev", followers: 6700, badge: "Verified", posts: 5 },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sentimentColor(s: string) {
  if (s === "Bullish") return "success";
  if (s === "Bearish") return "danger";
  return "secondary";
}

export default function CommunityPage() {
  const [tab, setTab] = useState("feed");
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<DiscussionPost[]>(MOCK_POSTS);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  function toggleLike(id: string) {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => p.id === id ? { ...p, likes: liked.has(id) ? p.likes - 1 : p.likes + 1 } : p)
    );
  }

  function submitPost() {
    if (!newPost.trim()) return;
    const post: DiscussionPost = {
      id: `p${Date.now()}`,
      author: "You",
      initials: "U",
      content: newPost,
      likes: 0,
      replies: 0,
      createdAt: new Date().toISOString(),
      tags: [],
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Users className="h-6 w-6 text-cyan-400" /> Community
          </h2>
          <p className="text-sm text-muted-foreground">Discuss stocks, share insights, learn from fellow investors</p>
        </div>
        <Badge variant="info">12,450 members online</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {[
                { value: "feed", label: "Community Feed" },
                { value: "following", label: "Following" },
              ].map(({ value, label }) => (
                <TabsTrigger key={value} value={value} activeValue={tab} onSelect={setTab}>{label}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="feed" activeValue={tab}>
              {/* New post */}
              <Card className="mb-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white flex-shrink-0">U</div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share an insight, analysis, or question…"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-2 text-xs text-muted-foreground/80">
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Tag a stock</span>
                      </div>
                      <Button size="sm" onClick={submitPost} disabled={!newPost.trim()}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Post
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Posts */}
              {posts.map((post) => (
                <Card key={post.id} className="hover:border-input transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground flex-shrink-0">
                      {post.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{post.author}</span>
                        {post.symbol && (
                          <Badge variant="info" className="text-[10px]">{post.symbol}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground/80 ml-auto">{timeAgo(post.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{post.content}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${liked.has(post.id) ? "text-primary" : "text-muted-foreground/80 hover:text-foreground"}`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> {post.likes}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors">
                          <MessageCircle className="h-3.5 w-3.5" /> {post.replies} replies
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="following" activeValue={tab}>
              <Card className="py-12 text-center text-muted-foreground/80">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Follow investors to see their posts here</p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Trending Stocks */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-profit" /> Trending Stocks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {TRENDING_STOCKS.map((s) => (
                <div key={s.symbol} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.symbol}</p>
                    <p className="text-xs text-muted-foreground/80">{s.posts} discussions</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={sentimentColor(s.sentiment) as "success" | "danger" | "secondary"}>{s.sentiment}</Badge>
                    <p className={`text-xs mt-0.5 ${s.change >= 0 ? "text-profit" : "text-loss"}`}>
                      {s.change >= 0 ? "+" : ""}{s.change}%
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Expert Channels */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /> Expert Channels</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {EXPERT_CHANNELS.map((ch) => (
                <div key={ch.name} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ai/20 text-xs font-bold text-ai/90 flex-shrink-0">
                    {ch.expert[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{ch.name}</p>
                      <Badge variant="info" className="text-[10px]">{ch.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground/80">{ch.followers.toLocaleString("en-IN")} followers · {ch.posts} posts today</p>
                  </div>
                  <button className="flex items-center gap-1 rounded-lg border border-ai/30 px-2 py-1 text-xs text-ai hover:bg-ai/10 transition-colors">
                    <Bell className="h-3 w-3" /> Follow
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="rounded-lg bg-card/60 border border-border/70 px-3 py-3 text-xs text-muted-foreground/80 leading-relaxed">
            Community posts are user opinions only. Verify before acting. Not investment advice.
          </div>
        </div>
      </div>
    </div>
  );
}
