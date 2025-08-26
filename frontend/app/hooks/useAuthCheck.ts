"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ApiService from "../service/api";

export const useAuthCheck = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (!ApiService.isAuthenticated()) {
        router.push("/auth");
        return false;
      }
      return true;
    };

    // Kiểm tra ngay khi component mount
    if (!checkAuth()) {
      return;
    }

    // Kiểm tra định kỳ mỗi 30 giây
    const interval = setInterval(() => {
      checkAuth();
    }, 30000);

    // Kiểm tra khi window focus (user quay lại tab)
    const handleFocus = () => {
      checkAuth();
    };

    // Kiểm tra khi visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);
};
