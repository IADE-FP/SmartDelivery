import { useCallback, useEffect, useState, type FormEvent } from "react";
import PageMeta from "@/components/common/PageMeta";
import { api, type SessionUser } from "@/services/api";

type Address = { line: string; city: string; postal_code: string; country: string };
type Delivery = { id: string; recipient_name: string; recipient_contact: string; pickup_address: Address; dropoff_address: Address; description?: string; expected_at?: string; fee?: number; status: string; created_at: string; driver?: { name: string; contact?: string } };
type Vehicle = { id: string; registration: string; make: string; model: string; active: boolean };
const statusNames: Record<string, string> = { PENDING: "Pendente", AVAILABLE: "Disponível", ACCEPTED: "Aceite", IN_TRANSIT: "Em distribuição", DELIVERED: "Entregue", FAILED: "Falhada", CANCELLED: "Cancelada" };
const field = "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white";
const emptyAddress = (): Address => ({ line: "", city: "", postal_code: "", country: "PT" });

export default function Orders() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ recipient_name: "", recipient_contact: "", pickup_address: emptyAddress(), dropoff_address: emptyAddress(), description: "", fee: "" });
  const company = user?.role === "COMPANY";
  const driver = user?.role === "DRIVER";

  const load = useCallback(async (current: SessionUser["role"]) => {
    const response = await api.get<{ items: Delivery[] }>(current === "DRIVER" ? "/deliveries/available?limit=100" : "/deliveries?limit=100");
    if (current === "DRIVER") {
      const assigned = await api.get<{ items: Delivery[] }>("/deliveries?limit=100");
      setItems([...assigned.items, ...response.items.filter((d) => !assigned.items.some((owned) => owned.id === d.id))]);
    } else setItems(response.items);
    if (current === "DRIVER") {
      const owned = await api.get<Vehicle[]>("/vehicles"); setVehicles(owned.filter((v) => v.active));
    }
  }, []);

  useEffect(() => { api.get<SessionUser>("/auth/me").then((current) => { setUser(current); return load(current.role); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [load]);

  async function createDelivery(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const body = { ...form, fee: form.fee ? Number(form.fee) : null, pickup_address: form.pickup_address, dropoff_address: form.dropoff_address }; if (editingDelivery) await api.put(`/deliveries/${editingDelivery.id}`, body); else await api.post("/deliveries", body); setFormOpen(false); setEditingDelivery(null); setForm({ recipient_name: "", recipient_contact: "", pickup_address: emptyAddress(), dropoff_address: emptyAddress(), description: "", fee: "" }); await load("COMPANY"); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar a encomenda."); } finally { setSaving(false); }
  }

  function editDelivery(delivery: Delivery) {
    setEditingDelivery(delivery);
    setForm({ recipient_name: delivery.recipient_name, recipient_contact: delivery.recipient_contact, pickup_address: { ...emptyAddress(), ...delivery.pickup_address }, dropoff_address: { ...emptyAddress(), ...delivery.dropoff_address }, description: delivery.description ?? "", fee: delivery.fee == null ? "" : String(delivery.fee) });
    setFormOpen(true);
  }

  async function action(delivery: Delivery, actionName: string) {
    setError("");
    try {
      if (actionName === "publish") await api.post(`/deliveries/${delivery.id}/publish`);
      else if (actionName === "cancel") await api.delete(`/deliveries/${delivery.id}`);
      else if (actionName === "accept") { if (!vehicleId) { setError("Adiciona um veículo ativo antes de aceitar entregas."); return; } await api.post(`/deliveries/${delivery.id}/accept`, { vehicle_id: vehicleId }); }
      else if (actionName === "start") await api.post(`/deliveries/${delivery.id}/start`, {});
      else if (actionName === "complete") await api.post(`/deliveries/${delivery.id}/complete`, {});
      else if (actionName === "fail") { const reason = window.prompt("Indica o motivo da falha:"); if (!reason?.trim()) return; await api.post(`/deliveries/${delivery.id}/fail`, { notes: reason.trim() }); }
      if (user) await load(user.role);
    } catch (e) { setError(e instanceof Error ? e.message : "A ação falhou."); }
  }

  const visible = items.filter((d) => `${d.recipient_name} ${d.id} ${statusNames[d.status] ?? d.status}`.toLowerCase().includes(search.toLowerCase()));
  const actionButton = (label: string, name: string, item: Delivery) => <button key={name} onClick={() => action(item, name)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">{label}</button>;

  return <><PageMeta title="Encomendas | SMART DELIVERY" description="Gestão de entregas"/><main className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-800 dark:text-white">{company ? "Encomendas" : driver ? "Entregas" : "Entregas da plataforma"}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{company ? "Cria, publica e acompanha as tuas entregas." : driver ? "Aceita e atualiza as entregas que te foram atribuídas." : "Consulta as entregas da plataforma."}</p></div>{company && <button onClick={() => { if (formOpen) { setEditingDelivery(null); setForm({ recipient_name: "", recipient_contact: "", pickup_address: emptyAddress(), dropoff_address: emptyAddress(), description: "", fee: "" }); } setFormOpen(!formOpen); }} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">{formOpen ? "Fechar" : "+ Nova encomenda"}</button>}</header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
    {formOpen && <form onSubmit={createDelivery} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><h2 className="font-semibold text-gray-800 dark:text-white">{editingDelivery ? "Editar encomenda pendente" : "Nova encomenda"}</h2><div className="grid gap-3 sm:grid-cols-2"><input className={field} placeholder="Nome do destinatário" required value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}/><input className={field} placeholder="Contacto do destinatário" required value={form.recipient_contact} onChange={(e) => setForm({ ...form, recipient_contact: e.target.value })}/></div><div className="grid gap-4 sm:grid-cols-2">{(["pickup_address", "dropoff_address"] as const).map((key) => <fieldset key={key} className="space-y-2"><legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{key === "pickup_address" ? "Morada de recolha" : "Morada de entrega"}</legend><input className={field} placeholder="Morada" required value={form[key].line} onChange={(e) => setForm({ ...form, [key]: { ...form[key], line: e.target.value } })}/><div className="grid grid-cols-2 gap-2"><input className={field} placeholder="Cidade" value={form[key].city} onChange={(e) => setForm({ ...form, [key]: { ...form[key], city: e.target.value } })}/><input className={field} placeholder="Código postal" value={form[key].postal_code} onChange={(e) => setForm({ ...form, [key]: { ...form[key], postal_code: e.target.value } })}/></div></fieldset>)}</div><div className="grid gap-3 sm:grid-cols-2"><input className={field} placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/><input className={field} type="number" min="0" step="0.01" placeholder="Valor (€)" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })}/></div><button disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "A guardar…" : editingDelivery ? "Guardar alterações" : "Criar encomenda"}</button></form>}
    {driver && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><label className="text-sm text-gray-600 dark:text-gray-300" htmlFor="vehicle-choice">Veículo para aceitar:</label><select id="vehicle-choice" className={field+" max-w-sm"} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}><option value="">Selecionar veículo</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registration} — {v.make} {v.model}</option>)}</select><a href="/veiculos" className="text-sm text-brand-600">Gerir veículos</a></div>}
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-800"><h2 className="font-semibold text-gray-800 dark:text-white">{loading ? "A carregar…" : `${visible.length} entrega(s)`}</h2><input className={field+" max-w-xs"} placeholder="Pesquisar destinatário ou estado" value={search} onChange={(e) => setSearch(e.target.value)}/></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="text-gray-500"><th className="p-3">Destinatário</th><th className="p-3">Entrega</th><th className="p-3">Data</th><th className="p-3">Estado</th><th className="p-3">Ações</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{visible.map(d => <tr key={d.id}><td className="p-3"><div className="font-medium text-gray-800 dark:text-white">{d.recipient_name}</div><div className="text-xs text-gray-500">{d.recipient_contact}</div></td><td className="p-3 text-gray-600 dark:text-gray-300">{d.dropoff_address?.line}{d.dropoff_address?.city ? `, ${d.dropoff_address.city}` : ""}</td><td className="p-3 text-gray-600 dark:text-gray-300">{new Date(d.created_at).toLocaleDateString("pt-PT")}</td><td className="p-3">{statusNames[d.status] ?? d.status}</td><td className="p-3"><div className="flex flex-wrap gap-2">{company && d.status === "PENDING" && <><button key="edit" onClick={() => editDelivery(d)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs dark:border-gray-700">Editar</button>{actionButton("Publicar", "publish", d)}</>}{company && ["PENDING", "AVAILABLE", "ACCEPTED"].includes(d.status) && actionButton("Cancelar", "cancel", d)}{driver && d.status === "AVAILABLE" && actionButton("Aceitar", "accept", d)}{driver && d.status === "ACCEPTED" && actionButton("Iniciar", "start", d)}{driver && d.status === "IN_TRANSIT" && <>{actionButton("Concluir", "complete", d)}{actionButton("Falha", "fail", d)}</>}</div></td></tr>)}{!loading && visible.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Sem entregas para mostrar.</td></tr>}</tbody></table></div></section>
  </main></>;
}
