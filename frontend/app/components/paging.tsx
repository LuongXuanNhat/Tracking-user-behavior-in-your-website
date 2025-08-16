import React from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50],
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Tính toán các trang hiển thị
  const getVisiblePages = () => {
    const delta = 1; // Số trang hiển thị ở mỗi bên của trang hiện tại
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [];

  // Tính toán thông tin hiển thị
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 px-4">
        <div className="text-sm text-gray-700">
          Hiển thị <span className="font-medium">{startItem}</span> đến{" "}
          <span className="font-medium">{endItem}</span> trong tổng số{" "}
          <span className="font-medium">{totalItems}</span> kết quả
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Hiển thị:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">mục/trang</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 px-4">
      {/* Thông tin hiển thị */}
      <div className="text-sm text-gray-700">
        Hiển thị <span className="font-medium">{startItem}</span> đến{" "}
        <span className="font-medium">{endItem}</span> trong tổng số{" "}
        <span className="font-medium">{totalItems}</span> kết quả
      </div>

      {/* Phân trang */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Số mục mỗi trang */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Hiển thị:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">mục/trang</span>
        </div>

        {/* Nút phân trang */}
        <div className="flex items-center gap-1">
          {/* Nút Previous */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          {/* Các trang */}
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === "..." ? (
                <span className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border-t border-b border-gray-300">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`px-3 py-2 text-sm font-medium border border-gray-300 ${
                    currentPage === page
                      ? "text-blue-600 bg-blue-50 border-blue-500"
                      : "text-gray-500 bg-white hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Nút Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
