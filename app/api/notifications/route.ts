import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/** GET /api/notifications — fetch the caller's notifications (latest 20). */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { recipientId: payload.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ notifications });
}

/** PATCH /api/notifications — mark one or all notifications as read. */
export async function PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Mark all visible notifications as read
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { recipientId: payload.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  // Mark a single notification as read
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: body.id },
    select: { id: true, recipientId: true },
  });
  if (!notification) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (notification.recipientId !== payload.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.notification.update({ where: { id: body.id }, data: { isRead: true } });
  return NextResponse.json({ success: true });
}
