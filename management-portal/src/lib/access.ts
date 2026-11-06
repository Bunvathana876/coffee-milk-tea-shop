export type PortalRole = 'admin' | 'seller'

export function canAccess(role: string | null | undefined, area: PortalRole): boolean {
  return role === area
}

export function supportedLandingPath(role: string | null | undefined): string | null {
  // Seller identity and store ownership are not implemented by the backend yet.
  return role === 'admin' ? '/admin/dashboard' : null
}
