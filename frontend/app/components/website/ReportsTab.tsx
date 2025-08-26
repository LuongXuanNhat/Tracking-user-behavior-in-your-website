"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  Filter,
  TrendingUp,
  Activity,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import ApiService from "../../service/api";

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
  event_date: string;
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

interface ReportsTabProps {
  websiteId: string;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface TimeSeriesData {
  period: string;
  visits: number;
  events: number;
}

interface EventsApiResponse {
  events: Event[];
  stats: {
    total_events: number;
    date_range: {
      start_date: string;
      end_date: string;
    };
    filters_applied: {
      website_id: string;
      event_type: string | null;
      visitor_id: string | null;
      session_id: string | null;
    };
  };
  events_by_type: Record<string, number>;
  pagination: {
    limit: number;
    returned_count: number;
  };
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

// Predefined time ranges
const TIME_RANGES = {
  TODAY: "today",
  LAST_7_DAYS: "last_7_days",
  LAST_30_DAYS: "last_30_days",
  CUSTOM: "custom",
};

export default function ReportsTab({ websiteId }: ReportsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(
    TIME_RANGES.LAST_30_DAYS
  );
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Chart data states
  const [topEventsData, setTopEventsData] = useState<ChartData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [deviceData, setDeviceData] = useState<ChartData[]>([]);
  const [pageViewsData, setPageViewsData] = useState<ChartData[]>([]);

  // Insights states
  const [insights, setInsights] = useState({
    topEvent: "",
    peakTime: "",
    totalEvents: 0,
    uniqueVisitors: 0,
  });

  useEffect(() => {
    loadReportData();
  }, [websiteId]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedTimeRange) {
      case TIME_RANGES.TODAY:
        return {
          startDate: today.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
      case TIME_RANGES.LAST_7_DAYS:
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 6);
        return {
          startDate: last7Days.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
      case TIME_RANGES.LAST_30_DAYS:
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 29);
        return {
          startDate: last30Days.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
      case TIME_RANGES.CUSTOM:
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      default:
        const default30Days = new Date(today);
        default30Days.setDate(today.getDate() - 29);
        return {
          startDate: default30Days.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
    }
  };

  const loadReportData = async () => {
    if (!websiteId) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      if (!startDate || !endDate) {
        console.warn("Invalid date range");
        return;
      }

      const params = {
        startDate,
        endDate,
      };

      const result = await ApiService.getEvents(websiteId, params);

      if (result.success && result.data) {
        console.log("Fetched events:", result.data);

        // Extract events array from the response data structure
        const responseData = result.data as EventsApiResponse;

        // Handle both new API response format and potential legacy format
        let eventList: Event[] = [];
        if (Array.isArray(responseData)) {
          // Legacy format: direct array of events
          eventList = responseData;
          console.log("Using legacy API response format (direct array)");
        } else if (responseData.events && Array.isArray(responseData.events)) {
          // New format: object with events array
          eventList = responseData.events;
          console.log("Using new API response format with metadata:", {
            totalEvents: responseData.stats?.total_events,
            eventsByType: responseData.events_by_type,
            pagination: responseData.pagination,
          });
        }

        setEvents(eventList);

        // Update insights with actual data from API response
        const totalEvents =
          responseData.stats?.total_events || eventList.length;
        const uniqueVisitors = new Set(eventList.map((e) => e.visitor_id)).size;

        // Use events_by_type from API response if available
        const eventsByTypeFromApi = responseData.events_by_type || {};
        const topEventFromApi =
          Object.entries(eventsByTypeFromApi).sort(
            ([, a], [, b]) => b - a
          )[0]?.[0] || "N/A";

        setInsights((prev) => ({
          ...prev,
          totalEvents,
          uniqueVisitors,
          topEvent: topEventFromApi,
        }));

        processChartData(eventList, startDate, endDate, responseData);
      }
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (
    eventList: Event[],
    startDate: string,
    endDate: string,
    responseData?: EventsApiResponse
  ) => {
    // Process top events data
    let eventCounts: { [key: string]: number } = {};

    // Use API response data if available for better performance
    if (responseData?.events_by_type) {
      eventCounts = responseData.events_by_type;
    } else {
      // Fallback to client-side processing
      eventList.forEach((event) => {
        const eventName = event.event_name || event.event_type;
        eventCounts[eventName] = (eventCounts[eventName] || 0) + 1;
      });
    }

    const sortedEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const others = Object.entries(eventCounts)
      .slice(5)
      .reduce((sum, [, count]) => sum + count, 0);

    const topEvents = sortedEvents.map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index],
    }));

