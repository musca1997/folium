import { isAuthenticated } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const authed = await isAuthenticated();

  return (
    <header className="border-b border-line px-5 py-4">
      <HeaderNav authed={authed} />
    </header>
  );
}
