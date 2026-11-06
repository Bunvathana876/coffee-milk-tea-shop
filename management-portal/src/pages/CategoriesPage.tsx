import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/authContext'
import { ConfirmAction } from '../components/ConfirmAction'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { createCategory, deleteCategory, getCategories, updateCategory, type Category } from '../lib/api'

const blank = { name: '', description: '', image: '', is_active: true }

export function CategoriesPage() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState(blank)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ id: number; name: string; action: 'deactivate' | 'delete' } | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    getCategories(token).then(rows => { if (active) { setCategories(rows); setLoading(false) } })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'Categories are unavailable.'); setLoading(false) } })
    return () => { active = false }
  }, [token, revision])

  const visible = useMemo(() => categories.filter(category => category.name.toLowerCase().includes(search.trim().toLowerCase())), [categories, search])
  function reload() { setError(''); setLoading(true); setRevision(value => value + 1) }
  function edit(category: Category) {
    setEditing(category.id)
    setForm({ name: category.name, description: category.description ?? '', image: category.image ?? '', is_active: category.is_active })
    setFormError('')
  }
  function reset() { setEditing(null); setForm(blank); setFormError('') }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    if (!form.name.trim() || form.name.trim().length > 120 || form.description.length > 1000 || form.image.length > 2048) {
      setFormError('Enter a name up to 120 characters and keep the optional fields within their limits.'); return
    }
    setBusy(true); setFormError('')
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null, image: form.image.trim() || null, is_active: form.is_active }
      if (editing) await updateCategory(token, editing, body)
      else await createCategory(token, body)
      reset(); reload()
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save category.') }
    finally { setBusy(false) }
  }

  async function confirmAction() {
    if (!token || !confirm) return
    setBusy(true); setError('')
    try {
      if (confirm.action === 'delete') await deleteCategory(token, confirm.id)
      else await updateCategory(token, confirm.id, { is_active: false })
      if (editing === confirm.id) reset()
      setConfirm(null); reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change category.') }
    finally { setBusy(false) }
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">MENU MANAGEMENT</div><h1>Categories<span className="heading-period">.</span></h1><p>Organize the customer menu with live café data.</p></div></div>
    <section className="panel"><div className="panel-header"><div><div className="eyebrow">EDITOR</div><h2>{editing ? 'Edit category' : 'New category'}</h2></div>{editing && <button className="button-secondary" onClick={reset}>Cancel edit</button>}</div>
      <form onSubmit={submit} className="editor-grid">
        <label>Category name<input className="text-input" value={form.name} maxLength={120} required onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Description<input className="text-input" value={form.description} maxLength={1000} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <label>Image URL<input className="text-input" type="url" value={form.image} maxLength={2048} onChange={event => setForm({ ...form, image: event.target.value })} /></label>
        <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active on menu</label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-actions"><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save category' : 'Create category'}</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-header"><div><div className="eyebrow">CATALOG</div><h2>All categories</h2></div><input className="text-input search-input" aria-label="Search categories" placeholder="Search categories" value={search} onChange={event => setSearch(event.target.value)} /></div>
      {loading ? <LoadingState label="Loading categories…" /> : error ? <ErrorState message={error} retry={reload} /> : visible.length === 0 ? <EmptyState title="No categories found" detail={search ? 'Try another search.' : 'Create the first category above.'} /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(category => <tr key={category.id}><td><strong>{category.name}</strong></td><td>{category.product_count}</td><td><span className="status-badge">{category.is_active ? 'Active' : 'Inactive'}</span></td><td><div className="row-actions"><button className="text-link" onClick={() => edit(category)}>Edit</button><button className="text-link" onClick={() => category.is_active ? setConfirm({ id: category.id, name: category.name, action: 'deactivate' }) : (async () => { if (token) { try { await updateCategory(token, category.id, { is_active: true }); reload() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not activate category.') } } })()}>{category.is_active ? 'Deactivate' : 'Activate'}</button><button className="text-link danger-link" onClick={() => setConfirm({ id: category.id, name: category.name, action: 'delete' })}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {confirm && <ConfirmAction title={`${confirm.action === 'delete' ? 'Delete' : 'Deactivate'} ${confirm.name}?`} detail={confirm.action === 'delete' ? 'This permanently removes an empty category. Categories with products cannot be deleted.' : 'Products in this category will be hidden from new customer orders.'} busy={busy} onCancel={() => setConfirm(null)} onConfirm={confirmAction} />}
  </div>
}
