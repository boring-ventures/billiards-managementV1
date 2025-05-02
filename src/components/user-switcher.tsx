"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { cookieUtils, USER_ID_COOKIE } from "@/lib/cookie-utils";

// TypeScript interface for Superadmin user
interface SuperAdmin {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export function UserSwitcher() {
  const [superadmins, setSuperadmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch all superadmins on component mount
  useEffect(() => {
    const fetchSuperadmins = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/superadmins');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        setSuperadmins(data.superadmins);
        
        // Set the initially selected user ID from cookie
        const currentUserId = cookieUtils.get(USER_ID_COOKIE);
        if (currentUserId && data.superadmins.some((admin: SuperAdmin) => admin.userId === currentUserId)) {
          setSelectedUser(currentUserId);
        } else if (data.superadmins.length > 0) {
          setSelectedUser(data.superadmins[0].userId);
          cookieUtils.set(USER_ID_COOKIE, data.superadmins[0].userId, {
            expires: 1, // 1 day
            sameSite: 'lax'
          });
        }
      } catch (error) {
        console.error("Error fetching superadmins:", error);
        toast({
          title: "Error",
          description: "Failed to load superadmin accounts",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuperadmins();
  }, [toast]);
  
  // Handle user selection change
  const handleUserChange = (userId: string) => {
    setSelectedUser(userId);
    
    // Store in cookie using our utility
    cookieUtils.set(USER_ID_COOKIE, userId, {
      expires: 1, // 1 day
      sameSite: 'lax'
    });
    
    // Reload the page to apply the new user
    window.location.reload();
    
    toast({
      title: "User Switched",
      description: "Successfully switched to another superadmin account",
    });
  };
  
  if (loading || superadmins.length === 0) {
    return null; // Don't render anything while loading or if no superadmins
  }
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <CardTitle className="mb-2 text-sm">Switch Superadmin</CardTitle>
        <Select
          value={selectedUser || undefined}
          onValueChange={handleUserChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a superadmin" />
          </SelectTrigger>
          <SelectContent>
            {superadmins.map((admin) => (
              <SelectItem key={admin.userId} value={admin.userId}>
                {admin.firstName} {admin.lastName} ({admin.userId.substring(0, 8)}...)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
} 