import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { loadDeskCatAnchors } from "../../lib/deskcatAnchors.server";
import {
  EDITOR_SESSION_COOKIE,
  createDeskCatAnchorEditorSessionValue,
  isDeskCatAnchorEditorEnabled,
  isDeskCatAnchorEditorSessionValid,
  isDeskCatAnchorEditorTokenValid
} from "../../lib/deskcatAnchorEditor.server";
import DeskCatAnchorEditor from "../deskcat-anchors/DeskCatAnchorEditor";

type EditorPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function DeskCatEditorPage({ searchParams }: EditorPageProps) {
  if (!isDeskCatAnchorEditorEnabled()) notFound();

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const hasSession = isDeskCatAnchorEditorSessionValid(cookieStore.get(EDITOR_SESSION_COOKIE)?.value);

  if (isProduction && !hasSession) {
    const params = await searchParams;
    return <EditorPasswordGate hasError={params?.error === "1"} />;
  }

  const anchors = await loadDeskCatAnchors();

  return (
    <DeskCatAnchorEditor
      initialDocument={anchors.document}
      requiresToken={false}
    />
  );
}

async function authenticateEditor(formData: FormData) {
  "use server";

  if (!isDeskCatAnchorEditorEnabled()) notFound();
  const password = formData.get("password");
  if (typeof password !== "string" || !isDeskCatAnchorEditorTokenValid(password)) {
    redirect("/dev/editor?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(EDITOR_SESSION_COOKIE, createDeskCatAnchorEditorSessionValue(password), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "strict",
    secure: true
  });
  redirect("/dev/editor");
}

function EditorPasswordGate({ hasError }: { hasError: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10151c] px-4 text-[#edf2f7]">
      <form action={authenticateEditor} className="w-full max-w-sm rounded-lg border border-white/10 bg-[#171d25] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43d7ff]">Developer tools</p>
        <h1 className="mt-2 text-2xl font-semibold">DeskCat Editor</h1>
        <label className="mt-5 block text-sm font-medium text-[#c8d1dc]">
          Editor password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm text-white outline-none focus:border-[#43d7ff]"
          />
        </label>
        {hasError && (
          <div role="alert" className="mt-3 rounded-md border border-[#ff6b6b]/50 bg-[#3a1c20] p-3 text-xs text-[#ffd1d1]">
            Invalid editor password.
          </div>
        )}
        <button
          type="submit"
          className="mt-5 min-h-11 w-full rounded-md border border-[#85edff] bg-[#baf7ff] px-3 text-sm font-semibold text-[#07131b]"
        >
          Open editor
        </button>
      </form>
    </main>
  );
}
