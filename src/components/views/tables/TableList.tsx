"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from '@/context/view-mode-context';
import { useAuth } from '@/hooks/use-auth';
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
  Plus,
  WrenchIcon
} from "lucide-react";
import { Table, TableSession } from "@prisma/client";
import { 
  calculateSessionDuration, 
  calculateSessionCost, 
  formatPrice, 
  formatDuration 
} from "@/lib/tableUtils";
import { WithPermission } from "@/components/ui/permission-button";
import { StartSessionModal } from "@/components/modals/StartSessionModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScheduleMaintenanceForm } from "@/components/views/tables/ScheduleMaintenanceForm";
import Link from "next/link";
import { Profile } from "@/hooks/use-auth";

type TableWithSession = Table & {
  sessions: TableSession[];
};

type TableListProps = {
  profile: Profile | null;
  searchQuery?: string;
  statusFilter?: string;
  refreshKey?: number;
};

export function TableList({ 
  profile, 
  searchQuery = "", 
  statusFilter = "all",
  refreshKey = 0 
}: TableListProps) {
  const router = useRouter();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { viewMode } = useViewMode();
  const { hasPermissionClient } = useAuth();
  const canEditTables = hasPermissionClient("tables", "edit");
  const canDeleteTables = hasPermissionClient("tables", "delete");
  
  // Function to fetch tables data
  const fetchTables = async () => {
    try {
      // Get companyId from profile or localStorage for superadmins
      let companyId = profile?.companyId;
      let apiUrl = '/api/tables';
      
      // For superadmins, get selected company from localStorage
      if (profile?.role === "SUPERADMIN" && typeof window !== 'undefined') {
        const selectedCompanyId = localStorage.getItem('selectedCompanyId');
        if (selectedCompanyId) {
          companyId = selectedCompanyId;
          apiUrl += `?companyId=${companyId}`;
        }
        // If no company is selected for superadmin, don't append companyId parameter
        // The API will return all tables across companies
      } else if (companyId) {
        // For regular users, always use their assigned company
        apiUrl += `?companyId=${companyId}`;
      }
      
      console.log(`Fetching tables with URL: ${apiUrl}`);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch tables: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.tables?.length || 0} tables`);
      setTables(data.tables || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to tables
  useEffect(() => {
    if (!tables.length) return;
    
    let filtered = [...tables];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(table => 
        table.name.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(table => 
        table.status === statusFilter
      );
    }
    
    setFilteredTables(filtered);
  }, [tables, searchQuery, statusFilter]);

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

  // Handle schedule maintenance button click
  const handleScheduleMaintenance = (table: Table) => {
    setSelectedTable(table);
    setMaintenanceDialogOpen(true);
  };

  // Load tables on component mount and when refreshKey changes
  useEffect(() => {
    fetchTables();
    
    // Set up refresh interval for updating sessions
    const interval = setInterval(fetchTables, 60000); // Refresh every minute
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshKey]);

  if (loading) {
    return <div>Loading tables...</div>;
  }

  if (filteredTables.length === 0 && tables.length > 0) {
    return (
      <div className="my-8 text-center p-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground mb-4">No tables found matching your filters.</p>
        <Button
          variant="outline"
          onClick={() => {
            // Reset filters
            router.push("/dashboard/tables");
          }}
        >
          Reset Filters
        </Button>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="my-8 text-center p-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground mb-4">No tables found.</p>
        {canEditTables && (
          <Link href="/dashboard/tables/new" passHref>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {loading ? (
        <p>Loading tables...</p>
      ) : filteredTables.length === 0 ? (
        <p>No tables found. Try adjusting your filters or create a new table.</p>
      ) : (
        filteredTables.map((table) => {
          const activeSession = getActiveSession(table);
          const isTableActive = !!activeSession;
          
          return (
            <Card key={table.id} className={`overflow-hidden ${isTableActive ? 'border-green-400 border-2' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>{table.name}</span>
                  {table.status === "MAINTENANCE" && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      Maintenance
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="text-sm text-muted-foreground">
                  <div>Type: {table.type}</div>
                  <div>Rate: {formatPrice(table.hourlyRate)}/hr</div>
                  {isTableActive && activeSession && (
                    <div className="mt-2 text-green-600 dark:text-green-400">
                      <div>Duration: {formatDuration(calculateSessionDuration(activeSession))}</div>
                      <div>Current Cost: {formatPrice(calculateSessionCost(activeSession, table.hourlyRate))}</div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-wrap gap-2 pt-2">
                {isTableActive ? (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => endSession(table.id)}
                  >
                    <StopCircle className="mr-1 h-4 w-4" /> End
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="flex-1"
                    onClick={() => handleStartSession(table)}
                    disabled={table.status === "MAINTENANCE"}
                  >
                    <Play className="mr-1 h-4 w-4" /> Start
                  </Button>
                )}
                
                <WithPermission sectionKey="tables" action="edit">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleScheduleMaintenance(table)}
                  >
                    <WrenchIcon className="mr-1 h-4 w-4" />
                    {table.status === "MAINTENANCE" ? "Update" : "Maintain"}
                  </Button>
                </WithPermission>
                
                <WithPermission sectionKey="tables" action="edit">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link href={`/dashboard/tables/${table.id}/edit`}>
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                </WithPermission>
                
                <WithPermission sectionKey="tables" action="delete">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDeleteTable(table)}
                  >
                    <Trash className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </WithPermission>
              </CardFooter>
            </Card>
          );
        })
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
        title="Delete Table"
        message={`Are you sure you want to delete ${selectedTable?.name}? This action cannot be undone.`}
      />
      
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <ScheduleMaintenanceForm
            table={selectedTable}
            onClose={() => setMaintenanceDialogOpen(false)}
            onSuccess={() => {
              setMaintenanceDialogOpen(false);
              fetchTables();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 