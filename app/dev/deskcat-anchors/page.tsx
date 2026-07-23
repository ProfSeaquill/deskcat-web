import { notFound, redirect } from "next/navigation";
import { isDeskCatAnchorEditorEnabled } from "../../lib/deskcatAnchorEditor.server";

export default function DeskCatAnchorEditorPage() {
  if (!isDeskCatAnchorEditorEnabled()) notFound();
  redirect("/dev/editor");
}
