/** Only an explicit server `paid` value can be displayed as paid. */
export function isRecordedPaid(status: string | null | undefined): boolean {
  return status?.toLowerCase() === 'paid';
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return isRecordedPaid(status)
    ? 'PAID (SERVER RECORD)'
    : `${(status || 'unpaid').toUpperCase()} (NOT CONFIRMED PAID)`;
}
