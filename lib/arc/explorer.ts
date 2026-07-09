import { ARC_EXPLORER_URL } from "@/lib/arc/constants";

export function getExplorerTxUrl(hash: string) {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string) {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}
