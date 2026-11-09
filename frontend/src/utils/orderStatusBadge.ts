export function getStatusBadge(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'completed':
      return 'bg-teal-100 text-teal-800 border-teal-300';
    case 'preparing':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-300';
  }
}

export function getPaymentBadge(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'pending':
    case 'unpaid':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'failed':
    case 'refunded':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-300';
  }
}
