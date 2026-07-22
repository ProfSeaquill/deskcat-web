import { notFound } from "next/navigation";
import { DESKCAT_ANCHOR_DATA } from "../../lib/deskcatAnchors";
import { isDeskCatAnchorEditorEnabled } from "../../lib/deskcatAnchorEditor.server";
import DeskCatAnchorEditor from "./DeskCatAnchorEditor";

export default function DeskCatAnchorEditorPage() {
  if (!isDeskCatAnchorEditorEnabled()) notFound();

  return (
    <DeskCatAnchorEditor
      initialDocument={DESKCAT_ANCHOR_DATA}
      requiresToken={process.env.NODE_ENV === "production"}
    />
  );
}
