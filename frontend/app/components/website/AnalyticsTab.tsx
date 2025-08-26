"use client";

import React from "react";
import { Eye, User, Mouse, Calendar, Filter, Download } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Pagination from "../paging";

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

interface AnalyticsTabProps {
  events: Event[];
  allEvents: Event[];
  eventsLoading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  filters: {
    startDate: string;
    endDate: string;
    eventType: string;
    page: string;
  };
  uniqueEventTypes: string[];
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onFilterChange: (key: string, value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  formatDateTime: (dateString: string) => string;
  getEventTypeColor: (eventType: string) => string;
}

export default function AnalyticsTab({
  events,
  allEvents,
  eventsLoading,
  totalItems,
  currentPage,
  itemsPerPage,
  filters,
  uniqueEventTypes,
  onPageChange,
  onItemsPerPageChange,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  formatDateTime,
  getEventTypeColor,
}: AnalyticsTabProps) {
  return (
    <>
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
              onChange={(e) => onFilterChange("startDate", e.target.value)}
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại sự kiện
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.eventType}
                onChange={(e) => onFilterChange("eventType", e.target.value)}
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
              onChange={(e) => onFilterChange("page", e.target.value)}
              placeholder="Tìm theo URL"
            />
            <div className="flex items-end space-x-2">
              <Button onClick={onApplyFilters}>Áp dụng</Button>
              <Button variant="secondary" onClick={onClearFilters}>
                Xóa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
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
                Events sẽ hiển thị ở đây khi có người dùng tương tác với website
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
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          itemsPerPageOptions={[10, 20, 50]}
        />
      </Card>
    </>
  );
}
