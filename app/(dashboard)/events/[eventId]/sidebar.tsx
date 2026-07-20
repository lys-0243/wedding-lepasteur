"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Armchair,
  GlassWater,
  Scan,
  Images,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Permission } from "@/lib/event-permissions";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
};

type SidebarProps = {
  eventId: string;
  eventTitle?: string | null;
  className?: string;
  permissions?: readonly Permission[];
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

function buildMenu(eventId: string): MenuItem[] {
  return [
    {
      label: "Dashboard",
      href: `/events/${eventId}`,
      icon: LayoutDashboard,
      permission: "event:read",
    },
    {
      label: "Tables",
      href: `/events/${eventId}/tables`,
      icon: Armchair,
      permission: "tables:read",
    },
    {
      label: "Invités",
      href: `/events/${eventId}/guests`,
      icon: Users,
      permission: "guests:read",
    },
    {
      label: "Boissons",
      href: `/events/${eventId}/drinks`,
      icon: GlassWater,
      permission: "drinks:read",
    },
    {
      label: "Scanner",
      href: `/events/${eventId}/scanner`,
      icon: Scan,
      permission: "checkin:read",
    },
    {
      label: "Galerie",
      href: `/events/${eventId}/gallery`,
      icon: Images,
      permission: "gallery:read",
    },
  ];
}

function filterMenu(eventId: string, permissions?: readonly Permission[]) {
  const menu = buildMenu(eventId);
  if (!permissions) return menu;
  return menu.filter((item) => permissions.includes(item.permission));
}

export function Sidebar({
  eventId,
  user,
  eventTitle,
  className,
  permissions,
}: SidebarProps) {
  const pathname = usePathname();
  const menu = filterMenu(eventId, permissions);

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-[#E8ECF4] bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 border-b border-[#ffffff] px-6 py-6">
        <Link
          href="/profile"
          className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-1 transition-opacity hover:opacity-90"
          title="Modifier mon profil"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name ?? "Avatar"}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#534AB7]/20 ring-offset-2 transition group-hover:ring-[#534AB7]/40"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#534AB7] to-[#AF8BFF] text-lg font-bold text-white ring-2 ring-[#534AB7]/20 ring-offset-2 transition group-hover:ring-[#534AB7]/40">
              {initials}
            </div>
          )}
          <div className="text-center mb-2">
            {user.name && (
              <p className="text-sm font-semibold text-slate-800 group-hover:text-[#534AB7] transition-colors">
                {user.name}
              </p>
            )}
            <p className="max-w-[12rem] truncate text-xs text-slate-500">
              {user.email}
            </p>
            <p className="mt-1 text-[0.65rem] font-medium text-[#1E5FF5] opacity-0 transition-opacity group-hover:opacity-100">
              Modifier le profil
            </p>
          </div>
        </Link>
        {eventTitle && (
          <>
            <div className=" px-3">
              <p className="truncate text-sm font-semibold text-slate-800">
                {eventTitle}
              </p>
            </div>
            {permissions?.includes("event:write") && (
              <div className=" px-3 bg-blue-700 rounded-full">
                <Link
                  href={`/events/${eventId}/edit`}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-white transition-all hover:font-bold"
                >
                  Modifier l&apos;événement
                </Link>
              </div>
            )}
            <div className="mb-3">
              <Link
                href={`/`}
                className="flex w-full items-center gap-3 rounded-xl px-3 underline py-2.5 text-xs font-medium text-blue-700 transition-all hover:font-bold"
              >
                Autres évenements
              </Link>
            </div>
          </>
        )}
      </div>

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

export function MobileNavSheet({
  eventId,
  user,
  eventTitle,
  permissions,
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menu = filterMenu(eventId, permissions);

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-slate-200 lg:hidden cursor-pointer">
        <Menu className="h-5 w-5 text-slate-600" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex flex-col p-0 w-60 border-r border-[#E8ECF4] bg-linear-to-b from-[#DDF4F2] via-[#EAEFF9] to-[#DCCBF4]"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center gap-2 border-b border-[#E8ECF4] px-6 py-7 pt-12">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-1 transition-opacity hover:opacity-90"
            title="Modifier mon profil"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name ?? "Avatar"}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[#534AB7]/20 ring-offset-2 transition group-hover:ring-[#534AB7]/40"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#534AB7] to-[#AF8BFF] text-lg font-bold text-white ring-2 ring-[#534AB7]/20 ring-offset-2 transition group-hover:ring-[#534AB7]/40">
                {initials}
              </div>
            )}
            <div className="text-center mb-2">
              {user.name && (
                <p className="text-sm font-semibold text-slate-800 group-hover:text-[#534AB7] transition-colors">
                  {user.name}
                </p>
              )}
              <p className="max-w-[12rem] truncate text-xs text-slate-500">
                {user.email}
              </p>
              <p className="mt-1 text-[0.65rem] font-medium text-[#1E5FF5]">
                Modifier le profil
              </p>
            </div>
          </Link>
          {eventTitle && (
            <>
              <div className="px-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {eventTitle}
                </p>
              </div>
              {permissions?.includes("event:write") && (
                <div className="px-3 bg-blue-700 rounded-full">
                  <Link
                    href={`/events/${eventId}/edit`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-white transition-all hover:font-bold"
                  >
                    Modifier l&apos;événement
                  </Link>
                </div>
              )}
              <div className="mb-3">
                <Link
                  href={`/`}
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 underline py-2.5 text-xs font-medium text-blue-700 transition-all hover:font-bold"
                >
                  Autres évenements
                </Link>
              </div>
            </>
          )}
        </div>

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
                    onClick={() => setOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-[#534AB7]/10 text-[#534AB7]"
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
      </SheetContent>
    </Sheet>
  );
}
