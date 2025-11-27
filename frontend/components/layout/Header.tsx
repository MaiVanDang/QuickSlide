import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full p-4 border-b flex items-center justify-between bg-white">
      <h1 className="font-bold text-xl">QuickSlide</h1>

      <nav className="flex gap-4">
        <Link href="/placeholders">Placeholders</Link>
        <Link href="/templates">Templates</Link>
        <Link href="/auto-generate">Auto Slide</Link>
      </nav>
    </header>
  );
}
