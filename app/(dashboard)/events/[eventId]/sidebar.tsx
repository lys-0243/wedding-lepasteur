"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Armchair,
  GlassWater,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type SidebarProps = {
  eventId: string;
  eventTitle?: string | null;
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

// ─── Menu items — ajouter une entrée ici pour l'afficher dans la sidebar ──────
function buildMenu(eventId: string): MenuItem[] {
  return [
    {
      label: "Dashboard",
      href: `/events/${eventId}`,
      icon: LayoutDashboard,
    },
    {
      label: "Tables",
      href: `/events/${eventId}/tables`,
      icon: Armchair,
    },
    {
      label: "Invités",
      href: `/events/${eventId}/guests`,
      icon: Users,
    },
    {
      label: "Boissons",
      href: `/events/${eventId}/drinks`,
      icon: GlassWater,
    },
  ];
}

export function Sidebar({ eventId, user, eventTitle }: SidebarProps) {
  const pathname = usePathname();
  const menu = buildMenu(eventId);

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[#E8ECF4] bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4]">
      {/* Profile */}
      <div className="flex flex-col items-center gap-2 border-b border-[#ffffff] px-6 py-7">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name ?? "Avatar"}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-[#534AB7]/20 ring-offset-2"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#534AB7] to-[#AF8BFF] text-lg font-bold text-white ring-2 ring-[#534AB7]/20 ring-offset-2">
            {initials}
          </div>
        )}
        <div className="text-center mb-6">
          {user.name && (
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
          )}
          <p className="max-w-[12rem] truncate text-xs text-slate-500">
            {user.email}
          </p>
        </div>
        {eventTitle && (
          <>
            <div className=" px-3">
              <p className="truncate text-sm font-semibold text-slate-800">
                {eventTitle}
              </p>
            </div>
            <div className="mb-3 px-3 bg-blue-700 rounded-full">
              <Link
                href={`/events/${eventId}/edit`}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-white transition-all hover:font-bold"
              >
                Modifier l'événement
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        <ul className="grid gap-0.5">
          {menu.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#fff] text-[#534AB7]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active
                        ? "text-[#534AB7]"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  {label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#534AB7]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — edit link + Logout */}
      <div className="border-t border-[#E8ECF4] px-3 py-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-red-500" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
