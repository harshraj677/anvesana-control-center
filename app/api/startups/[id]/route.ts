import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { error: "Not authenticated.", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid session.", status: 401 };
  const caller = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { role: true },
  });
  if (!caller || caller.role !== "admin") return { error: "Forbidden.", status: 403 };
  return { payload };
}

async function requireAuth(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return { error: "Not authenticated.", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid session.", status: 401 };
  return { payload };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  return NextResponse.json({ startup });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body required." }, { status: 400 });

  const existing = await prisma.startup.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.startupName  !== undefined) data.startupName  = body.startupName.trim();
  if (body.founderName  !== undefined) data.founderName  = body.founderName.trim();
  if (body.founderEmail !== undefined) data.founderEmail = body.founderEmail?.trim() || null;
  if (body.founderPhone !== undefined) data.founderPhone = body.founderPhone?.trim() || null;
  if (body.program      !== undefined) data.program      = body.program;
  if (body.stage        !== undefined) data.stage        = body.stage;
  if (body.mentor       !== undefined) data.mentor       = body.mentor?.trim() || null;
  if (body.description  !== undefined) data.description  = body.description?.trim() || null;
  if (body.fundingStage !== undefined) data.fundingStage = body.fundingStage;
  if (body.progress     !== undefined) data.progress     = Number(body.progress);
  if (body.status       !== undefined) data.status       = body.status;
  if (body.website      !== undefined) data.website      = body.website?.trim() || null;
  if (body.industry     !== undefined) data.industry     = body.industry?.trim() || null;
  if (body.teamSize     !== undefined) data.teamSize     = body.teamSize ? Number(body.teamSize) : null;
  if (body.location     !== undefined) data.location     = body.location?.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const startup = await prisma.startup.update({ where: { id }, data });
  return NextResponse.json({ startup });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const existing = await prisma.startup.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Startup not found." }, { status: 404 });

  await prisma.startup.delete({ where: { id } });
  return NextResponse.json({ message: "Startup deleted." });
}
