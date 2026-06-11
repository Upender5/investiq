"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
        <ShieldAlert className="h-8 w-8 text-loss" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        You don&apos;t have permission to view this page. If you believe this is a mistake,
        contact an administrator.
      </p>
      <Button className="mt-6" onClick={() => router.replace("/dashboard")}>
        Back to dashboard
      </Button>
    </div>
  );
}
