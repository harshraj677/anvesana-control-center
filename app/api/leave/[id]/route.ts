import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** PUT /api/leave/:id — admin approves or rejects */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  const [leaveRows] = await db.execute<any[]>(
    "SELECT id, employeeId, days, status FROM LeaveRequest WHERE id = ?",
    [id]
  );
  const leave = (leaveRows as any[])[0];
  if (!leave) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  if (leave.status !== "pending") {
    return NextResponse.json({ error: `Cannot ${body.action} a request that is already ${leave.status}.` }, { status: 400 });
  }

  if (body.action === "approve") {
    const [empRows] = await db.execute<any[]>(
      "SELECT leaveBalance FROM Employee WHERE id = ?",
      [leave.employeeId]
    );
    const emp = (empRows as any[])[0];
    if (!emp || emp.leaveBalance < leave.days) {
      return NextResponse.json({ error: "Insufficient leave balance to approve." }, { status: 400 });
    }

    await db.execute("UPDATE LeaveRequest SET status = 'approved' WHERE id = ?", [id]);
    await db.execute(
      "UPDATE Employee SET leaveBalance = leaveBalance - ? WHERE id = ?",
      [leave.days, leave.employeeId]
    );

    return NextResponse.json({ message: "Leave approved.", daysDeducted: leave.days });
  } else {
    await db.execute("UPDATE LeaveRequest SET status = 'rejected' WHERE id = ?", [id]);
    return NextResponse.json({ message: "Leave rejected." });
  }
}
