import { BrowserRouter, Navigate, Route, Routes, useOutletContext } from "react-router";
import type { ReactNode } from "react";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";

// Página inicial
import Welcome from "./pages/Home/Welcome";

// Autenticação
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";

// Dashboard
import Ecommerce from "./pages/Dashboard/Ecommerce";

// Páginas de gestão
import Orders from "./pages/Orders/Orders";
import Motoristas from "./pages/Motoristas/Motoristas";
import Veiculos from "./pages/Veiculos/Veiculos";
import Rotas from "./pages/Rotas/Rotas";
import Clientes from "./pages/Clientes/Clientes";
import Relatorios from "./pages/Relatorios/Relatorios";
import AdminUsers from "./pages/Admin/Users";
import type { SessionUser } from "@/services/api";

function RoleRoute({ allowed, children }: { allowed: SessionUser["role"][]; children: ReactNode }) {
  const { user } = useOutletContext<{ user: SessionUser }>();
  return allowed.includes(user.role) ? children : <Navigate to={user.role === "ADMIN" ? "/admin/utilizadores" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        {/* Página inicial pública */}
        <Route path="/" element={<Welcome />} />

        {/* Autenticação */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Área de gestão */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<RoleRoute allowed={["COMPANY", "DRIVER"]}><Ecommerce /></RoleRoute>} />

          <Route
            path="/encomendas"
            element={<RoleRoute allowed={["COMPANY", "DRIVER", "ADMIN"]}><Orders /></RoleRoute>}
          />

          <Route
            path="/motoristas"
            element={<RoleRoute allowed={["COMPANY"]}><Motoristas /></RoleRoute>}
          />

          <Route
            path="/veiculos"
            element={<RoleRoute allowed={["DRIVER"]}><Veiculos /></RoleRoute>}
          />

          <Route
            path="/rotas"
            element={<RoleRoute allowed={["DRIVER"]}><Rotas /></RoleRoute>}
          />

          <Route
            path="/clientes"
            element={<RoleRoute allowed={["COMPANY"]}><Clientes /></RoleRoute>}
          />

          <Route
            path="/relatorios"
            element={<RoleRoute allowed={["COMPANY", "ADMIN"]}><Relatorios /></RoleRoute>}
          />

          <Route path="/admin/utilizadores" element={<RoleRoute allowed={["ADMIN"]}><AdminUsers /></RoleRoute>} />
        </Route>

        {/* Endereços desconhecidos */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
