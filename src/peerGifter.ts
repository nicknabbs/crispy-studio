// Singleton opener for the PeerGiftModal, same pattern as profileViewer.
// The modal lives in App.tsx (it needs the player's current pancake count +
// setDirectState to deduct on send). Profile button + chat button just call
// openPeerGift().

interface PresetRecipient {
  player_id: string;
  player_name: string;
}

type Opener = (preset?: PresetRecipient | null) => void;

let opener: Opener | null = null;

export function setPeerGiftOpener(cb: Opener | null) {
  opener = cb;
}

export function openPeerGift(preset?: PresetRecipient | null) {
  opener?.(preset ?? null);
}
