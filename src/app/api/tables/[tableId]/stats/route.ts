import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { startOfToday, startOfWeek, startOfMonth, format, differenceInMinutes } from "date-fns";

// GET /api/tables/[tableId]/stats - Get usage statistics for a specific table
export async function GET(
  req: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const { tableId } = params;
    
    // Get the current user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the profile, which includes the company ID
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // For superadmins, check for a selected company in the request
    let companyId = profile.companyId;
    
    if (profile.role === UserRole.SUPERADMIN && !companyId) {
      const searchParams = req.nextUrl.searchParams;
      const selectedCompanyId = searchParams.get("companyId");
      
      if (!selectedCompanyId) {
        return NextResponse.json(
          { error: "Company ID is required for superadmins" },
          { status: 400 }
        );
      }
      
      companyId = selectedCompanyId;
    }
    
    // Ensure companyId is not null before querying
    if (!companyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 }
      );
    }

    // Check if the table exists and belongs to the company
    const table = await db.table.findFirst({
      where: {
        id: tableId,
        companyId,
      },
    });

    if (!table) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Get date boundaries
    const today = startOfToday();
    const startWeek = startOfWeek(new Date());
    const startMonth = startOfMonth(new Date());

    // Fetch completed sessions from the database
    const sessions = await db.tableSession.findMany({
      where: {
        tableId,
        companyId,
        endedAt: { not: null },
      },
      orderBy: {
        startedAt: "asc",
      },
    });

    // Process for today's data (hourly)
    const todayData = processHourlyData(sessions, today);

    // Process for weekly data (daily)
    const weeklyData = processDailyData(sessions, startWeek);

    // Process for monthly data (weekly)
    const monthlyData = processWeeklyData(sessions, startMonth);

    return NextResponse.json({
      today: todayData,
      week: weeklyData,
      month: monthlyData,
    });
  } catch (error) {
    console.error("Error fetching table statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch table statistics" },
      { status: 500 }
    );
  }
}

// Helper function to process hourly data for today
function processHourlyData(sessions: any[], startDate: Date) {
  const result = [];
  const hours = 24;
  
  for (let i = 0; i < hours; i++) {
    const hourStart = new Date(startDate);
    hourStart.setHours(i, 0, 0, 0);
    
    const hourEnd = new Date(startDate);
    hourEnd.setHours(i, 59, 59, 999);
    
    const hourSessions = sessions.filter(
      (session) => {
        const start = new Date(session.startedAt);
        const end = new Date(session.endedAt || new Date());
        return (
          (start >= hourStart && start <= hourEnd) ||
          (end >= hourStart && end <= hourEnd) ||
          (start <= hourStart && end >= hourEnd)
        );
      }
    );
    
    let totalMinutes = 0;
    let totalRevenue = 0;
    
    hourSessions.forEach((session) => {
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt || new Date());
      
      // Calculate the overlap with this hour
      const overlapStart = start < hourStart ? hourStart : start;
      const overlapEnd = end > hourEnd ? hourEnd : end;
      
      const minutesInHour = Math.max(0, differenceInMinutes(overlapEnd, overlapStart));
      totalMinutes += minutesInHour;
      
      // Calculate revenue based on hourly rate
      const hourlyRate = Number(session.totalCost) / (session.durationMin / 60);
      totalRevenue += (hourlyRate * (minutesInHour / 60));
    });
    
    result.push({
      name: format(hourStart, 'h a'),
      hours: totalMinutes / 60,
      revenue: totalRevenue,
    });
  }
  
  return result;
}

// Helper function to process daily data for this week
function processDailyData(sessions: any[], startDate: Date) {
  const result = [];
  const days = 7;
  
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    const daySessions = sessions.filter(
      (session) => {
        const start = new Date(session.startedAt);
        const end = new Date(session.endedAt || new Date());
        return (
          (start >= dayStart && start <= dayEnd) ||
          (end >= dayStart && end <= dayEnd) ||
          (start <= dayStart && end >= dayEnd)
        );
      }
    );
    
    let totalMinutes = 0;
    let totalRevenue = 0;
    
    daySessions.forEach((session) => {
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt || new Date());
      
      // Calculate the overlap with this day
      const overlapStart = start < dayStart ? dayStart : start;
      const overlapEnd = end > dayEnd ? dayEnd : end;
      
      const minutesInDay = Math.max(0, differenceInMinutes(overlapEnd, overlapStart));
      totalMinutes += minutesInDay;
      
      // Calculate revenue based on hourly rate
      const hourlyRate = Number(session.totalCost) / (session.durationMin / 60);
      totalRevenue += (hourlyRate * (minutesInDay / 60));
    });
    
    result.push({
      name: format(dayStart, 'EEE'),
      hours: totalMinutes / 60,
      revenue: totalRevenue,
    });
  }
  
  return result;
}

// Helper function to process weekly data for this month
function processWeeklyData(sessions: any[], startDate: Date) {
  const result = [];
  const weeks = 4;
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekSessions = sessions.filter(
      (session) => {
        const start = new Date(session.startedAt);
        const end = new Date(session.endedAt || new Date());
        return (
          (start >= weekStart && start <= weekEnd) ||
          (end >= weekStart && end <= weekEnd) ||
          (start <= weekStart && end >= weekEnd)
        );
      }
    );
    
    let totalMinutes = 0;
    let totalRevenue = 0;
    
    weekSessions.forEach((session) => {
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt || new Date());
      
      // Calculate the overlap with this week
      const overlapStart = start < weekStart ? weekStart : start;
      const overlapEnd = end > weekEnd ? weekEnd : end;
      
      const minutesInWeek = Math.max(0, differenceInMinutes(overlapEnd, overlapStart));
      totalMinutes += minutesInWeek;
      
      // Calculate revenue based on hourly rate
      const hourlyRate = Number(session.totalCost) / (session.durationMin / 60);
      totalRevenue += (hourlyRate * (minutesInWeek / 60));
    });
    
    result.push({
      name: `Week ${i + 1}`,
      hours: totalMinutes / 60,
      revenue: totalRevenue,
    });
  }
  
  return result;
} 