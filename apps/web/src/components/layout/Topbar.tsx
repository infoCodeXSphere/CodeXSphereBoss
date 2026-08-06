import { useState } from "react";
import { Bell, Moon, Sun, Search, LogOut, RefreshCw, Menu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { useNotifications, useMarkAllRead } from "../../hooks/useNotifications";
import { api } from "../../lib/api";
import { CommandPalette } from "../shared/CommandPalette";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { data } = useNotifications();
  const markAllRead = useMarkAllRead();
  const queryClient = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const toggleTheme = () => {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = async () => {
    await api.post("/auth/logout");
    clearSession();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between gap-2 px-3 sm:px-6 sticky top-0 bg-[#0B0E14]/90 backdrop-blur z-20">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Hamburger — only shown below the md breakpoint, where the
            sidebar becomes an off-canvas drawer instead of a static panel. */}
        <button onClick={onMenuClick} className="md:hidden text-white/70 hover:text-white shrink-0" aria-label="Open menu">
          <Menu size={20} />
        </button>

        {/* Full search bar on sm+ screens; collapses to an icon-only
            button on very narrow phones so it never gets squeezed or
            overflows next to the hamburger and right-side icons. */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 text-sm text-white/40 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-full max-w-72"
        >
          <Search size={14} />
          Search or jump to…
          <kbd className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
        <button onClick={() => setPaletteOpen(true)} className="sm:hidden text-white/70 hover:text-white" aria-label="Search">
          <Search size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-white/60 hover:text-white disabled:opacity-50"
          aria-label="Refresh data"
          title="Refresh data on this page"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>

        <button onClick={toggleTheme} className="hidden sm:inline-flex text-white/60 hover:text-white" aria-label="Toggle theme">
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="relative">
          <button onClick={() => setNotifOpen((v) => !v)} className="relative text-white/60 hover:text-white" aria-label="Notifications">
            <Bell size={17} />
            {Boolean(data?.unreadCount) && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-cyan text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {data!.unreadCount > 9 ? "9+" : data!.unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-3 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-[#141924] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-sm font-medium text-white">Notifications</span>
                <button onClick={() => markAllRead.mutate()} className="text-xs text-brand-cyan">
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {data?.notifications.length === 0 && <p className="text-xs text-white/40 p-4">No notifications yet.</p>}
                {data?.notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-white/5 ${n.isRead ? "opacity-50" : ""}`}>
                    <div className="text-sm text-white">{n.title}</div>
                    <div className="text-xs text-white/50 mt-0.5">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-xs hidden md:block">
            <div className="text-white">{user?.name}</div>
            <div className="text-white/40">{user?.role.replace(/_/g, " ")}</div>
          </div>
          <button onClick={handleLogout} className="ml-1 sm:ml-2 text-white/40 hover:text-white" aria-label="Log out">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
