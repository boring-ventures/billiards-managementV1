"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Play, 
  StopCircle, 
  Trash,
  Plus
} from "lucide-react";
import { Table, TableSession } from "@prisma/client";
import { 
  calculateSessionDuration, 
  calculateSessionCost, 
  formatPrice, 
  formatDuration 
} from "@/lib/tableUtils";
import { hasAdminPermission } from "@/lib/rbac";
import { StartSessionModal } from "@/components/modals/StartSessionModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

type TableWithSession = Table & {
  sessions: TableSession[];
};

type TableListProps = {
  profile: any; // Replace with proper Profile type
};

export function TableList({ profile }: TableListProps) {
  const router = useRouter();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  const isAdmin = hasAdminPermission(profile);
  
  // Function to fetch tables data
  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (!response.ok) throw new Error("Failed to fetch tables");
      const data = await response.json();
      setTables(data.tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get active session for a table
  const getActiveSession = (table: TableWithSession): TableSession | undefined => {
    if (!table.sessions) return undefined;
    return table.sessions.find(
      (session) => session.endedAt === null
    );
  };

  // Handle start session button click
  const handleStartSession = (table: Table) => {
    setSelectedTable(table);
    setSessionModalOpen(true);
  };

  // Start a new session
  const startSession = async () => {
    if (!selectedTable) return;
    
    try {
      const response = await fetch("/api/tables/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTable.id,
          startedAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error("Failed to start session");
      
      setSessionModalOpen(false);
      fetchTables();
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  // End a session
  const endSession = async (tableId: string) => {
    try {
      const response = await fetch(`/api/tables/sessions/${tableId}/end`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error("Failed to end session");
      
      fetchTables();
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  // Handle delete button click
  const handleDeleteTable = (table: Table) => {
    setSelectedTable(table);
    setDeleteModalOpen(true);
  };

  // Delete a table
  const deleteTable = async () => {
    if (!selectedTable) return;
    
    try {
      const response = await fetch(`/api/tables/${selectedTable.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete table");
      
      setDeleteModalOpen(false);
      fetchTables();
    } catch (error) {
      console.error("Error deleting table:", error);
    }
  };

  // Load tables on component mount
  useEffect(() => {
    fetchTables();
    
    // Set up refresh interval for updating sessions
    const interval = setInterval(fetchTables, 60000); // Refresh every minute
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  if (loading) {
    return <div>Loading tables...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => {
          const activeSession = getActiveSession(table);
          const isBusy = table.status === "BUSY" && !!activeSession;
          
          let sessionTime = 0;
          let sessionCost = 0;
          
          if (isBusy && activeSession) {
            sessionTime = calculateSessionDuration(activeSession);
            sessionCost = calculateSessionCost(activeSession, table);
          }
          
          return (
            <Card key={table.id} className="overflow-hidden">
              <CardHeader className={`
                ${table.status === "AVAILABLE" ? "bg-green-100" : ""}
                ${table.status === "BUSY" ? "bg-red-100" : ""}
                ${table.status === "MAINTENANCE" ? "bg-yellow-100" : ""}
              `}>
                <CardTitle className="flex justify-between items-center">
                  <span>{table.name}</span>
                  <span className="text-sm font-normal">
                    {table.status || "AVAILABLE"}
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span>Hourly Rate:</span>
                    <span>{formatPrice(Number(table.hourlyRate) || 0)}</span>
                  </div>
                  
                  {isBusy && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span>Session Time:</span>
                        <span>{formatDuration(sessionTime)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Current Cost:</span>
                        <span>{formatPrice(sessionCost)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between p-4 pt-0 gap-2">
                {!isBusy ? (
                  <Button 
                    className="flex-1"
                    onClick={() => handleStartSession(table)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                ) : (
                  <Button 
                    className="flex-1"
                    variant="destructive"
                    onClick={() => endSession(table.id)}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                )}
                
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => router.push(`/tables/${table.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={isBusy}
                      onClick={() => handleDeleteTable(table)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {tables.length === 0 && (
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">No tables found</p>
          {isAdmin && (
            <Button onClick={() => router.push("/tables/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Table
            </Button>
          )}
        </div>
      )}
      
      <StartSessionModal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        onConfirm={startSession}
        table={selectedTable}
      />
      
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={deleteTable}
        table={selectedTable}
      />
    </div>
  );
} 