"use client";

import { Pagination } from "@heroui/react";
import React, { useState } from "react";

export interface ThePaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export function ThePagination({
  page,
  totalPages,
  onChange,
  className = "justify-center",
}: ThePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => onChange(Math.max(1, page - 1))}
          >
            <Pagination.PreviousIcon />
            <span>Previous</span>
          </Pagination.Previous>
        </Pagination.Item>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link
              isActive={p === page}
              onPress={() => onChange(p)}
            >
              {p}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onChange(Math.min(totalPages, page + 1))}
          >
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

export function PaginationBasic() {
  const [page, setPage] = useState(1);
  const totalPages = 3;

  return (
    <Pagination className="justify-center">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous isDisabled={page === 1} onPress={() => setPage((p) => p - 1)}>
            <Pagination.PreviousIcon />
            <span>Previous</span>
          </Pagination.Previous>
        </Pagination.Item>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Pagination.Item key={p}>
            <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
              {p}
            </Pagination.Link>
          </Pagination.Item>
        ))}
        <Pagination.Item>
          <Pagination.Next isDisabled={page === totalPages} onPress={() => setPage((p) => p + 1)}>
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

export default PaginationBasic;
