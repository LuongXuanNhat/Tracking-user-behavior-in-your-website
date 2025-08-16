"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Globe, Calendar, Activity, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import ApiService from "../service/api";

interface Website {
  website_id: string;
  name: string;
  url: string;
  domain: string;
  status: string;
  created_at: string;
  last_activity?: string;
}

export default function Dashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const router = useRouter();

  const [newWebsite, setNewWebsite] = useState({
    name: "",
    url: "",
    description: "",
  });

  useEffect(() => {
    const storedCustomer = ApiService.getStoredCustomer();
    if (!storedCustomer || !ApiService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    setCustomer(storedCustomer);
    loadWebsites();
  }, [router]);

  const loadWebsites = async () => {
    try {
      const result = await ApiService.getWebsites();
      console.log("Websites API response:", result);
      if (result.success && result.data) {
        console.log("Websites data:", result.data);
        const websiteList = Array.isArray(result.data) ? result.data : [];
        console.log("Processed websites:", websiteList);
        setWebsites(websiteList);
      }
    } catch (error) {
      console.error("Error loading websites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await ApiService.createWebsite(newWebsite);
      if (result.success) {
        setNewWebsite({ name: "", url: "", description: "" });
        setShowCreateForm(false);
        loadWebsites(); // Reload the list
      }
    } catch (error) {
      console.error("Error creating website:", error);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    router.push("/auth");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Xin chào, {customer?.name}</p>
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Globe className="w-10 h-10 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Websites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {websites.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Activity className="w-10 h-10 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Websites hoạt động
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {websites.filter((w) => w.status === "active").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Calendar className="w-10 h-10 text-purple-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Gói hiện tại
                </p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {customer?.plan || "Free"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Websites Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Danh sách Websites
          </h2>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Website
          </Button>
        </div>

        {/* Create Website Form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tạo Website Mới</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWebsite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Tên website"
                    value={newWebsite.name}
                    onChange={(e) =>
                      setNewWebsite({ ...newWebsite, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="URL website"
                    type="url"
                    value={newWebsite.url}
                    onChange={(e) =>
                      setNewWebsite({ ...newWebsite, url: e.target.value })
                    }
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <Input
                  label="Mô tả (tùy chọn)"
                  value={newWebsite.description}
                  onChange={(e) =>
                    setNewWebsite({
                      ...newWebsite,
                      description: e.target.value,
                    })
                  }
                />
                <div className="flex space-x-3">
                  <Button type="submit">Tạo Website</Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Websites Grid */}
        {websites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có website nào
              </h3>
              <p className="text-gray-600 mb-4">
                Hãy tạo website đầu tiên để bắt đầu theo dõi hành vi người dùng
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo Website Đầu Tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map((website) => (
              <Card
                key={website.website_id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  console.log("Clicking website:", website);
                  console.log("Website ID:", website.website_id);
                  router.push(`/websites/${website.website_id}`);
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{website.name}</CardTitle>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        website.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {website.status === "active"
                        ? "Hoạt động"
                        : "Không hoạt động"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 truncate">
                      <Globe className="w-4 h-4 inline mr-1" />
                      {website.url}
                    </p>
                    <p className="text-xs text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Tạo: {formatDate(website.created_at)}
                    </p>
                    {website.last_activity && (
                      <p className="text-xs text-gray-500">
                        <Activity className="w-4 h-4 inline mr-1" />
                        Hoạt động cuối: {formatDate(website.last_activity)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
