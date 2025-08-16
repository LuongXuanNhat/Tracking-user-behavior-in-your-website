"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import ApiService from "../service/api";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    websiteName: "",
    websiteUrl: "",
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await ApiService.login(
        loginForm.email,
        loginForm.password
      );
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    try {
      const result = await ApiService.register({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        websiteName: registerForm.websiteName,
        websiteUrl: registerForm.websiteUrl,
      });

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            User Behavior Analytics
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Đăng nhập vào tài khoản của bạn" : "Tạo tài khoản mới"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isLogin ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                />
                <Input
                  label="Mật khẩu"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Đăng nhập
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <Input
                  label="Họ tên"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  required
                />
                <Input
                  label="Mật khẩu"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  label="Xác nhận mật khẩu"
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  label="Tên website"
                  value={registerForm.websiteName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      websiteName: e.target.value,
                    })
                  }
                  required
                />
                <Input
                  label="URL website"
                  type="url"
                  value={registerForm.websiteUrl}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      websiteUrl: e.target.value,
                    })
                  }
                  placeholder="https://example.com"
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Đăng ký
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-500"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
              >
                {isLogin
                  ? "Chưa có tài khoản? Đăng ký ngay"
                  : "Đã có tài khoản? Đăng nhập"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
