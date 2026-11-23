import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Calendar,
  CircleDollarSign,
  Download,
  Info,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  getDashboardSummary,
  getSalesReport,
  type DashboardSummary,
  type SalesReport,
  type SalesReportParams,
  type SalesReportStatusBreakdown,
} from '../lib/api';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const khr = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-US');

export type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatScopeDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { dateStyle: 'medium' });
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildSalesReportCsv(report: SalesReport): string {
  const totalOrders = Math.max(0, report.total_orders ?? 0);
  const lines: string[] = [
    ['Section', 'Metric', 'Value'].map(escapeCsvCell).join(','),
    ['Summary', 'Date From', report.date_from || 'all_time'].map(escapeCsvCell).join(','),
    ['Summary', 'Date To', report.date_to || 'present'].map(escapeCsvCell).join(','),
    ['Summary', 'Total Orders', totalOrders].map(escapeCsvCell).join(','),
    [
      'Summary',
      'Recognized Revenue (USD)',
      Number(report.total_revenue_usd || 0).toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(','),
    ['Summary', 'Recognized Revenue (KHR)', Math.round(Number(report.total_revenue_khr || 0))]
      .map(escapeCsvCell)
      .join(','),
    '',
    [
      'Status',
      'Order Count',
      'Share (%)',
      'Gross Total (USD)',
      'Gross Total (KHR)',
      'Recognized Revenue (USD)',
      'Recognized Revenue (KHR)',
    ]
      .map(escapeCsvCell)
      .join(','),
  ];

  for (const row of report.status_breakdown ?? []) {
    lines.push(
      [
        row.status,
        Math.max(0, row.order_count),
        calculatePercentage(row.order_count, totalOrders),
        Number(row.total_usd || 0).toFixed(2),
        Math.round(Number(row.total_khr || 0)),
        Number(row.recognized_revenue_usd || 0).toFixed(2),
        Math.round(Number(row.recognized_revenue_khr || 0)),
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function formatUsd(amount: number): string {
  return money.format(Number.isFinite(amount) ? amount : 0);
}

export function formatKhr(amount: number): string {
  return `៛${khr.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function calculatePercentage(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((Math.max(0, part) / total) * 100);
}

export function ZeroRevenueCard() {
  return (
    <div className="zero-revenue-card" role="region" aria-label="Revenue recognition notice">
      <div className="zero-revenue-icon" aria-hidden="true">
        <Info size={22} />
      </div>
      <div className="zero-revenue-content">
        <strong>Revenue Recognition Policy</strong>
        <p>
          No recognized revenue yet. Revenue is counted only for orders marked both Paid and
          Completed. Other orders remain excluded from recorded sales.
        </p>
      </div>
    </div>
  );
}

const lifecycleOrder: Record<string, number> = {
  pending: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 5,
};

export function AnalyticsPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [preset, setPreset] = useState<DatePreset>('all');
  const [appliedParams, setAppliedParams] = useState<SalesReportParams>({});
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dateError, setDateError] = useState('');

  const retry = useCallback(() => {
    setError('');
    setLoading(true);
    setRevision(value => value + 1);
  }, []);

  const selectPreset = useCallback((nextPreset: DatePreset) => {
    setDateError('');
    setPreset(nextPreset);
    if (nextPreset === 'custom') return;

    const today = new Date();
    const todayStr = toLocalYmd(today);
    if (nextPreset === 'all') {
      setAppliedParams({});
    } else if (nextPreset === 'today') {
      setAppliedParams({ date_from: todayStr, date_to: todayStr });
    } else if (nextPreset === '7d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setAppliedParams({ date_from: toLocalYmd(start), date_to: todayStr });
    } else if (nextPreset === '30d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setAppliedParams({ date_from: toLocalYmd(start), date_to: todayStr });
    }
    setLoading(true);
  }, []);

  function handleCustomSubmit(event: FormEvent) {
    event.preventDefault();
    if (!customFrom && !customTo) {
      setDateError('Select a start date, end date, or both.');
      return;
    }
    if (customFrom && customTo && customFrom > customTo) {
      setDateError('Start date must be on or before end date.');
      return;
    }
    setDateError('');
    setLoading(true);
    setAppliedParams({
      ...(customFrom ? { date_from: customFrom } : {}),
      ...(customTo ? { date_to: customTo } : {}),
    });
  }

  useEffect(() => {
    if (!token) return;
    let active = true;

    Promise.all([getSalesReport(token, appliedParams), getDashboardSummary(token)])
      .then(([salesData, summaryData]) => {
        if (active) {
          setReport(salesData);
          setSummary(summaryData);
          setLastRefreshed(new Date());
          setLoading(false);
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Report data is unavailable.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, appliedParams, revision]);

  const totalOrders = Math.max(0, report?.total_orders ?? 0);

  // Authoritative status breakdown directly from sales-report endpoint
  const statusDistribution = useMemo(() => {
    if (!report?.status_breakdown || report.status_breakdown.length === 0) {
      return [];
    }

    return [...report.status_breakdown]
      .sort((a, b) => {
        const orderA = lifecycleOrder[a.status.toLowerCase()] ?? 99;
        const orderB = lifecycleOrder[b.status.toLowerCase()] ?? 99;
        return orderA - orderB;
      })
      .map((item: SalesReportStatusBreakdown) => ({
        status: item.status,
        count: Math.max(0, item.order_count),
        percentage: calculatePercentage(item.order_count, totalOrders),
        recognizedUsd: item.recognized_revenue_usd || 0,
        totalUsd: item.total_usd || 0,
      }));
  }, [report?.status_breakdown, totalOrders]);

  // Clear date scope labeling
  const dateScopeLabel = useMemo(() => {
    if (!report?.date_from || report.date_from === 'all_time') {
      if (appliedParams.date_to) {
        return `Through ${formatScopeDate(appliedParams.date_to)}`;
      }
      return 'All-time café records';
    }
    const from = formatScopeDate(report.date_from);
    const to = report.date_to ? formatScopeDate(report.date_to) : 'Present';
    return from === to ? from : `${from} – ${to}`;
  }, [report?.date_from, report?.date_to, appliedParams.date_to]);

  const hasZeroRevenue = report?.total_revenue_usd === 0 && totalOrders > 0;
  const hasDateFilter = Boolean(appliedParams.date_from || appliedParams.date_to);

  function handleExportCsv() {
    if (!report || typeof document === 'undefined') return;
    const csv = buildSalesReportCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = appliedParams.date_from || 'all-time';
    link.href = url;
    link.download = `brew-boba-sales-report-${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">REPORTING &amp; ANALYTICS</div>
          <h1>
            Sales &amp; Café Insights
            <span className="heading-period">.</span>
          </h1>
          <p>Understand your café operations with verified order and revenue data.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="heading-pill">
            <span className="live-dot" aria-hidden="true" />
            <span>Latest available data</span>
            {lastRefreshed && (
              <span className="text-xs font-normal text-blue-700 ml-1">
                · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>
          {report && !loading && !error && (
            <button
              type="button"
              className="button-secondary text-xs flex items-center gap-1.5"
              onClick={handleExportCsv}
              aria-label="Export sales report as CSV"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={retry}
            disabled={loading}
            aria-label="Refresh analytics data"
            title="Refresh analytics data"
          >
            <RotateCcw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Date Range Filter Toolbar */}
      <section className="panel analytics-date-panel" aria-label="Report date range filter">
        <div className="analytics-date-toolbar">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar size={14} aria-hidden="true" />
              <span>Period:</span>
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map(option => (
              <button
                key={option.id}
                type="button"
                className={`status-tab ${preset === option.id ? 'active' : ''}`}
                aria-pressed={preset === option.id}
                onClick={() => selectPreset(option.id)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          <span className="panel-note">{dateScopeLabel}</span>
        </div>

        {preset === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="analytics-custom-date-form">
            <label htmlFor="analytics-date-from" className="text-xs font-bold text-slate-700">
              From
              <input
                id="analytics-date-from"
                name="date_from"
                type="date"
                className="text-input analytics-date-input"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </label>
            <label htmlFor="analytics-date-to" className="text-xs font-bold text-slate-700">
              To
              <input
                id="analytics-date-to"
                name="date_to"
                type="date"
                className="text-input analytics-date-input"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
            </label>
            <button type="submit" className="button-primary text-xs">
              Apply Range
            </button>
            {dateError && (
              <span role="alert" className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                <AlertCircle size={14} aria-hidden="true" />
                {dateError}
              </span>
            )}
          </form>
        )}
      </section>

      {loading ? (
        <LoadingState label="Loading café analytics and sales insights…" />
      ) : error ? (
        <ErrorState message={error} retry={retry} />
      ) : !report || report.total_orders === 0 ? (
        <div className="panel flex flex-col items-center gap-3 pb-6">
          <EmptyState
            title={
              hasDateFilter
                ? 'No orders recorded in this date range'
                : 'No orders recorded yet'
            }
            detail={
              hasDateFilter
                ? 'Try selecting a wider period or switch back to All Time.'
                : 'Sales insights and status distributions will populate after server orders are recorded.'
            }
          />
          {hasDateFilter && (
            <button
              type="button"
              className="button-secondary text-xs"
              onClick={() => selectPreset('all')}
            >
              Reset to All Time
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Revenue & Operational KPI Grid */}
          <div className="kpi-grid">
            <article className="kpi-card">
              <div className="kpi-top">
                <span>Recorded revenue (USD)</span>
                <span className="kpi-icon cobalt" aria-hidden="true">
                  <CircleDollarSign size={22} />
                </span>
              </div>
              <strong>{formatUsd(report.total_revenue_usd)}</strong>
              <small>Paid and completed orders only</small>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Recorded revenue (KHR)</span>
                <span className="kpi-icon emerald" aria-hidden="true">
                  <Banknote size={22} />
                </span>
              </div>
              <strong>{formatKhr(report.total_revenue_khr)}</strong>
              <small>Paid and completed orders only (KHR conversion)</small>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Total orders</span>
                <span className="kpi-icon amber" aria-hidden="true">
                  <Receipt size={22} />
                </span>
              </div>
              <strong>{number.format(report.total_orders)}</strong>
              <small>Across all order &amp; payment statuses</small>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Registered customers</span>
                <span className="kpi-icon dark-blue" aria-hidden="true">
                  <Users size={22} />
                </span>
              </div>
              <strong>{number.format(summary?.total_customers ?? 0)}</strong>
              <small>Verified accounts in database</small>
            </article>
          </div>

          {/* Zero Revenue Explanation Callout (Step 7) */}
          {hasZeroRevenue && <ZeroRevenueCard />}

          {/* Operational Distribution & Insights Panels */}
          <div className="analytics-grid">
            {/* Visual Status Distribution */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">ORDER TOPOLOGY</div>
                  <h2>Status distribution</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="panel-note">{dateScopeLabel}</span>
                  <span className="panel-note">
                    {number.format(totalOrders)} {totalOrders === 1 ? 'order' : 'orders'} total
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 -mt-3 mb-4">
                Authoritative proportions of orders across fulfillment stages.
              </p>

              {statusDistribution.length > 0 ? (
                <>
                  {/* Segmented Distribution Bar */}
                  <div className="distribution-container">
                    <div
                      className="distribution-bar"
                      role="img"
                      aria-label={`Order status breakdown (${number.format(totalOrders)} total): ${statusDistribution
                        .map(d => `${d.status} ${d.count} (${d.percentage}%)`)
                        .join(', ')}`}
                    >
                      {statusDistribution.map(item => {
                        const statusClass = [
                          'completed',
                          'ready',
                          'preparing',
                          'pending',
                          'cancelled',
                        ].includes(item.status.toLowerCase())
                          ? item.status.toLowerCase()
                          : 'unknown';
                        return (
                          <span
                            key={item.status}
                            className={`distribution-segment ${statusClass}`}
                            style={{ width: `${item.percentage}%` }}
                            title={`${item.status}: ${item.count} (${item.percentage}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Legend Cards */}
                    <div className="distribution-legend">
                      {statusDistribution.map(item => {
                        const statusClass = [
                          'completed',
                          'ready',
                          'preparing',
                          'pending',
                          'cancelled',
                        ].includes(item.status.toLowerCase())
                          ? item.status.toLowerCase()
                          : 'unknown';
                        return (
                          <div key={item.status} className="legend-card">
                            <div className="legend-left">
                              <span className={`legend-dot ${statusClass}`} aria-hidden="true" />
                              <span className="legend-name">{item.status}</span>
                            </div>
                            <div className="legend-stats">
                              <span className="legend-count">{number.format(item.count)}</span>
                              <span className="legend-pct">({item.percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Breakdown Table (Accessible Alternative) */}
                  <div className="table-scroll mt-6">
                    <table>
                      <caption className="sr-only">
                        Detailed order status financial contribution
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Status</th>
                          <th scope="col">Count</th>
                          <th scope="col">Share</th>
                          <th scope="col" className="numeric">
                            Recognized Revenue
                          </th>
                          <th scope="col">Accounting Rule</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusDistribution.map(item => {
                          const isRecognized =
                            item.status.toLowerCase() === 'completed' && item.recognizedUsd > 0;
                          return (
                            <tr key={item.status}>
                              <td>
                                <strong className="capitalize">{item.status}</strong>
                              </td>
                              <td>{number.format(item.count)}</td>
                              <td>{item.percentage}%</td>
                              <td className="numeric">
                                <strong
                                  className={isRecognized ? 'text-emerald-700' : 'text-slate-500'}
                                >
                                  {formatUsd(item.recognizedUsd)}
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`status-badge ${
                                    isRecognized ? 'status-completed' : 'status-unknown'
                                  }`}
                                >
                                  {isRecognized ? 'Recognized' : 'Unrecognized'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 py-4">
                  Detailed status breakdown is not provided in this report scope.
                </p>
              )}
            </section>

            {/* Operational Shortcuts & Scope Transparency */}
            <div className="flex flex-col gap-4">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <div className="eyebrow">QUICK ACCESS</div>
                    <h2>Operational tools</h2>
                  </div>
                </div>
                <p className="text-xs text-slate-500 -mt-3 mb-2">
                  Jump directly to administrative workflows.
                </p>

                <div className="shortcut-grid">
                  <Link to="/admin/orders" className="shortcut-card">
                    <div className="flex flex-col">
                      <strong>Order Queue</strong>
                      <span>Review live tickets</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />
                  </Link>

                  <Link to="/admin/products" className="shortcut-card">
                    <div className="flex flex-col">
                      <strong>Drink Catalog</strong>
                      <span>Manage menu items</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />
                  </Link>
                </div>
              </section>

              {/* Technical Roadmap / Scope Transparency */}
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <div className="eyebrow">REPORTING SCOPE</div>
                    <h2>Backend telemetry</h2>
                  </div>
                  <ShieldCheck size={18} className="text-emerald-600" aria-hidden="true" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Metrics on this dashboard are computed strictly from verified database records.
                  Advanced analytics such as <em>hourly demand curves</em>,{' '}
                  <em>product velocity</em>, and <em>customer retention cohorts</em> require
                  dedicated aggregation endpoints and are scheduled for a future backend milestone.
                </p>
              </section>
            </div>
          </div>

          {/* Financial Policy & Compliance Notice */}
          <div className="financial-policy-card" role="note">
            <ShieldCheck
              size={20}
              className="shrink-0 text-emerald-700 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <strong className="block text-emerald-900 font-semibold mb-1">
                Authoritative Financial Policy Notice ({dateScopeLabel})
              </strong>
              <span>
                Revenue is recognized exclusively when orders have both paid and completed status.
                Unpaid, pending, and cancelled orders contribute exactly zero recognized revenue.
                KHQR selection is a demonstration choice and does not confirm a bank transfer. Cash
                settlement records the administrator's observation under audit logs. Historical paid
                records should be reconciled against store registers prior to tax or financial
                accounting.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
