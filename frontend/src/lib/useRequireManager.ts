"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Sends non-managers back to their own dashboard.
 * The real guard is on the server; this only keeps the UI honest.
 */
export function useRequireManager() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "MANAGER") {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return { isManager: user?.role === "MANAGER", loading };
}