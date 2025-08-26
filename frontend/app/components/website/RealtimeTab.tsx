"use client";

import React from "react";
import { Activity, Mouse } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Pagination from "../paging";
import socketService, { RealtimeEvent } from "../../service/socketService";

interface RealtimeTabProps {
  websiteId: string;
  realtimeEvents: RealtimeEvent[];
  realtimeLoading: boolean;
  socketConnected: boolean;
  realtimeTotalItems: number;
  realtimeCurrentPage: number;
  realtimeItemsPerPage: number;
  onRealtimePageChange: (page: number) => void;
  onRealtimeItemsPerPageChange: (items: number) => void;
  onLoadRealtimeEvents: () => void;
  formatDateTime: (dateString: string) => string;
  getEventTypeColor: (eventType: string) => string;
}

export default function RealtimeTab({
  websiteId,
  realtimeEvents,
  realtimeLoading,
  socketConnected,
  realtimeTotalItems,
  realtimeCurrentPage,
  realtimeItemsPerPage,
  onRealtimePageChange,
  onRealtimeItemsPerPageChange,
  onLoadRealtimeEvents,
  formatDateTime,
  getEventTypeColor,
}: RealtimeTabProps) {
  const handleTestEvent = async () => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
        }/api/tracking/test-broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ websiteId }),
        }
      );
      const result = await response.json();
      console.log("Test broadcast result:", result);
    } catch (error) {
      console.error("Test broadcast error:", error);
    }
  };

  const handleDebug = () => {
    console.log("🔍 Debug Info:");
    console.log("Socket Connected:", socketConnected);
    console.log("Socket Service Connected:", socketService.isConnected());
    console.log("Realtime Events:", realtimeEvents);
    console.log("Website ID:", websiteId);
  };

  return (
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
              onClick={onLoadRealtimeEvents}
              disabled={realtimeLoading}
            >
              {realtimeLoading ? "Loading..." : "Refresh"}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleTestEvent}>
              Test Event
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDebug}>
              Debug
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {realtimeLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Đang tải realtime events...</p>
          </div>
        ) : realtimeEvents.length === 0 ? (
          <div className="text-center py-8">
            <Mouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {socketConnected ? "Chưa có events realtime" : "Đang kết nối..."}
            </h3>
            <p className="text-gray-600">
              {socketConnected
                ? "Realtime events sẽ hiển thị ở đây khi có hoạt động mới trên website."
                : "Đang thiết lập kết nối realtime để nhận events..."}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Status: {socketConnected ? "✅ Connected" : "🔄 Connecting..."}
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
        onPageChange={onRealtimePageChange}
        onItemsPerPageChange={onRealtimeItemsPerPageChange}
        itemsPerPageOptions={[10, 20, 50]}
      />
    </Card>
  );
}
