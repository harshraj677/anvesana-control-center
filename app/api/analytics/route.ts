import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** GET /api/analytics — admin analytics data */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  // Attendance trend: last 30 days daily stats
  const [trendRows] = await db.execute<any[]>(`
    SELECT
      TO_CHAR(a.date, 'Mon DD') as date,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      (SELECT COUNT(*) FROM "Employee" WHERE role != 'admin') -
        COUNT(DISTINCT a."employeeId") as absent
    FROM "Attendance" a
    WHERE a.date >= CURRENT_DATE - INTERVAL '30 DAY'
    GROUP BY a.date
    ORDER BY a.date ASC
  `);

  // Department-wise attendance (current month)
  const [deptRows] = await db.execute<any[]>(`
    SELECT
      COALESCE(e.department, 'Unassigned') as department,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status = 'absent' OR a.status IS NULL THEN 1 ELSE 0 END) as absent
    FROM "Employee" e
    LEFT JOIN "Attendance" a ON a."employeeId" = e.id
      AND EXTRACT(MONTH FROM a.date)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND EXTRACT(YEAR FROM a.date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int
    WHERE e.role != 'admin'
    GROUP BY e.department
  `);

  // Monthly leave requests breakdown
  const [leaveMonthly] = await db.execute<any[]>(`
    SELECT
      TO_CHAR("createdAt", 'Mon') as month,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM "LeaveRequest"
    WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 MONTH'
    GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt"), TO_CHAR("createdAt", 'Mon')
    ORDER BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt") ASC
  `);

  // Employee attendance ranking (current month)
  const [rankingRows] = await db.execute<any[]>(`
    SELECT
      e.id, e."fullName", e.department,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as "presentDays",
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as "lateDays",
      COUNT(a.id) as "totalDays"
    FROM "Employee" e
    LEFT JOIN "Attendance" a ON a."employeeId" = e.id
      AND EXTRACT(MONTH FROM a.date)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND EXTRACT(YEAR FROM a.date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int
    WHERE e.role != 'admin'
    GROUP BY e.id, e."fullName", e.department
    ORDER BY "presentDays" DESC
    LIMIT 10
  `);

  // Suspicious activity count
  const [suspiciousRows] = await db.execute<any[]>(
    `SELECT COUNT(*) as total FROM "SuspiciousLog" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 DAY'`
  );

  return NextResponse.json({
    attendanceTrend: trendRows,
    departmentAttendance: deptRows,
    leaveMonthly,
    employeeRanking: rankingRows,
    suspiciousCount: Number((suspiciousRows as any[])[0].total),
  });
}
