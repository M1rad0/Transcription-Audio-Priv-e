import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  currentTab: "history" | "treatment";
  username: string;
};

const NAV_ITEMS = [
  {
    description: "Lancer un nouveau traitement",
    href: "/?tab=treatment",
    key: "treatment",
    label: "Traitement",
  },
  {
    description: "Consulter les résultats locaux",
    href: "/?tab=history",
    key: "history",
    label: "Historique",
  },
] as const;

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 7V5.75C14 4.7835 13.2165 4 12.25 4H6.75C5.7835 4 5 4.7835 5 5.75V18.25C5 19.2165 5.7835 20 6.75 20H12.25C13.2165 20 14 19.2165 14 18.25V17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10 12H20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M17 9L20 12L17 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SidebarNav({ currentTab, username }: SidebarNavProps) {
  return (
    <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
      <div className="flex h-full min-h-[16rem] flex-col rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-xl)] backdrop-blur-xl">
        <div className="border-b border-slate-200/80 pb-5">
          <LogoMark />
        </div>

        <nav className="mt-5 grid gap-3">
          {NAV_ITEMS.map((item) => {
            const isActive = currentTab === item.key;

            return (
              <Link
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-left shadow-sm",
                  isActive
                    ? "border-sky-200 bg-sky-50 text-sky-950"
                    : "border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300 hover:bg-white",
                )}
                href={item.href}
                key={item.key}
              >
                <p className="text-sm font-semibold tracking-tight">{item.label}</p>
                <p
                  className={cn(
                    "mt-1 text-sm",
                    isActive ? "text-sky-900/75" : "text-[var(--muted)]",
                  )}
                >
                  {item.description}
                </p>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-start justify-between gap-3 border-t border-slate-200/80 pt-5">
          <div className="min-w-0 max-w-[11rem]">
            <p className="text-sm leading-5 text-slate-900">
              Connecté en tant que <span className="font-semibold">{username}</span>
            </p>
          </div>

          <form action={logoutAction}>
            <Button
              aria-label="Se déconnecter"
              className="h-11 w-11 rounded-2xl px-0"
              title="Se déconnecter"
              variant="secondary"
            >
              <LogoutIcon />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
