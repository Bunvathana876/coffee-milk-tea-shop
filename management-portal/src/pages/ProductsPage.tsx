import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Coffee,
  EyeOff,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { ConfirmAction } from '../components/ConfirmAction'
import { Drawer } from '../components/Drawer'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  type Category,
  type Product,
} from '../lib/api'

interface ProductFormData {
  category_id: number
  name: string
  description: string
  image: string
  base_price_usd: string
  is_available: boolean
}

const blankForm: ProductFormData = {
  category_id: 0,
  name: '',
  description: '',
  image: '',
  base_price_usd: '',
  is_available: true,
}

export const DRINK_THUMBNAIL_FALLBACK = '/brand/brew-boba-cup-icon.webp'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [revision, setRevision] = useState(0)

  // Drawer / editor state
  const [searchParams, setSearchParams] = useSearchParams()
  const handledNewActionRef = useRef(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductFormData>(blankForm)
  const [imagePreviewError, setImagePreviewError] = useState(false)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')

  // Action confirmations
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ id: number; name: string; action: 'deactivate' | 'delete' } | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([getProducts(token), getCategories(token)])
      .then(([items, groups]) => {
        if (active) {
          setProducts(items)
          setCategories(groups)
          setLoading(false)
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Products are unavailable.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [token, revision])

  // Computed statistics from real fetched records
  const stats = useMemo(() => {
    const total = products.length
    const available = products.filter(p => p.is_available).length
    const unavailable = total - available
    const catCount = categories.length
    return { total, available, unavailable, catCount }
  }, [products, categories])

  // Filtered products list
  const visible = useMemo(() => {
    return products.filter(product => {
      const matchesCategory =
        categoryFilter === 'all' || product.category_id === Number(categoryFilter)
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && product.is_available) ||
        (availabilityFilter === 'unavailable' && !product.is_available)
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description ?? '').toLowerCase().includes(query) ||
        (product.category?.name ?? '').toLowerCase().includes(query)

      return matchesCategory && matchesAvailability && matchesSearch
    })
  }, [products, categoryFilter, availabilityFilter, search])

  function reload() {
    setError('')
    setLoading(true)
    setRevision(value => value + 1)
  }

  function handleOpenCreate() {
    setEditingId(null)
    setForm({
      ...blankForm,
      category_id: categories.length > 0 ? categories[0].id : 0,
    })
    setFormError('')
    setImagePreviewError(false)
    setIsDrawerOpen(true)
  }

  // Handle ?action=new from Command Palette or Quick Actions
  useEffect(() => {
    if (!loading && searchParams.get('action') === 'new' && !handledNewActionRef.current) {
      handledNewActionRef.current = true
      handleOpenCreate()
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('action')
      setSearchParams(nextParams, { replace: true })
    }
  }, [loading, searchParams, categories])

  function handleOpenEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      category_id: product.category_id,
      name: product.name,
      description: product.description ?? '',
      image: product.image ?? '',
      base_price_usd: String(product.base_price_usd),
      is_available: product.is_available,
    })
    setFormError('')
    setImagePreviewError(false)
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    if (busy) return
    setIsDrawerOpen(false)
    setEditingId(null)
    setForm(blankForm)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token) return

    const price = Number(form.base_price_usd)
    if (
      !categories.some(category => category.id === form.category_id) ||
      !form.name.trim() ||
      form.name.trim().length > 120 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 9999999.99 ||
      Math.abs(Math.round(price * 100) - price * 100) > 1e-6 ||
      form.description.length > 1000 ||
      form.image.length > 2048
    ) {
      setFormError('Choose a category, enter a name and a positive USD price with at most two decimals.')
      return
    }

    setBusy(true)
    setFormError('')

    try {
      const body = {
        category_id: form.category_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        image: form.image.trim() || null,
        base_price_usd: price,
        is_available: form.is_available,
      }

      if (editingId) {
        await updateProduct(token, editingId, body)
      } else {
        await createProduct(token, body)
      }

      handleCloseDrawer()
      reload()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save product.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmAction() {
    if (!token || !confirm) return
    setBusy(true)
    setError('')
    try {
      if (confirm.action === 'delete') {
        await deleteProduct(token, confirm.id)
      } else {
        await updateProduct(token, confirm.id, { is_available: false })
      }
      if (editingId === confirm.id) {
        handleCloseDrawer()
      }
      setConfirm(null)
      reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change product.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActivate(product: Product) {
    if (!token || busy) return
    if (product.is_available) {
      setConfirm({ id: product.id, name: product.name, action: 'deactivate' })
    } else {
      setBusy(true)
      try {
        await updateProduct(token, product.id, { is_available: true })
        reload()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not activate product.')
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="page-stack">
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">MENU MANAGEMENT</div>
          <h1>
            Product Catalog
            <span className="heading-period">.</span>
          </h1>
          <p>Manage the drinks your customers love.</p>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleOpenCreate}
          disabled={loading || categories.length === 0}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Add Drink</span>
        </button>
      </div>

      {/* Quick Statistics Row */}
      {!loading && !error && (
        <div className="quick-stats-grid">
          <div className="quick-stat-card">
            <span className="quick-stat-icon cobalt" aria-hidden="true">
              <Coffee size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Total Drinks</span>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon emerald" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Available for Order</span>
              <strong>{stats.available}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon amber" aria-hidden="true">
              <EyeOff size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Hidden / Inactive</span>
              <strong>{stats.unavailable}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon dark-blue" aria-hidden="true">
              <Layers size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Categories</span>
              <strong>{stats.catCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog Section */}
      <section className="panel">
        <div className="page-toolbar catalog-toolbar">
          <div className="toolbar-controls">
            <label className="sr-only" htmlFor="product-search">
              Search drinks
            </label>
            <div className="search-input-wrapper">
              <input
                id="product-search"
                className="text-input search-input catalog-search"
                aria-label="Search products"
                placeholder="Search drinks…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <Search size={15} className="search-icon" aria-hidden="true" />
            </div>

            <label className="sr-only" htmlFor="category-filter">
              Filter by category
            </label>
            <select
              id="category-filter"
              className="text-input filter-select catalog-select"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="availability-filter">
              Filter by availability
            </label>
            <select
              id="availability-filter"
              className="text-input filter-select catalog-select"
              aria-label="Filter by availability"
              value={availabilityFilter}
              onChange={event =>
                setAvailabilityFilter(event.target.value as 'all' | 'available' | 'unavailable')
              }
            >
              <option value="all">All statuses</option>
              <option value="available">Available only</option>
              <option value="unavailable">Unavailable only</option>
            </select>
          </div>

          <div className="toolbar-actions">
            {(search || categoryFilter !== 'all' || availabilityFilter !== 'all') && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('all')
                  setAvailabilityFilter('all')
                }}
              >
                Reset filters
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={reload}
              aria-label="Reload product list"
              title="Reload catalog"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading product catalog…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No drinks found"
            detail={
              search || categoryFilter !== 'all' || availabilityFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Click "Add Drink" above to create the first beverage.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Café Drink Catalog</caption>
              <thead>
                <tr>
                  <th scope="col">Drink</th>
                  <th scope="col">Category</th>
                  <th scope="col">Base Price</th>
                  <th scope="col">Availability</th>
                  <th scope="col" className="numeric">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="thumbnail-box" aria-hidden="true">
                          <img
                            src={product.image?.trim() || DRINK_THUMBNAIL_FALLBACK}
                            alt=""
                            onError={e => {
                              const target = e.currentTarget as HTMLImageElement
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true'
                                target.src = DRINK_THUMBNAIL_FALLBACK
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <strong>{product.name}</strong>
                          {product.description && (
                            <span className="text-xs text-slate-500 truncate max-w-xs">
                              {product.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">
                        {product.category?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-900">
                        {money.format(product.base_price_usd)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          product.is_available ? 'status-completed' : 'status-unknown'
                        }`}
                      >
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="numeric">
                      <div className="row-actions justify-end">
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => handleOpenEdit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => handleToggleActivate(product)}
                        >
                          {product.is_available ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="text-link danger-link"
                          onClick={() =>
                            setConfirm({ id: product.id, name: product.name, action: 'delete' })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Responsive Edit/Create Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        eyebrow="PRODUCT EDITOR"
        title={editingId ? 'Edit Drink' : 'Add New Drink'}
        description={
          editingId
            ? 'Update drink details, pricing, and availability.'
            : 'Add a handcrafted beverage to your café menu.'
        }
        width="md"
        footer={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={handleCloseDrawer}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              className="button-primary"
              disabled={busy || categories.length === 0}
            >
              {busy ? 'Saving…' : editingId ? 'Save Changes' : 'Create Drink'}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Drink name
            <input
              className="text-input"
              required
              maxLength={120}
              placeholder="e.g. Signature Brown Sugar Boba"
              value={form.name}
              onChange={event => setForm({ ...form, name: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Category
            <select
              className="text-input"
              required
              value={form.category_id || ''}
              onChange={event => setForm({ ...form, category_id: Number(event.target.value) })}
            >
              <option value="">Choose category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.is_active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Base price (USD)
            <div className="relative">
              <input
                className="text-input"
                type="number"
                min="0.01"
                max="9999999.99"
                step="0.01"
                required
                placeholder="4.50"
                value={form.base_price_usd}
                onChange={event => setForm({ ...form, base_price_usd: event.target.value })}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Description (Optional)
            <textarea
              className="text-input"
              style={{ minHeight: '80px', padding: '10px 14px' }}
              maxLength={1000}
              placeholder="Describe tea base, sweetness profile, or specialty ingredients"
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Image URL (Optional)
            <input
              className="text-input"
              type="url"
              maxLength={2048}
              placeholder="https://example.com/drinks/milk-tea.webp"
              value={form.image}
              onChange={event => {
                setForm({ ...form, image: event.target.value })
                setImagePreviewError(false)
              }}
            />
          </label>

          {/* Useful Image Preview */}
          {form.image.trim() && !imagePreviewError && (
            <div className="image-preview-card">
              <span className="text-xs text-slate-500 font-semibold self-start">
                Image Preview:
              </span>
              <img
                src={form.image.trim()}
                alt="Drink preview"
                onError={() => setImagePreviewError(true)}
              />
            </div>
          )}

          <label className="check-field mt-2 flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={event => setForm({ ...form, is_available: event.target.checked })}
            />
            <span>Available for customer ordering</span>
          </label>

          {formError && (
            <div className="form-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </Drawer>

      {/* Delete / Deactivate Confirmation Dialog */}
      {confirm && (
        <ConfirmAction
          title={`${confirm.action === 'delete' ? 'Delete' : 'Deactivate'} ${confirm.name}?`}
          detail={
            confirm.action === 'delete'
              ? 'This permanently removes the catalog product. Historical order line-item snapshots remain.'
              : 'This stops new customer orders for this drink.'
          }
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}
