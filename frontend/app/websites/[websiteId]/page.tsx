"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  BarChart3,
  Settings,
  X,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import ApiService from "../../service/api";
import socketService, { RealtimeEvent } from "../../service/socketService";
import {
  AnalyticsTab,
  RealtimeTab,
  ReportsTab,
} from "../../components/website";

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
  const [activeTab, setActiveTab] = useState<
    "analytics" | "realtime" | "reports"
  >("analytics");

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4">
        {/* Stats Cards */}

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
              <button
                onClick={() => setActiveTab("reports")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "reports"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Báo cáo & Biểu đồ
              </button>
            </nav>
          </div>
        </div>

        {/* Analytics Tab Content */}
        {activeTab === "analytics" && (
          <AnalyticsTab
            events={events}
            allEvents={allEvents}
            eventsLoading={eventsLoading}
            totalItems={totalItems}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            filters={filters}
            uniqueEventTypes={uniqueEventTypes}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
            formatDateTime={formatDateTime}
            getEventTypeColor={getEventTypeColor}
          />
        )}

        {/* Realtime Events Tab */}
        {activeTab === "realtime" && (
          <RealtimeTab
            websiteId={websiteId}
            realtimeEvents={realtimeEvents}
            realtimeLoading={realtimeLoading}
            socketConnected={socketConnected}
            realtimeTotalItems={realtimeTotalItems}
            realtimeCurrentPage={realtimeCurrentPage}
            realtimeItemsPerPage={realtimeItemsPerPage}
            onRealtimePageChange={handleRealtimePageChange}
            onRealtimeItemsPerPageChange={handleRealtimeItemsPerPageChange}
            onLoadRealtimeEvents={loadRealtimeEvents}
            formatDateTime={formatDateTime}
            getEventTypeColor={getEventTypeColor}
          />
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && <ReportsTab websiteId={websiteId} />}
      </main>
    </div>
  );
}
