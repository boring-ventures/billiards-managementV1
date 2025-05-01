"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableStatusFilterProps {
  onStatusChange: (status: string) => void;
  currentStatus?: string;
}

export function TableStatusFilter({
  onStatusChange,
  currentStatus = "",
}: TableStatusFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">Status:</span>
      <Select 
        value={currentStatus} 
        onValueChange={onStatusChange}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="AVAILABLE">Available</SelectItem>
          <SelectItem value="BUSY">Busy</SelectItem>
          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 