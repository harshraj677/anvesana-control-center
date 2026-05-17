import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminCaller, getClientIp, createArchive, createAuditLog } from "@/lib/secureDelete";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getAdminCaller(req);
  if (!caller) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const record = await prisma.attendance.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    include: { employee: { select: { fullName: true, email: true } } },
  });
  if (!record) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });

  // confirmName format: "{fullName} – {YYYY-MM-DD}"
  const dateStr = record.date.toISOString().slice(0, 10);
  const expectedConfirmName = `${record.employee.fullName} – ${dateStr}`;

  const body = await req.json().catch(() => ({}));
  const { confirmName, archiveBeforeDelete = true, permanentPurge = false } = body;

  if (confirmName !== expectedConfirmName) {
    return NextResponse.json({
      error: "Confirmation does not match.",
      expected: expectedConfirmName,
    }, { status: 400 });
  }
  if (permanentPurge && caller.dbRole !== "super_admin") {
    return NextResponse.json({ error: "Permanent purge requires super_admin role." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let archiveId: string | undefined;
  if (archiveBeforeDelete) {
    const { employee, ...attendanceData } = record;
    const arc = await createArchive({
      sourceTable: "Attendance",
      sourceId: id,
      snapshot: { ...attendanceData, employeeName: employee.fullName } as Record<string, unknown>,
      archivedBy: caller.id,
    });
    archiveId = arc.id;
  }

  if (permanentPurge) {
    await prisma.attendance.delete({ where: { id } });
  } else {
    await prisma.attendance.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  const audit = await createAuditLog({
    adminId: caller.id,
    action: permanentPurge ? "PERMANENT_DELETE" : "SOFT_DELETE",
    resource: "Attendance",
    resourceId: id,
    details: { archiveId, confirmName, permanentPurge },
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true, auditId: audit.id, archiveId });
}
