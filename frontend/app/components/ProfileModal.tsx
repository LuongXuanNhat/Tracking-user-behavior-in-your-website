"use client";

import React, { useState, useEffect } from "react";
import { User, X, Save, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import ApiService from "../service/api";

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  company?: string;
  plan?: string;
  created_at: string;
  last_login?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (customer: Customer) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onUpdate,
}: ProfileModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomerProfile();
    }
  }, [isOpen]);

  const loadCustomerProfile = async () => {
    try {
      setLoading(true);
      const result = await ApiService.getCustomerProfile();

      if (result.success && result.data && (result.data as any).customer) {
        const customerData = (result.data as any).customer;
        setCustomer(customerData);
        setFormData({
          name: customerData.name || "",
          company: customerData.company || "",
        });
      }
    } catch (error) {
      console.error("Error loading customer profile:", error);
      alert("Có lỗi xảy ra khi tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await ApiService.updateCustomerProfile(formData);

      if (result.success) {
        // Update customer state with response data
        if (result.data && (result.data as any).customer) {
          const updatedCustomer = (result.data as any).customer;
          setCustomer(updatedCustomer);

          // Update stored customer in localStorage
          const storedCustomer = ApiService.getStoredCustomer();
          if (storedCustomer) {
            const newStoredCustomer = { ...storedCustomer, ...updatedCustomer };
            localStorage.setItem("customer", JSON.stringify(newStoredCustomer));

            // Notify parent component
            if (onUpdate) {
              onUpdate(newStoredCustomer);
            }
          }
        }

        setEditMode(false);
        alert("Cập nhật thông tin thành công!");
      }
    } catch (error) {
      console.error("Error updating customer profile:", error);
      alert("Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        company: customer.company || "",
      });
    }
    setEditMode(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            ) : customer ? (
              <div className="space-y-6">
                {/* Avatar */}
                {/* <div className="flex justify-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-blue-600" />
                  </div>
                </div> */}

                {/* Customer Info */}
                <div className="space-y-4">
                  {editMode ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Họ tên
                        </label>
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Nhập họ tên"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Công ty
                        </label>
                        <Input
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company: e.target.value,
                            })
                          }
                          placeholder="Nhập tên công ty"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Họ tên
                        </label>
                        <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                          {customer.name || "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                          {customer.email}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Công ty
                        </label>
                        <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                          {customer.company || "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gói sử dụng
                        </label>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                          {customer.plan || "Free"}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ngày tham gia
                        </label>
                        <div className="flex items-center text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {formatDate(customer.created_at)}
                        </div>
                      </div>
                      {customer.last_login && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Đăng nhập cuối
                          </label>
                          <div className="flex items-center text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                            {formatDate(customer.last_login)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {editMode ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Hủy
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditMode(true)}>
                      Chỉnh sửa thông tin
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  Không thể tải thông tin tài khoản
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
