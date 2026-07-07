/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterAsset, PropAsset, LocationAsset } from "./types";

export const DEFAULT_CHARACTERS: CharacterAsset[] = [
  {
    id: "char-1",
    name: "Kaelen",
    description: "a cybernetic rogue with glowing amber eyes, wearing a hooded dark chrome utility cloak with cyan fiber-optic stitching",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "char-2",
    name: "Dr. Aris",
    description: "an elegant chronomancer in gold-trimmed brass robes, wearing intricate brass clockwork goggles and white hair flowing backwards",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "char-3",
    name: "Nebula Beast",
    description: "a majestic tiger made of cosmic stardust, glowing with deep violet and gold cosmic energy, leaving stellar dust behind it",
    avatarUrl: "https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&q=80&w=600",
  }
];

export const DEFAULT_PROPS: PropAsset[] = [
  {
    id: "prop-1",
    name: "Plasma Blade",
    description: "a sleek laser katana with a pulsing turquoise energy edge, emitting faint electrical sparks and crackling sounds",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "prop-2",
    name: "Quantum Cube",
    description: "a floating hypercube made of crystalline light, constantly shifting geometric shapes and emitting a soft purple aura",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600",
  }
];

export const DEFAULT_LOCATIONS: LocationAsset[] = [
  {
    id: "loc-1",
    name: "Neo Tokyo Alley",
    description: "a rainy narrow cyberpunk street packed with towering holographic sushi signs, neon pink billboards, and water puddles reflecting cyber lights",
    imageUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "loc-2",
    name: "Stellar Oasis",
    description: "a bioluminescent garden on a distant glass planet, with transparent neon palm trees and floating liquid mercury streams under three giant moons",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
  }
];
