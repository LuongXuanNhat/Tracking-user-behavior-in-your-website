"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Calendar,
  User,
  Mouse,
  Eye,
  Filter,
  Download,
  Activity,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import ApiService from "../../service/api";
import Pagination from "@/app/components/paging";
import socketService, { RealtimeEvent } from "../../service/socketService";

interface Event {
  event_id: string;
  event_type: string;
  event_name: string;
  page_url: string;
  page_title?: string;
  visitor_id: string;
  session_id: string;
  user_id?: string;
  event_time: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  element_selector?: string;
  element_text?: string;
  properties?: Record<string, any>;
}

interface Website {
  website_id: string;
  name: string;
  url: string;
  domain: string;
  status: string;
  created_at: string;
  api_key: string;
  id: string;
  last_activity: null;
  updated_at: string;
}

interface EventsResponse {
  events: Event[];
}

export default function WebsiteDetail() {
  const router = useRouter();
  const params = useParams();
  const websiteId = params.websiteId as string;
  const [totalItems, setTotalItems] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<"analytics" | "realtime">(
    "analytics"
  );

  // Settings popup state
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);

  const [website, setWebsite] = useState<Website | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Store all events for stats
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    eventType: "",
    page: "",
  });

  // Realtime states
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeCurrentPage, setRealtimeCurrentPage] = useState(1);
  const [realtimeItemsPerPage, setRealtimeItemsPerPage] = useState(10);
  const [realtimeTotalItems, setRealtimeTotalItems] = useState(0);

  useEffect(() => {
    if (!ApiService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    // Validate websiteId
    if (!websiteId || websiteId === "undefined" || websiteId === "null") {
      console.error("Invalid websiteId:", websiteId);
      router.push("/dashboard");
      return;
    }

    loadWebsiteData();
    loadEvents();

    // Initialize socket connection when component mounts
    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketService.isConnected()) {
        socketService.unsubscribeFromWebsite(websiteId);
        socketService.disconnect();
      }
    };
  }, [websiteId, router]);

  useEffect(() => {
    loadEvents();
  }, [currentPage, itemsPerPage, filters]);

  useEffect(() => {
    if (activeTab === "realtime" && socketConnected) {
      loadRealtimeEvents();
    }
  }, [activeTab, socketConnected, realtimeCurrentPage, realtimeItemsPerPage]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsPopup) {
        const target = event.target as Element;
        if (!target.closest(".settings-popup-container")) {
          setShowSettingsPopup(false);
        }
      }
    };

    if (showSettingsPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettingsPopup]);

  // Force check socket connection status periodically
  useEffect(() => {
    const checkConnectionStatus = () => {
      const actuallyConnected = socketService.isConnected();
      if (actuallyConnected !== socketConnected) {
        console.log("🔄 Updating socket connection status:", actuallyConnected);
        setSocketConnected(actuallyConnected);
      }
    };

    // Check immediately
    checkConnectionStatus();

    // Check every 2 seconds
    const interval = setInterval(checkConnectionStatus, 2000);

    return () => clearInterval(interval);
  }, [socketConnected]);

  // Initialize Socket connection
  const initializeSocket = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      await socketService.init(token);

      socketService.setCallbacks({
        onConnect: () => {
          console.log("✅ Socket connected successfully");
          setSocketConnected(true);
        },
        onDisconnect: () => {
          console.log("❌ Socket disconnected");
          setSocketConnected(false);
        },
        onNewEvent: (data) => {
          console.log("🔔 New event received:", data);
          if (data.websiteId === websiteId) {
            console.log(
              "✅ Event belongs to current website, adding to realtime events"
            );
            // Add new event to the beginning of the list
            setRealtimeEvents((prev) => {
              const newEvents = [data.event, ...prev];
              console.log(
                "📊 Updated realtime events count:",
                newEvents.length
              );
              // If we're on the first page, show the new event immediately
              if (realtimeCurrentPage === 1) {
                // Keep only the current page worth of events
                return newEvents.slice(0, realtimeItemsPerPage);
              } else {
                // If we're not on the first page, keep the current events but update total
                return prev;
              }
            });

            // Always increment total items count
            setRealtimeTotalItems((prev) => {
              const newTotal = prev + 1;
              console.log("📈 Updated total items:", newTotal);
              return newTotal;
            });

            // Show notification if user is not on first page
            if (realtimeCurrentPage !== 1) {
              console.log("ℹ️  New event received! Go to page 1 to see it.");
              // You could show a toast notification here
            }
          } else {
            console.log(
              "⚠️  Event belongs to different website:",
              data.websiteId,
              "current:",
              websiteId
            );
          }
        },
        onSubscriptionSuccess: (data) => {
          console.log("Successfully subscribed to website:", data.websiteId);
        },
        onSubscriptionError: (data) => {
          console.error("Failed to subscribe to website:", data);
        },
        onError: (error) => {
          console.error("Socket error:", error);
          setSocketConnected(false);
        },
      });

      // Subscribe to this website's events
      await socketService.subscribeToWebsite(websiteId);
    } catch (error) {
      console.error("Failed to initialize socket:", error);
      setSocketConnected(false);
    }
  };

  // Load realtime events
  const loadRealtimeEvents = async () => {
    if (!websiteId || websiteId === "undefined") {
      console.error("Cannot load realtime events: Invalid websiteId");
      return;
    }

    setRealtimeLoading(true);
    try {
      // Call realtime API endpoint
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
        }/api/realtime/events/${websiteId}?page=${realtimeCurrentPage}&limit=${realtimeItemsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRealtimeEvents(result.data.events || []);
          setRealtimeTotalItems(
            result.data.pagination?.totalEvents ||
              result.data.events?.length ||
              0
          );
        }
      } else {
        console.error("Failed to load realtime events:", response.statusText);
      }
    } catch (error) {
      console.error("Error loading realtime events:", error);
    } finally {
      setRealtimeLoading(false);
    }
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Realtime pagination handlers
  const handleRealtimePageChange = (page: number) => {
    setRealtimeCurrentPage(page);
  };

  const handleRealtimeItemsPerPageChange = (items: number) => {
    setRealtimeItemsPerPage(items);
    setRealtimeCurrentPage(1); // Reset to first page when changing items per page
  };

  const loadWebsiteData = async () => {
    if (!websiteId || websiteId === "undefined") {
      console.error("Cannot load website data: Invalid websiteId");
      return;
    }

    try {
      const result = await ApiService.getWebsiteById(websiteId);
      if (result.success && result.data) {
        console.log("Website data loaded:", result.data);
        setWebsite(result.data as Website);
      }
    } catch (error) {
      console.error("Error loading website:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!websiteId || websiteId === "undefined") {
      console.error("Cannot load events: Invalid websiteId");
      return;
    }

    setEventsLoading(true);
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const result = await ApiService.getEvents(websiteId, params);
      if (result.success && result.data) {
        const responseData = result.data as EventsResponse;
        let eventList = Array.isArray(responseData?.events)
          ? responseData.events
          : [];

        // Apply client-side filters
        if (filters.eventType) {
          eventList = eventList.filter(
            (event: Event) => event.event_type === filters.eventType
          );
        }
        if (filters.page) {
          eventList = eventList.filter((event: Event) =>
            event.page_url.toLowerCase().includes(filters.page.toLowerCase())
          );
        }

        setAllEvents(eventList); // Store filtered events for stats
        setTotalItems(eventList.length);

        // Apply pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedEvents = eventList.slice(startIndex, endIndex);

        setEvents(paginatedEvents);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setEventsLoading(false);
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    loadEvents();
  };

  const clearFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      eventType: "",
      page: "",
    });
    setCurrentPage(1); // Reset to first page when clearing filters
    setTimeout(loadEvents, 100);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      pageview: "bg-blue-100 text-blue-800",
      click: "bg-green-100 text-green-800",
      scroll: "bg-yellow-100 text-yellow-800",
      form_submit: "bg-purple-100 text-purple-800",
      purchase: "bg-red-100 text-red-800",
      default: "bg-gray-100 text-gray-800",
    };
    return colors[eventType] || colors.default;
  };

  const uniqueEventTypes = [...new Set(allEvents.map((e) => e.event_type))];

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
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Quay lại</span>
              </Button>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {website?.name}
                  </h1>
                  <span
                    className={`ml-1 inline-block w-2 h-2 rounded-full ${
                      website?.status === "active"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                </div>
                <p className="text-gray-600 flex items-center">
                  <Globe className="w-4 h-4 mr-1" />
                  {website?.url}
                </p>
              </div>
            </div>

            {/* Settings Button */}
            <div className="relative settings-popup-container">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                className="flex items-center"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Settings Popup */}
              {showSettingsPopup && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Thông tin Website
                      </h3>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSettingsPopup(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {website && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Tên Website
                          </label>
                          <p className="text-sm text-gray-900">
                            {website.name}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            URL
                          </label>
                          <p className="text-sm text-gray-900 break-all">
                            {website.url}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Domain
                          </label>
                          <p className="text-sm text-gray-900">
                            {website.domain}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Trạng thái
                          </label>
                          <span
                            className={`ml-2 inline-block px-2 py-1 text-xs rounded-full ${
                              website.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {website.status === "active"
                              ? "Hoạt động"
                              : "Ngưng hoạt động"}
                          </span>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            API Key
                          </label>
                          <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">
                            {website.api_key}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Ngày tạo
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(website.created_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Cập nhật lần cuối
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(website.updated_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            ID
                          </label>
                          <p className="text-sm text-gray-900">{website.id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Eye className="w-10 h-10 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allEvents.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <User className="w-10 h-10 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Unique Visitors
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(allEvents.map((e) => e.visitor_id)).size}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Mouse className="w-10 h-10 text-purple-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allEvents.filter((e) => e.event_type === "pageview").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <Calendar className="w-10 h-10 text-orange-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(allEvents.map((e) => e.session_id)).size}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {/* <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Ngày bắt đầu"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
              <Input
                label="Ngày kết thúc"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại sự kiện
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.eventType}
                  onChange={(e) =>
                    handleFilterChange("eventType", e.target.value)
                  }
                >
                  <option value="">Tất cả</option>
                  {uniqueEventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Trang"
                value={filters.page}
                onChange={(e) => handleFilterChange("page", e.target.value)}
                placeholder="Tìm theo URL"
              />
              <div className="flex items-end space-x-2">
                <Button onClick={applyFilters}>Áp dụng</Button>
                <Button variant="secondary" onClick={clearFilters}>
                  Xóa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "analytics"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Danh sách sự kiện
              </button>
              <button
                onClick={() => setActiveTab("realtime")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "realtime"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Theo thời gian thực
                {socketConnected && (
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Analytics Tab Content */}
        {activeTab === "analytics" && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Bộ lọc
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    label="Ngày bắt đầu"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                  <Input
                    label="Ngày kết thúc"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại sự kiện
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.eventType}
                      onChange={(e) =>
                        handleFilterChange("eventType", e.target.value)
                      }
                    >
                      <option value="">Tất cả</option>
                      {uniqueEventTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Trang"
                    value={filters.page}
                    onChange={(e) => handleFilterChange("page", e.target.value)}
                    placeholder="Tìm theo URL"
                  />
                  <div className="flex items-end space-x-2">
                    <Button onClick={applyFilters}>Áp dụng</Button>
                    <Button variant="secondary" onClick={clearFilters}>
                      Xóa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Events Table - Analytics Tab */}
        {activeTab === "analytics" && (
          <Card className="pb-6">
            <CardHeader>
              <div className="flex justify-between items-center pb-1">
                <CardTitle>Danh sách Events</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Đang tải events...</p>
                </div>
              ) : allEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Chưa có event nào
                  </h3>
                  <p className="text-gray-600">
                    Events sẽ hiển thị ở đây khi có người dùng tương tác với
                    website
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thời gian
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loại sự kiện
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trang
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visitor ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thiết bị
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vị trí
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {events.map((event) => (
                        <tr key={event.event_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(event.event_time)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(
                                event.event_type
                              )}`}
                            >
                              {event.event_name || event.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            <span title={event.page_url}>
                              {event.page_title || event.page_url}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {event.visitor_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.device_type && (
                              <div>
                                <div>{event.device_type}</div>
                                {event.browser && (
                                  <div className="text-xs">{event.browser}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.country && (
                              <div>
                                <div>{event.country}</div>
                                {event.city && (
                                  <div className="text-xs">{event.city}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPageOptions={[10, 20, 50]}
            />
          </Card>
        )}

        {/* Realtime Events Tab */}
        {activeTab === "realtime" && (
          <Card className="pb-6">
            <CardHeader>
              <div className="flex justify-between items-center pb-1">
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Realtime Events
                  {socketConnected ? (
                    <span className="ml-2 flex items-center text-sm text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="ml-2 flex items-center text-sm text-red-600">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      Disconnected
                    </span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">
                    ({realtimeEvents.length} events)
                  </span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadRealtimeEvents}
                    disabled={realtimeLoading}
                  >
                    {realtimeLoading ? "Loading..." : "Refresh"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `${
                            process.env.NEXT_PUBLIC_API_URL ||
                            "http://localhost:3002"
                          }/api/tracking/test-broadcast`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${localStorage.getItem(
                                "token"
                              )}`,
                            },
                            body: JSON.stringify({ websiteId }),
                          }
                        );
                        const result = await response.json();
                        console.log("Test broadcast result:", result);
                      } catch (error) {
                        console.error("Test broadcast error:", error);
                      }
                    }}
                  >
                    Test Event
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      console.log("🔍 Debug Info:");
                      console.log("Socket Connected:", socketConnected);
                      console.log(
                        "Socket Service Connected:",
                        socketService.isConnected()
                      );
                      console.log("Realtime Events:", realtimeEvents);
                      console.log("Website ID:", websiteId);
                      console.log("Active Tab:", activeTab);
                    }}
                  >
                    Debug
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {realtimeLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    Đang tải realtime events...
                  </p>
                </div>
              ) : realtimeEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Mouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {socketConnected
                      ? "Chưa có events realtime"
                      : "Đang kết nối..."}
                  </h3>
                  <p className="text-gray-600">
                    {socketConnected
                      ? "Realtime events sẽ hiển thị ở đây khi có hoạt động mới trên website."
                      : "Đang thiết lập kết nối realtime để nhận events..."}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Status:{" "}
                    {socketConnected ? "✅ Connected" : "🔄 Connecting..."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thời gian
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loại sự kiện
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trang
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visitor ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thiết bị
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vị trí
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {realtimeEvents.map((event) => (
                        <tr key={event.event_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(event.event_time)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(
                                event.event_type
                              )}`}
                            >
                              {event.event_name || event.event_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                            <span title={event.page_url}>
                              {event.page_title || event.page_url}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {event.visitor_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.device_type && (
                              <div>
                                <div>{event.device_type}</div>
                                {event.browser && (
                                  <div className="text-xs">{event.browser}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.country && (
                              <div>
                                <div>{event.country}</div>
                                {event.city && (
                                  <div className="text-xs">{event.city}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <Pagination
              currentPage={realtimeCurrentPage}
              totalItems={realtimeTotalItems}
              itemsPerPage={realtimeItemsPerPage}
              onPageChange={handleRealtimePageChange}
              onItemsPerPageChange={handleRealtimeItemsPerPageChange}
              itemsPerPageOptions={[10, 20, 50]}
            />
          </Card>
        )}
      </main>
    </div>
  );
}
