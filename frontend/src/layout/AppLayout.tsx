import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { cn } from "@/utils";
import { Outlet } from "react-router";
import { Navigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { api, clearTokens, type SessionUser } from "@/services/api";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";

const LayoutContent: React.FC<{ user: SessionUser }> = ({ user }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />

      <div
        className={cn(
          "flex-1 transition-[margin] duration-300 ease-in-out",
          isExpanded || isHovered ? "xl:ms-72.5" : "xl:ms-22.5",
          isMobileOpen ? "ms-0" : "",
        )}
      >
        <AppHeader />
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
        <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SessionUser>("/auth/me").then(setUser).catch(() => clearTokens()).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">A validar sessão…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;

  return (
    <SidebarProvider>
      <LayoutContent user={user} />
    </SidebarProvider>
  );
};

export default AppLayout;
