import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, FolderTree, Layers, Plus, RotateCcw, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/authContext';
import { ConfirmAction } from '../components/ConfirmAction';
import { Drawer } from '../components/Drawer';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useToast } from '../components/ToastContext';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from '../lib/api';

interface CategoryFormData {
  name: string;
  description: string;
  image: string;
  is_active: boolean;
}

const blankForm: CategoryFormData = {
  name: '',
  description: '',
  image: '',
  is_active: true,
};

export const CATEGORY_THUMBNAIL_FALLBACK = '/brand/brew-boba-mascot-badge.png';

export function CategoriesPage() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [revision, setRevision] = useState(0);

  // Drawer / editor state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormData>(blankForm);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Search & filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Action confirmations
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: number;
    name: string;
    action: 'deactivate' | 'delete';
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getCategories(token)
      .then(rows => {
        if (active) {
          setCategories(rows);
          setLoading(false);
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Categories are unavailable.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, revision]);

  // Computed statistics from real fetched records
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.is_active).length;
    const inactive = total - active;
    const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);
    return { total, active, inactive, totalProducts };
  }, [categories]);

  // Filtered categories
  const visible = useMemo(() => {
    return categories.filter(category => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.is_active) ||
        (statusFilter === 'inactive' && !category.is_active);
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        category.name.toLowerCase().includes(query) ||
        (category.description ?? '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [categories, statusFilter, search]);

  function reload() {
    setError('');
    setLoading(true);
    setRevision(value => value + 1);
  }

  function handleOpenCreate() {
    setEditingId(null);
    setForm(blankForm);
    setFormError('');
    setImagePreviewError(false);
    setIsDrawerOpen(true);
  }

  function handleOpenEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? '',
      image: category.image ?? '',
      is_active: category.is_active,
    });
    setFormError('');
    setImagePreviewError(false);
    setIsDrawerOpen(true);
  }

  function closeDrawer(force = false) {
    if (busy && !force) return;
    setIsDrawerOpen(false);
    setEditingId(null);
    setForm(blankForm);
    setFormError('');
    setImagePreviewError(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    const cleanName = form.name.trim();
    const cleanImage = form.image.trim();
    if (!cleanName || cleanName.length > 120) {
      setFormError('Enter a category name between 1 and 120 characters.');
      return;
    }
    if (form.description.length > 1000) {
      setFormError('Description must be 1,000 characters or fewer.');
      return;
    }
    if (
      cleanImage.length > 2048 ||
      (cleanImage !== '' && !/^https:\/\/[^\s/]+(?:\/|$)/i.test(cleanImage))
    ) {
      setFormError('Image URL must start with https:// and be 2,048 characters or fewer.');
      return;
    }

    setBusy(true);
    setFormError('');

    try {
      const body = {
        name: cleanName,
        description: form.description.trim() || null,
        image: cleanImage || null,
        is_active: form.is_active,
      };

      if (editingId) {
        await updateCategory(token, editingId, body);
        notify({ tone: 'success', message: `Category "${cleanName}" updated.` });
      } else {
        await createCategory(token, body);
        notify({ tone: 'success', message: `Category "${cleanName}" created.` });
      }

      closeDrawer(true);
      reload();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save category.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmAction() {
    if (!token || !confirm) return;
    setBusy(true);
    setError('');
    try {
      if (confirm.action === 'delete') {
        await deleteCategory(token, confirm.id);
        notify({ tone: 'success', message: `Category "${confirm.name}" deleted.` });
      } else {
        await updateCategory(token, confirm.id, { is_active: false });
        notify({ tone: 'success', message: `Category "${confirm.name}" deactivated.` });
      }
      if (editingId === confirm.id) {
        closeDrawer(true);
      }
      setConfirm(null);
      reload();
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Could not change category.';
      setError(msg);
      notify({ tone: 'error', message: msg });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(category: Category) {
    if (!token || busy) return;
    if (category.is_active) {
      setConfirm({ id: category.id, name: category.name, action: 'deactivate' });
    } else {
      setBusy(true);
      try {
        await updateCategory(token, category.id, { is_active: true });
        notify({ tone: 'success', message: `Category "${category.name}" activated.` });
        reload();
      } catch (cause) {
        const msg = cause instanceof Error ? cause.message : 'Could not activate category.';
        setError(msg);
        notify({ tone: 'error', message: msg });
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="page-stack">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">MENU MANAGEMENT</div>
          <h1>
            Drink Categories
            <span className="heading-period">.</span>
          </h1>
          <p>Organize the customer menu with live café data.</p>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleOpenCreate}
          disabled={loading}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Compact Category Stats */}
      {!loading && !error && (
        <div className="quick-stats-grid">
          <div className="quick-stat-card">
            <span className="quick-stat-icon cobalt" aria-hidden="true">
              <FolderTree size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Total Categories</span>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon emerald" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Active on Menu</span>
              <strong>{stats.active}</strong>
            </div>
          </div>
          <div className="quick-stat-card">
            <span className="quick-stat-icon dark-blue" aria-hidden="true">
              <Layers size={20} />
            </span>
            <div className="quick-stat-info">
              <span>Catalog Drinks</span>
              <strong>{stats.totalProducts}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Main Categories Panel */}
      <section className="panel">
        <search className="page-toolbar categories-toolbar">
          <div className="toolbar-controls">
            <label className="sr-only" htmlFor="category-search">
              Search categories
            </label>
            <div className="search-input-wrapper">
              <input
                id="category-search"
                name="category_search"
                type="search"
                className="text-input search-input"
                aria-label="Search categories"
                placeholder="Search categories…"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <Search size={15} className="search-icon" aria-hidden="true" />
            </div>

            <label className="sr-only" htmlFor="category-status-filter">
              Filter by status
            </label>
            <select
              id="category-status-filter"
              name="category_status"
              className="text-input filter-select category-status-select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={event =>
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          <div className="toolbar-actions">
            {(search || statusFilter !== 'all') && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                Reset filters
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={reload}
              aria-label="Reload categories"
              title="Reload categories"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </search>

        {loading ? (
          <LoadingState label="Loading categories…" />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No categories found"
            detail={
              search || statusFilter !== 'all'
                ? 'Try another search or filter.'
                : 'Click "Add Category" above to create your first menu grouping.'
            }
          />
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Drink Categories List"
          >
            <table>
              <caption className="sr-only">Drink Categories List</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Products</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="numeric">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(category => (
                  <tr key={category.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="thumbnail-box" aria-hidden="true">
                          <img
                            src={category.image?.trim() || CATEGORY_THUMBNAIL_FALLBACK}
                            alt=""
                            onError={e => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'true';
                                target.src = CATEGORY_THUMBNAIL_FALLBACK;
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <strong>{category.name}</strong>
                          {category.description && (
                            <span className="text-xs text-slate-500 truncate max-w-sm">
                              {category.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {category.product_count}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({category.available_product_count} available)
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          category.is_active ? 'status-completed' : 'status-unknown'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="numeric">
                      <div className="row-actions justify-end">
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => handleOpenEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => handleToggleActive(category)}
                        >
                          {category.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="text-link danger-link"
                          onClick={() =>
                            setConfirm({ id: category.id, name: category.name, action: 'delete' })
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

      {/* Category Editor Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => closeDrawer(false)}
        eyebrow="CATEGORY EDITOR"
        title={editingId ? 'Edit Category' : 'Add New Category'}
        description={
          editingId
            ? 'Update category name, description, and menu visibility.'
            : 'Group your handcrafted beverages logically for customer ordering.'
        }
        width="md"
        footer={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => closeDrawer(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" form="category-form" className="button-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Save Category' : 'Create Category'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Category name
            <input
              name="name"
              className="text-input"
              value={form.name}
              maxLength={120}
              required
              placeholder="e.g. Milk Tea, Cold Brew, Fruit Slush"
              onChange={event => setForm({ ...form, name: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Description (Optional)
            <textarea
              name="description"
              className="text-input"
              style={{ minHeight: '80px', padding: '10px 14px' }}
              value={form.description}
              maxLength={1000}
              placeholder="Short description of this beverage family"
              onChange={event => setForm({ ...form, description: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 font-bold text-xs text-slate-800">
            Image URL (Optional)
            <input
              name="image"
              className="text-input"
              type="url"
              pattern="https://.*"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={form.image}
              maxLength={2048}
              placeholder="https://example.com/categories/milk-tea.webp"
              onChange={event => {
                setForm({ ...form, image: event.target.value });
                setImagePreviewError(false);
              }}
            />
          </label>

          {/* Image preview */}
          {form.image.trim() && !imagePreviewError && (
            <div className="image-preview-card">
              <span className="text-xs text-slate-500 font-semibold self-start">
                Image Preview:
              </span>
              <img
                src={form.image.trim()}
                alt="Category preview"
                onError={() => setImagePreviewError(true)}
              />
            </div>
          )}
          {form.image.trim() && imagePreviewError && (
            <p className="text-xs text-rose-700" role="status">
              Image preview unavailable. Check the HTTPS URL before saving.
            </p>
          )}

          <label className="check-field mt-2 flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
            <input
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={event => setForm({ ...form, is_active: event.target.checked })}
            />
            <span>Active on customer menu</span>
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
              ? 'This permanently removes an empty category. Categories with products cannot be deleted.'
              : 'Products in this category will be hidden from new customer orders.'
          }
          busy={busy}
          confirmLabel={confirm.action === 'delete' ? 'Delete' : 'Deactivate'}
          tone={confirm.action === 'delete' ? 'danger' : 'primary'}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
