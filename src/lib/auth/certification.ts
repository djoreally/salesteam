import { getProvider } from "@/lib/commerce/registry";
import type { Capability } from "@/lib/commerce/types";

/** Capability evidence framework: DECLARED → IMPLEMENTED → TESTED → CERTIFIED. */
export interface CapabilityEvidence {
  providerId: string;
  capability: Capability;
  declared: boolean;
  implemented: boolean;
  tested: boolean;
  certified: boolean;
  lastTested?: string;
  evidenceUrl?: string;
  notes?: string;
  adapterReference?: string;
}

const CERTIFIED: Record<string, Capability[]> = {
  printify: ["manufacturing.catalog.read", "manufacturing.product.write", "manufacturing.order.write", "manufacturing.status.read"] as Capability[],
  printful: ["manufacturing.catalog.read", "manufacturing.product.write", "manufacturing.order.write", "manufacturing.status.read"] as Capability[],
};

export function getDeclaredCapabilities(providerId: string): Capability[] {
  try { return getProvider(providerId).capabilities; } catch { return []; }
}

export function getImplementedCapabilities(providerId: string): Capability[] {
  // Provider descriptors are the executable adapter contract. Until a per-capability
  // test record exists, declared adapter capabilities are treated as implemented only.
  return getDeclaredCapabilities(providerId);
}

export function getCertifiedCapabilities(providerId: string): Capability[] {
  return CERTIFIED[providerId] ?? [];
}

export function getCapabilityEvidence(providerId: string, capability: Capability): Partial<CapabilityEvidence> | null {
  const declared = getDeclaredCapabilities(providerId).includes(capability);
  const implemented = getImplementedCapabilities(providerId).includes(capability);
  const certified = getCertifiedCapabilities(providerId).includes(capability);
  return {
    providerId,
    capability,
    declared,
    implemented,
    tested: certified,
    certified,
    notes: certified ? "Certified manufacturing primitive" : implemented ? "Adapter capability present; live certification pending" : "Capability not declared",
  };
}
