import { useSidebar } from "@/context/SidebarContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { api, type SessionUser } from "@/services/api";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  UserCircleIcon,
} from "../icons";
import { cn } from "../utils";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  key?: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  target?: string;
  roles?: SessionUser["role"][];
  subItems?: {
    name: string;
    key?: string;
    path: string;
    pro?: boolean;
    new?: boolean;
    target?: string;
  }[];
};

// Menu principal da SMART DELIVERY
const navItems: NavItem[] = [
  {
    icon: <GridIcon fontSize={24} />,
    name: "Dashboard",
    path: "/dashboard",
    roles: ["COMPANY", "DRIVER"],
  },
  {
    icon: <ListIcon fontSize={24} />,
    name: "Encomendas",
    path: "/encomendas",
    roles: ["COMPANY", "DRIVER", "ADMIN"],
  },
  {
    icon: <UserCircleIcon fontSize={24} />,
    name: "Motoristas",
    path: "/motoristas",
    roles: ["COMPANY"],
  },
  {
    icon: <BoxCubeIcon fontSize={24} />,
    name: "Veículos",
    path: "/veiculos",
    roles: ["DRIVER"],
  },
  {
    icon: <CalenderIcon fontSize={24} />,
    name: "Rotas",
    path: "/rotas",
    roles: ["DRIVER"],
  },
  {
    icon: <UserCircleIcon fontSize={24} />,
    name: "Clientes",
    path: "/clientes",
    roles: ["COMPANY"],
  },
];

// Menu de relatórios
const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon fontSize={24} />,
    name: "Relatórios",
    path: "/relatorios",
    roles: ["COMPANY", "ADMIN"],
  },
  { icon: <UserCircleIcon fontSize={24} />, name: "Utilizadores", path: "/admin/utilizadores", roles: ["ADMIN"] },
];

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    setIsMobileOpen,
  } = useSidebar();

  const { t } = useTranslation();
  const location = useLocation();
  const [role, setRole] = useState<SessionUser["role"] | null>(null);
  useEffect(() => { api.get<SessionUser>("/auth/me").then((user) => setRole(user.role)).catch(() => setRole(null)); }, []);
  const visibleMainItems = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)));
  const visibleOtherItems = othersItems.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<
    Record<string, number>
  >({});

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fechar o menu móvel quando a página mudar
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Verificar se um menu está ativo
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  // Atualizar a altura dos submenus
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;

      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  // Abrir ou fechar um submenu
  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "others",
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }

      return {
        type: menuType,
        index,
      };
    });
  };

  // Construir os itens do menu
  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others",
  ) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`group menu-item ${
                openSubmenu?.type === menuType &&
                openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "xl:justify-center"
                  : "xl:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  openSubmenu?.type === menuType &&
                  openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>

              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">
                  {nav.key
                    ? t(`sidebar.items.${nav.key}`)
                    : nav.name}
                </span>
              )}

              {nav.new &&
                (isExpanded || isHovered || isMobileOpen) && (
                  <span
                    className={`absolute inset-e-10 ms-auto ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "menu-dropdown-badge-active"
                        : "menu-dropdown-badge-inactive"
                    } menu-dropdown-badge`}
                  >
                    {t("sidebar.badges.new")}
                  </span>
                )}

              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ms-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                target={nav.target}
                className={`group menu-item ${
                  isActive(nav.path)
                    ? "menu-item-active"
                    : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>

                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">
                    {nav.key
                      ? t(`sidebar.items.${nav.key}`)
                      : nav.name}
                  </span>
                )}
              </Link>
            )
          )}

          {nav.subItems &&
            (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="ms-9 mt-2 space-y-1">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        target={subItem.target}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.key
                          ? t(`sidebar.items.${subItem.key}`)
                          : subItem.name}

                        <span className="ms-auto flex items-center gap-1">
                          {subItem.new && (
                            <span
                              className={`ms-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              {t("sidebar.badges.new")}
                            </span>
                          )}

                          {subItem.pro && (
                            <span
                              className={`ms-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-pro-active"
                                  : "menu-dropdown-badge-pro-inactive"
                              } menu-dropdown-badge-pro`}
                            >
                              {t("sidebar.badges.pro")}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={cn(
        "fixed inset-s-0 top-0 z-50 flex h-screen flex-col border-e border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 xl:rtl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isExpanded || isMobileOpen
          ? "w-72.5"
          : isHovered
            ? "w-72.5"
            : "w-22.5",
        isMobileOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full",
      )}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Logótipo da SMART DELIVERY */}
      <div
        className={cn(
          "flex py-8",
          !isExpanded && !isHovered
            ? "xl:justify-center"
            : "justify-start",
        )}
      >
        <Link
          to="/dashboard"
          className="flex items-center gap-3"
          aria-label="SMART DELIVERY - Página inicial"
        >
          <img
            src="/images/logo/smart.png"
            alt="SMART DELIVERY"
            className="h-10 w-10 shrink-0 object-contain"
          />

          {(isExpanded || isHovered || isMobileOpen) && (
            <div className="flex flex-col">
              <span className="whitespace-nowrap text-base font-bold leading-tight text-gray-900 dark:text-white">
                SMART DELIVERY
              </span>

              <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                Gestão de Encomendas
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Menu lateral */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Menus principais */}
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("sidebar.groups.menu")
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>

              {renderMenuItems(visibleMainItems, "main")}
            </div>

            {/* Outros menus */}
            <div>
              <h2
                className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("sidebar.groups.others")
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>

              {renderMenuItems(visibleOtherItems, "others")}
            </div>
          </div>
        </nav>

        {isExpanded || isHovered || isMobileOpen ? (
          <SidebarWidget />
        ) : null}
      </div>
    </aside>
  );
};

export default AppSidebar;

