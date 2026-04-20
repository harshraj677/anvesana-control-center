import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** GET /api/dashboard/stats — dashboard stats (role-aware) */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  if (payload.role === "admin") {
    const [empRows] = await db.execute<any[]>(
      "SELECT COUNT(*) as total FROM Employee WHERE role != 'admin'"
    );
    const totalEmployees = Number((empRows as any[])[0].total);

    const [presentRows] = await db.execute<any[]>(
      "SELECT COUNT(*) as total FROM Attendance WHERE date = ? AND checkIn IS NOT NULL",
      [todayStr]
    );
    const presentToday = Number((presentRows as any[])[0].total);

    const [lateRows] = await db.execute<any[]>(
      "SELECT COUNT(*) as total FROM Attendance WHERE date = ? AND status = 'late'",
      [todayStr]
    );
    const lateToday = Number((lateRows as any[])[0].total);

    const [leaveRows] = await db.execute<any[]>(
      "SELECT COUNT(*) as total FROM LeaveRequest WHERE status = 'approved' AND startDate <= ? AND endDate >= ?",
      [todayStr, todayStr]
    );
    const onLeave = Number((leaveRows as any[])[0].total);

    const [pendingRows] = await db.execute<any[]>(
      "SELECT COUNT(*) as total FROM LeaveRequest WHERE status = 'pending'"
    );
    const pendingLeaveRequests = Number((pendingRows as any[])[0].total);

    const percentPresent = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return NextResponse.json({
      totalEmployees,
      presentToday,
      lateToday,
      onLeave,
      pendingLeaveRequests,
      percentPresent,
    });
  }

  // Employee personal stats
  const [myAttendance] = await db.execute<any[]>(
    "SELECT COUNT(*) as total FROM Attendance WHERE employeeId = ? AND EXTRACT(MONTH FROM date)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int AND EXTRACT(YEAR FROM date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int",
    [payload.id]
  );
  const [myLateCount] = await db.execute<any[]>(
    "SELECT COUNT(*) as total FROM Attendance WHERE employeeId = ? AND status = 'late' AND EXTRACT(MONTH FROM date)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int AND EXTRACT(YEAR FROM date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int",
    [payload.id]
  );
  const [myLeaves] = await db.execute<any[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE employeeId = ? AND status = 'approved' AND EXTRACT(MONTH FROM startDate)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int AND EXTRACT(YEAR FROM startDate)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int",
    [payload.id]
  );
  const [myPending] = await db.execute<any[]>(
    "SELECT COUNT(*) as total FROM LeaveRequest WHERE employeeId = ? AND status = 'pending'",
    [payload.id]
  );
  const [empInfo] = await db.execute<any[]>(
    "SELECT leaveBalance FROM Employee WHERE id = ?",
    [payload.id]
  );

  return NextResponse.json({
    monthlyAttendance: Number((myAttendance as any[])[0].total),
    monthlyLate: Number((myLateCount as any[])[0].total),
    monthlyLeaves: Number((myLeaves as any[])[0].total),
    pendingRequests: Number((myPending as any[])[0].total),
    leaveBalance: (empInfo as any[])[0]?.leaveBalance ?? 0,
  });
}