    if (others > 0) {
      topEvents.push({
        name: "Khác",
        value: others,
        color: COLORS[5] || "#8884D8",
      });
    }

    setTopEventsData(topEvents);

    // Process time series data
    const isToday = selectedTimeRange === TIME_RANGES.TODAY;
    const timeSeriesMap: {
      [key: string]: { visits: Set<string>; events: number };
    } = {};

    eventList.forEach((event) => {
      const eventTime = new Date(event.event_time);
      let period: string;

      if (isToday) {
        // Group by hour for today
        period = eventTime.getHours().toString().padStart(2, "0") + ":00";
      } else {
        // Group by date for multiple days
        period = eventTime.toISOString().split("T")[0];
      }

      if (!timeSeriesMap[period]) {
        timeSeriesMap[period] = { visits: new Set(), events: 0 };
      }

      timeSeriesMap[period].visits.add(event.visitor_id);
      timeSeriesMap[period].events += 1;
    });

    let timeSeriesArray = Object.entries(timeSeriesMap)
      .map(([period, data]) => ({
        period,
        visits: data.visits.size,
        events: data.events,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Fill in missing periods for better visualization
    if (isToday) {
      // Fill missing hours
      const fullHours = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, "0") + ":00";
        const existing = timeSeriesArray.find((item) => item.period === hour);
        return existing || { period: hour, visits: 0, events: 0 };
      });
      timeSeriesArray = fullHours;
    } else {
      // Fill missing dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const fullDates = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const existing = timeSeriesArray.find(
          (item) => item.period === dateStr
        );
        fullDates.push(existing || { period: dateStr, visits: 0, events: 0 });
      }
      timeSeriesArray = fullDates;
    }

    setTimeSeriesData(timeSeriesArray);

    // Process device data
    const deviceCounts: { [key: string]: number } = {};
    eventList.forEach((event) => {
      const device = event.device_type || "Unknown";
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const deviceChartData = Object.entries(deviceCounts).map(
      ([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[index % COLORS.length],
      })
    );

    setDeviceData(deviceChartData);

    // Process page views data
    const pageCounts: { [key: string]: number } = {};
    eventList
      .filter((event) => event.event_type === "pageview")
      .forEach((event) => {
        const page = event.page_url || "Unknown";
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      });

    const pageViewsChartData = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value], index) => ({
        name: name.length > 30 ? name.substring(0, 30) + "..." : name,
        fullName: name, // Store the full URL for tooltip
        value,
        growth: Math.floor(Math.random() * 20) + 1, // Simulated growth data - replace with actual trend calculation
      }));

    setPageViewsData(pageViewsChartData);

    // Calculate peak time insight (not available in API response)
    const peakTimeData = timeSeriesArray.reduce(
      (max, current) => (current.visits > max.visits ? current : max),
      { period: "N/A", visits: 0, events: 0 }
    );

    // Update only the peak time since other insights are calculated from API response
    setInsights((prev) => ({
      ...prev,
      peakTime: isToday ? `${peakTimeData.period}` : peakTimeData.period,
    }));
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    if (range !== TIME_RANGES.CUSTOM) {
      // Auto load data for predefined ranges
      setTimeout(loadReportData, 100);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      loadReportData();
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === "visits") return [`${value} lượt truy cập`, "Lượt truy cập"];
    if (name === "events") return [`${value} sự kiện`, "Sự kiện"];
    if (name === "value") return [`${value} lượt xem`, "Lượt xem trang"];
    return [value, name];
  };

  const formatPieTooltip = (value: any, name: string) => {
    return [`${value} lần`, name];
  };

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Bộ lọc thời gian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khoảng thời gian
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedTimeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
              >
                <option value={TIME_RANGES.TODAY}>Hôm nay</option>
                <option value={TIME_RANGES.LAST_7_DAYS}>7 ngày gần nhất</option>
                <option value={TIME_RANGES.LAST_30_DAYS}>
                  30 ngày gần nhất
                </option>
                <option value={TIME_RANGES.CUSTOM}>Tùy chọn</option>
              </select>
            </div>

            {selectedTimeRange === TIME_RANGES.CUSTOM && (
              <>
                <Input
                  label="Từ ngày"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <Input
                  label="Đến ngày"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
                <Button onClick={handleCustomDateApply}>Áp dụng</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải báo cáo...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="flex items-center p-6">
                <Activity className="w-10 h-10 text-blue-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Tổng sự kiện
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {insights.totalEvents}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="w-10 h-10 text-green-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Unique Visitors
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {insights.uniqueVisitors}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <TrendingUp className="w-10 h-10 text-purple-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Sự kiện phổ biến nhất
                  </p>
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {insights.topEvent}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Clock className="w-10 h-10 text-orange-600 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Thời gian đông nhất
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {insights.peakTime}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Events Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Sự kiện phổ biến nhất</CardTitle>
              </CardHeader>
              <CardContent>
                {topEventsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topEventsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topEventsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={formatPieTooltip}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu sự kiện
                  </div>
                )}
                {insights.topEvent !== "N/A" && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Kết luận:</strong> Sự kiện "{insights.topEvent}"
                      được thực hiện nhiều nhất trong khoảng thời gian này.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Traffic Time Series Chart */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Lượng truy cập theo{" "}
                  {selectedTimeRange === TIME_RANGES.TODAY ? "giờ" : "ngày"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 12 }}
                        angle={
                          selectedTimeRange === TIME_RANGES.TODAY ? 0 : -45
                        }
                        textAnchor={
                          selectedTimeRange === TIME_RANGES.TODAY
                            ? "middle"
                            : "end"
                        }
                        height={
                          selectedTimeRange === TIME_RANGES.TODAY ? 30 : 60
                        }
                      />
                      <YAxis />
                      <Tooltip
                        formatter={formatTooltip}
                        labelFormatter={(label) =>
                          selectedTimeRange === TIME_RANGES.TODAY
                            ? `Giờ: ${label}`
                            : `Ngày: ${label}`
                        }
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                      <Bar
                        dataKey="visits"
                        fill="#8884d8"
                        name="visits"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu truy cập
                  </div>
                )}
                {insights.peakTime !== "N/A" && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Kết luận:</strong> Thời gian{" "}
                      {selectedTimeRange === TIME_RANGES.TODAY ? "giờ" : "ngày"}{" "}
                      "{insights.peakTime}" có lượng truy cập cao nhất.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Usage Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố thiết bị</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={formatPieTooltip}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu thiết bị
                  </div>
                )}
                {deviceData.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Kết luận:</strong> Thiết bị "
                      {
                        deviceData.reduce(
                          (max, current) =>
                            current.value > max.value ? current : max,
                          deviceData[0]
                        )?.name
                      }
                      " được sử dụng nhiều nhất.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Pages Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 trang được xem nhiều nhất</CardTitle>
              </CardHeader>
              <CardContent>
                {pageViewsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart
                      data={pageViewsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "value")
                            return [`${value} lượt xem`, "Lượt xem"];
                          if (name === "growth")
                            return [`${value}%`, "Tăng trưởng"];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Trang: ${label}`}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="value"
                        fill="#82ca9d"
                        name="value"
                        radius={[4, 4, 0, 0]}
                        style={{
                          cursor: "pointer",
                        }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="growth"
                        stroke="#ff7300"
                        strokeWidth={3}
                        dot={{ fill: "#ff7300", strokeWidth: 2, r: 6 }}
                        name="growth"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu page view
                  </div>
                )}
                {pageViewsData.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Kết luận:</strong> Trang "{pageViewsData[0]?.name}
                      " có lượt xem cao nhất với {pageViewsData[0]?.value} lượt
                      xem.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
