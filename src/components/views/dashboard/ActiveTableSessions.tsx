"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { calculateSessionDuration, calculateSessionCost, formatDuration, formatPrice } from "@/lib/tableUtils";
import { TableSession, Table as BilliardTable } from "@prisma/client";

type TableSessionWithTable = TableSession & {
  table: BilliardTable;
};

type ActiveTableSessionsProps = {
  companyId: string;
  fullView?: boolean;
};

export default function ActiveTableSessions({ companyId, fullView = false }: ActiveTableSessionsProps) {
  const [sessions, setSessions] = useState<TableSessionWithTable[]>([]);
  const [loading, setLoading] = useState(true);
  // For live updates of durations
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Update every minute for live duration
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/active-sessions?companyId=${companyId}`);
        if (!response.ok) throw new Error('Failed to fetch active sessions');
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error('Error fetching active sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchActiveSessions();
    }
  }, [companyId]);

  if (loading) {
    return <div>Loading active sessions...</div>;
  }

  if (sessions.length === 0) {
    return <div className="text-muted-foreground text-sm">No active table sessions</div>;
  }

  // Display summary only if not full view and we have more than 3 sessions
  if (!fullView && sessions.length > 3) {
    return (
      <div>
        <div className="mb-2 text-2xl font-bold">{sessions.length}</div>
        <p className="text-muted-foreground text-sm">
          Active table sessions
        </p>
      </div>
    );
  }

  // Get sessions to display (all for fullView, or up to 3 for summary)
  const displaySessions = fullView ? sessions : sessions.slice(0, 3);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Table</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Current Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displaySessions.map((session) => {
          // Calculate current duration in minutes
          const durationMinutes = calculateSessionDuration(session);
          // Calculate current cost
          const currentCost = calculateSessionCost(session, session.table);
          
          return (
            <TableRow key={session.id}>
              <TableCell className="font-medium">{session.table.name}</TableCell>
              <TableCell>{formatDuration(durationMinutes)}</TableCell>
              <TableCell>{formatPrice(currentCost)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
} 