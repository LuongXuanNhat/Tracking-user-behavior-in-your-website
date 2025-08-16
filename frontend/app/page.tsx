"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ApiService from "./service/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    if (ApiService.isAuthenticated()) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
