import Link from "next/link";
import { requireAdmin } from "../../lib/admin";
import { DESKCAT_ANCHOR_DATA } from "../../lib/deskcatAnchors";
import DeskCatAnchorEditor from "../../dev/deskcat-anchors/DeskCatAnchorEditor";

export default async function AdminEditorPage() {
  await requireAdmin();

  return (
    <>
      <div className="fixed left-4 top-4 z-[80] max-w-[calc(100vw-2rem)]">
        <Link
          href="/admin"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm font-medium text-[#c8d1dc] shadow-lg transition hover:border-white/30"
        >
          Back to admin
        </Link>
      </div>
      <DeskCatAnchorEditor initialDocument={DESKCAT_ANCHOR_DATA} requiresToken={false} />
    </>
  );
}
