"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { logout, getUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  const router = useRouter();
  const userId = getUserId();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground/80">
            {userId ? `User ${userId.slice(0, 8)}…` : "Admin"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
