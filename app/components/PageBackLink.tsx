import Link from "next/link";

export default function PageBackLink({
  href,
  label = "Back"
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
    >
      ← {label}
    </Link>
  );
}
