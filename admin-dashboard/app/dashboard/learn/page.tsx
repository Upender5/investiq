"use client";

import { useState } from "react";
import {
  BookOpen, Play, Award, Star, Clock, ChevronRight,
  Zap, Target, TrendingUp, Shield, BarChart3, Brain,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Course } from "@/types";

const MOCK_COURSES: Course[] = [
  { id: "c1", title: "Investing 101 — The Complete Beginner's Guide", description: "Master the fundamentals of stock market investing, mutual funds, and wealth building from scratch.", level: "Beginner", duration: "4h 20m", lessons: 18, completedLessons: 12, category: "Fundamentals", tags: ["stocks", "mf", "basics"], enrolled: true },
  { id: "c2", title: "Technical Analysis Masterclass", description: "Learn chart patterns, indicators, and price action to time your trades like a professional.", level: "Intermediate", duration: "6h 45m", lessons: 24, completedLessons: 0, category: "Trading", tags: ["charts", "TA", "indicators"], enrolled: false },
  { id: "c3", title: "Mutual Fund Investing — Build Wealth Systematically", description: "Everything about mutual funds, SIPs, ELSS, and building a goal-based MF portfolio.", level: "Beginner", duration: "3h 10m", lessons: 14, completedLessons: 14, category: "Mutual Funds", tags: ["mf", "sip", "elss"], enrolled: true },
  { id: "c4", title: "Options Trading for Beginners", description: "Understand options Greeks, strategies like covered calls, iron condors, and risk management.", level: "Advanced", duration: "8h 30m", lessons: 32, completedLessons: 0, category: "Derivatives", tags: ["options", "f&o", "trading"], enrolled: false },
  { id: "c5", title: "Tax Planning for Investors", description: "Minimize your tax burden legally using ELSS, NPS, LTCG exemptions, and smart tax harvesting.", level: "Intermediate", duration: "2h 50m", lessons: 10, completedLessons: 5, category: "Tax", tags: ["tax", "elss", "nps"], enrolled: true },
  { id: "c6", title: "Fundamental Analysis — Pick Winning Stocks", description: "Learn to read financial statements, analyze business models, and find undervalued stocks.", level: "Intermediate", duration: "5h 15m", lessons: 20, completedLessons: 0, category: "Research", tags: ["FA", "stocks", "valuation"], enrolled: false },
];

const DAILY_BYTES = [
  { term: "P/E Ratio", definition: "Price divided by earnings per share. A P/E of 20 means you pay ₹20 for every ₹1 of annual profit." },
  { term: "CAGR", definition: "Compound Annual Growth Rate — the annual growth rate of an investment over a specific period assuming profits are reinvested." },
  { term: "Expense Ratio", definition: "Annual fee charged by a mutual fund (as % of AUM). A 1% expense ratio on ₹1L investment = ₹1,000/year." },
];

const CATEGORIES = ["All", "Fundamentals", "Trading", "Mutual Funds", "Tax", "Derivatives", "Research"];

const levelColor: Record<Course["level"], "success" | "info" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "info",
  Advanced: "warning",
  Expert: "danger",
};

export default function LearnPage() {
  const [filter, setFilter] = useState("All");
  const [dailyByte, setDailyByte] = useState(0);

  const filtered = MOCK_COURSES.filter((c) => filter === "All" || c.category === filter);
  const enrolled = MOCK_COURSES.filter((c) => c.enrolled);
  const completed = enrolled.filter((c) => c.completedLessons === c.lessons).length;
  const totalLessons = enrolled.reduce((s, c) => s + c.completedLessons, 0);
  const totalAvailable = enrolled.reduce((s, c) => s + c.lessons, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <BookOpen className="h-6 w-6 text-yellow-400" /> Learning Center
        </h2>
        <p className="text-sm text-muted-foreground">Master investing through expert-curated courses and quizzes</p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Enrolled Courses", value: enrolled.length, icon: BookOpen, color: "text-blue-400" },
          { label: "Completed", value: completed, icon: Award, color: "text-profit" },
          { label: "Lessons Done", value: totalLessons, icon: CheckCircle2, color: "text-ai" },
          { label: "IQ Points", value: "1,240", icon: Star, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-3 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground/80">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Daily Byte */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/20">
              <Zap className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Daily Byte</p>
              <p className="font-semibold text-foreground mt-0.5">{DAILY_BYTES[dailyByte].term}</p>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{DAILY_BYTES[dailyByte].definition}</p>
            </div>
          </div>
          <button
            onClick={() => setDailyByte((d) => (d + 1) % DAILY_BYTES.length)}
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 flex-shrink-0"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </Card>

      {/* In Progress */}
      {enrolled.filter((c) => c.completedLessons > 0 && c.completedLessons < c.lessons).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Continue Learning</h3>
          <div className="space-y-3">
            {enrolled.filter((c) => c.completedLessons > 0 && c.completedLessons < c.lessons).map((course) => (
              <Card key={course.id} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={(course.completedLessons / course.lessons) * 100} size="sm" className="flex-1" />
                    <span className="text-xs text-muted-foreground/80 flex-shrink-0">{course.completedLessons}/{course.lessons} lessons</span>
                  </div>
                </div>
                <Button size="sm" className="flex-shrink-0">
                  <Play className="h-3.5 w-3.5 mr-1" /> Resume
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Course Catalog */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground/80">Course Catalog</h3>
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === c ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((course) => (
            <Card key={course.id} className="hover:border-muted-foreground/40 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={levelColor[course.level]}>{course.level}</Badge>
                    {course.enrolled && course.completedLessons === course.lessons && (
                      <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-0.5" />Done</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm leading-snug">{course.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{course.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground/80 mb-3">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course.lessons} lessons</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {course.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
                ))}
              </div>

              {course.enrolled && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground/80 mb-1">
                    <span>{course.completedLessons} of {course.lessons} lessons</span>
                    <span>{Math.round((course.completedLessons / course.lessons) * 100)}%</span>
                  </div>
                  <Progress value={(course.completedLessons / course.lessons) * 100} size="sm" />
                </div>
              )}

              <Button
                size="sm"
                variant={course.enrolled ? "primary" : "secondary"}
                className="w-full"
              >
                {course.enrolled
                  ? course.completedLessons === course.lessons
                    ? "Review Course"
                    : course.completedLessons > 0
                    ? "Continue"
                    : "Start Learning"
                  : "Enroll Free"}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
