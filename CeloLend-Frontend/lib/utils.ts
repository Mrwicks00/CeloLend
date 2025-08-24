import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Token image mapping
export function getTokenImage(symbol: string): string {
  const tokenImages: { [key: string]: string } = {
    CELO: "/Celo.png",
    cUSD: "/cUSD.png",
    cEUR: "/cEUR.png",
    cREAL: "/cREAL.webp",
  };

  return tokenImages[symbol] || "/placeholder-logo.png";
}
