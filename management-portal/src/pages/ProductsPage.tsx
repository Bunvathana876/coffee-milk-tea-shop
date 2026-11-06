import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/authContext'
import { ConfirmAction } from '../components/ConfirmAction'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { createProduct, deleteProduct, getCategories, getProducts, updateProduct, type Category, type Product } from '../lib/api'

const blank = { category_id: 0, name: '', description: '', image: '', base_price_usd: '', is_available: true }
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState(blank)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ id: number; name: string; action: 'deactivate' | 'delete' } | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([getProducts(token), getCategories(token)]).then(([items, groups]) => {
      if (active) { setProducts(items); setCategories(groups); setLoading(false) }
    }).catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'Products are unavailable.'); setLoading(false) } })
    return () => { active = false }
  }, [token, revision])

  const visible = useMemo(() => products.filter(product =>
    (categoryFilter === 'all' || product.category_id === Number(categoryFilter)) &&
    `${product.name} ${product.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [products, categoryFilter, search])
  function reload() { setError(''); setLoading(true); setRevision(value => value + 1) }
  function reset() { setEditing(null); setForm(blank); setFormError('') }
  function edit(product: Product) {
    setEditing(product.id)
    setForm({ category_id: product.category_id, name: product.name, description: product.description ?? '', image: product.image ?? '', base_price_usd: String(product.base_price_usd), is_available: product.is_available })
    setFormError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    const price = Number(form.base_price_usd)
    if (!categories.some(category => category.id === form.category_id) || !form.name.trim() || form.name.trim().length > 120 ||
        !Number.isFinite(price) || price <= 0 || price > 9999999.99 || Math.abs(Math.round(price * 100) - price * 100) > 1e-6 ||
        form.description.length > 1000 || form.image.length > 2048) {
      setFormError('Choose a category, enter a name and a positive USD price with at most two decimals.'); return
    }
    setBusy(true); setFormError('')
    try {
      const body = { category_id: form.category_id, name: form.name.trim(), description: form.description.trim() || null, image: form.image.trim() || null, base_price_usd: price, is_available: form.is_available }
      if (editing) await updateProduct(token, editing, body)
      else await createProduct(token, body)
      reset(); reload()
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save product.') }
    finally { setBusy(false) }
  }

  async function confirmAction() {
    if (!token || !confirm) return
    setBusy(true); setError('')
    try {
      if (confirm.action === 'delete') await deleteProduct(token, confirm.id)
      else await updateProduct(token, confirm.id, { is_available: false })
      if (editing === confirm.id) reset()
      setConfirm(null); reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change product.') }
    finally { setBusy(false) }
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">MENU MANAGEMENT</div><h1>Products<span className="heading-period">.</span></h1><p>Keep the café catalog current and available.</p></div></div>
    <section className="panel"><div className="panel-header"><div><div className="eyebrow">EDITOR</div><h2>{editing ? 'Edit drink' : 'New drink'}</h2></div>{editing && <button className="button-secondary" onClick={reset}>Cancel edit</button>}</div>
      {loading ? <LoadingState label="Loading menu data…" /> : error ? <ErrorState message={error} retry={reload} /> : <form onSubmit={submit} className="editor-grid">
        <label>Drink name<input className="text-input" required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Category<select className="text-input" required value={form.category_id || ''} onChange={event => setForm({ ...form, category_id: Number(event.target.value) })}><option value="">Choose category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.is_active ? '' : ' (inactive)'}</option>)}</select></label>
        <label>Base price (USD)<input className="text-input" type="number" min="0.01" max="9999999.99" step="0.01" required value={form.base_price_usd} onChange={event => setForm({ ...form, base_price_usd: event.target.value })} /></label>
        <label>Description<input className="text-input" maxLength={1000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <label>Image URL<input className="text-input" type="url" maxLength={2048} value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} /></label>
        <label className="check-field"><input type="checkbox" checked={form.is_available} onChange={event => setForm({ ...form, is_available: event.target.checked })} /> Available for orders</label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions"><button className="button-primary" disabled={busy || categories.length === 0}>{busy ? 'Saving…' : editing ? 'Save drink' : 'Create drink'}</button></div>
      </form>}
    </section>
    <section className="panel"><div className="panel-header"><div><div className="eyebrow">CATALOG</div><h2>All drinks</h2></div><div className="filters"><input className="text-input search-input" aria-label="Search products" placeholder="Search drinks" value={search} onChange={event => setSearch(event.target.value)} /><select className="text-input" aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div>
      {loading ? <LoadingState label="Loading products…" /> : error ? <ErrorState message={error} retry={reload} /> : visible.length === 0 ? <EmptyState title="No drinks found" detail={search || categoryFilter !== 'all' ? 'Try another filter.' : 'Create the first drink above.'} /> : <div className="table-scroll"><table><thead><tr><th>Drink</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.category?.name ?? 'Unknown'}</td><td>{money.format(product.base_price_usd)}</td><td><span className="status-badge">{product.is_available ? 'Available' : 'Unavailable'}</span></td><td><div className="row-actions"><button className="text-link" onClick={() => edit(product)}>Edit</button><button className="text-link" onClick={() => product.is_available ? setConfirm({ id: product.id, name: product.name, action: 'deactivate' }) : (async () => { if (token) { try { await updateProduct(token, product.id, { is_available: true }); reload() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not activate product.') } } })()}>{product.is_available ? 'Deactivate' : 'Activate'}</button><button className="text-link danger-link" onClick={() => setConfirm({ id: product.id, name: product.name, action: 'delete' })}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {confirm && <ConfirmAction title={`${confirm.action === 'delete' ? 'Delete' : 'Deactivate'} ${confirm.name}?`} detail={confirm.action === 'delete' ? 'This permanently removes the catalog product. Historical order line-item snapshots remain.' : 'This stops new customer orders for this drink.'} busy={busy} onCancel={() => setConfirm(null)} onConfirm={confirmAction} />}
  </div>
}
