import type { Prisma } from "@acme/db";
import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import {
  asRecord,
  caseDetailsFromInput,
  caseView,
  moneyString,
  shortString,
} from "@/lib/collections/records";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const access = await requireCompanyAccess(
      request.headers,
      url.searchParams.get("organizationId")
    );
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10) || 25)
    );
    const sort = url.searchParams.get("sort") ?? "createdAt";
    const direction = url.searchParams.get("direction") === "asc" ? "asc" : "desc";
    const orderBy: Prisma.CollectionCaseOrderByWithRelationInput =
      sort === "customerName"
        ? { customerName: direction }
        : sort === "status"
          ? { status: direction }
          : sort === "outstandingAmount"
            ? { outstandingAmount: direction }
            : { createdAt: direction };
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const assigneeId = url.searchParams.get("assigneeId")?.trim();
    const where: Prisma.CollectionCaseWhereInput = {
      organizationId: access.organizationId,
      ...(status ? { status } : {}),
      ...(assigneeId ? { assignedAgentId: assigneeId } : {}),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { invoiceNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      db.collectionCase.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      db.collectionCase.count({ where }),
    ]);
    return Response.json({ cases: rows.map(caseView), total, page, pageSize });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const access = await requireCompanyAccess(request.headers);
    const body = asRecord(await request.json());
    if (!body) return Response.json({ error: "Invalid case body." }, { status: 400 });
    const customerName = shortString(body.customerName);
    const invoiceNumber = shortString(body.invoiceNumber);
    const outstandingAmount = moneyString(body.outstandingAmount);
    if (!customerName || !invoiceNumber || !outstandingAmount) {
      return Response.json(
        { error: "Name, invoice number, and decimal outstanding amount are required." },
        { status: 400 }
      );
    }
    const data = caseDetailsFromInput(body, customerName);
    if (
      !data ||
      BigInt(String(data.originalAmount).replace(".", "")) <
        BigInt(outstandingAmount.replace(".", ""))
    ) {
      return Response.json(
        {
          error:
            "Case data must contain valid contact, invoice, service, and original amount details.",
        },
        { status: 400 }
      );
    }
    if (typeof data.assignedAgentId === "string") {
      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: access.organizationId,
            userId: data.assignedAgentId,
          },
        },
      });
      if (!member || !["admin", "agent"].includes(member.role)) {
        return Response.json({ error: "Assignee must belong to this company." }, { status: 400 });
      }
    }
    const row = await db.collectionCase.create({
      data: {
        organizationId: access.organizationId,
        customerName,
        invoiceNumber,
        outstandingAmount,
        currency: "USD",
        status: "ready",
        ...data,
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 5000) : "",
      },
    });
    return Response.json({ case: caseView(row) }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    if (asRecord(error)?.code === "P2002")
      return Response.json(
        { error: "Invoice number already exists in this company." },
        { status: 409 }
      );
    return authorizationResponse(error);
  }
}
