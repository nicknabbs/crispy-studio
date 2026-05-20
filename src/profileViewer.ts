// Tiny module-level singleton that lets any component anywhere in the tree
// open the ProfileViewModal without prop-drilling through 3 different parent
// modals (ChatPanel sits inside ChatDrawer AND inside OwnerPanel; Leaderboard
// sits inside App). App.tsx registers a single opener on mount; callers just
// import `openPlayerProfile` and call it.
//
// Yes, it's mutable module state. The alternative (React context) would
// require wrapping every consumer in a provider that includes OwnerPanel,
// which itself is rendered via a portal-like flow. The simplicity is worth
// the small impurity here.

type Opener = (playerId: string, fallbackName?: string) => void;

let opener: Opener | null = null;

export function setProfileOpener(cb: Opener | null) {
  opener = cb;
}

export function openPlayerProfile(playerId: string, fallbackName?: string) {
  if (!playerId) return;
  opener?.(playerId, fallbackName);
}
