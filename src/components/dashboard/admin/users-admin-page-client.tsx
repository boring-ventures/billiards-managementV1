"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { UserRole } from "@prisma/client";

type User = {
  id: string;
  email: string;
  profile?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    active: boolean;
  } | null;
};

export default function UsersAdminPageClient() {
  const router = useRouter();
  const { profile, isLoading } = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Check if user is superadmin
  const isSuperAdmin = profile && (
    profile.role === "SUPERADMIN" ||
    String(profile.role).toUpperCase() === "SUPERADMIN"
  );

  useEffect(() => {
    if (!isLoading) {
      if (!profile || !isSuperAdmin) {
        toast({
          title: "Access Denied",
          description: "Only superadmins can access this page",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      fetchUsers();
    }
  }, [isLoading, profile, router, isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin/users");
      
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUser(userId);
      
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: newRole,
          updateMetadata: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error updating role: ${response.status}`);
      }
      
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
      
      // Update the local state to reflect the change
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            profile: user.profile 
              ? { ...user.profile, role: newRole } 
              : { id: "", firstName: null, lastName: null, role: newRole, active: true }
          };
        }
        return user;
      }));
      
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the platform
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <CardTitle>User Administration</CardTitle>
          </div>
          <CardDescription>
            Update roles for users in the system. Be careful when assigning superadmin privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {user.profile?.firstName || user.profile?.lastName 
                          ? `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
                          : "No name set"}
                      </TableCell>
                      <TableCell>
                        {updatingUser === user.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <Select
                            value={user.profile?.role || "USER"}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">USER</SelectItem>
                              <SelectItem value="SELLER">SELLER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            user.profile?.active
                              ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                              : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                          }`}
                        >
                          {user.profile?.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Implement view/edit user details
                            toast({
                              title: "Coming Soon",
                              description: "User detail view is under development",
                            });
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 