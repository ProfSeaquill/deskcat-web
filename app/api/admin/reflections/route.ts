import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin";
import { validateReflectionTree, type ReflectionTree } from "../../../lib/reflectionTree";
import {
  ReflectionTreeValidationError,
  discardReflectionTreeDraft,
  loadPublishedReflectionTree,
  loadReflectionTreeDraft,
  loadReflectionTreeRevisions,
  publishReflectionTreeDraft,
  rollbackReflectionTree,
  saveReflectionTreeDraft,
  seedReflectionTree
} from "../../../lib/reflectionTree.server";

export const runtime = "nodejs";

const MAX_DOCUMENT_BYTES = 512 * 1024;

function jsonError(message: string, status: number, errors?: string[]) {
  return NextResponse.json(errors ? { error: message, errors } : { error: message }, { status });
}

function revalidateReflection() {
  revalidatePath("/admin/reflections");
  revalidatePath("/api/reflection/tree");
  revalidatePath("/reflect");
}

export async function GET() {
  const session = await getAdminSession();
  if (!session?.user?.email) return jsonError("Not found.", 404);

  const [published, draft, revisions] = await Promise.all([
    loadPublishedReflectionTree(),
    loadReflectionTreeDraft(),
    loadReflectionTreeRevisions()
  ]);

  return NextResponse.json(
    { published, draft, revisions },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Saves the working document as the draft. Validation is enforced here, not just in the UI. */
export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session?.user?.email) return jsonError("Not found.", 404);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
    return jsonError("The reflection tree must be no larger than 512 KB.", 413);
  }

  let body: { document?: unknown; label?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const report = validateReflectionTree(body.document);
  if (report.errors.length > 0) {
    return jsonError("The reflection tree is not valid.", 400, report.errors);
  }

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : "";

  try {
    const result = await saveReflectionTreeDraft(
      body.document as ReflectionTree,
      session.user.email,
      label
    );
    revalidateReflection();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReflectionTreeValidationError) {
      return jsonError("The reflection tree is not valid.", 400, error.errors);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not save the draft.",
      503
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session?.user?.email) return jsonError("Not found.", 404);

  let body: { action?: unknown; revision?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  try {
    switch (body.action) {
      case "publish": {
        const result = await publishReflectionTreeDraft(session.user.email);
        revalidateReflection();
        return NextResponse.json(result);
      }
      case "discard": {
        const result = await discardReflectionTreeDraft(session.user.email);
        revalidateReflection();
        return NextResponse.json(result);
      }
      case "rollback": {
        const revision = Number(body.revision);
        if (!Number.isInteger(revision) || revision < 1) {
          return jsonError("A revision number is required to roll back.", 400);
        }
        const result = await rollbackReflectionTree(revision, session.user.email);
        revalidateReflection();
        return NextResponse.json(result);
      }
      case "seed": {
        const result = await seedReflectionTree(session.user.email);
        revalidateReflection();
        return NextResponse.json(result);
      }
      default:
        return jsonError("Unknown action.", 400);
    }
  } catch (error) {
    if (error instanceof ReflectionTreeValidationError) {
      return jsonError("The reflection tree is not valid.", 400, error.errors);
    }
    return jsonError(
      error instanceof Error ? error.message : "The action could not be completed.",
      503
    );
  }
}
