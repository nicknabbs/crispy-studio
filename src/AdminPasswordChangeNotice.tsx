import { useState } from 'react';

const OLD_AUTH_KEY = 'pancake-admin-unlocked-v2';
const COMPENSATION_KEY = 'pancake-admin-compensation-v3';
const GRANT_AMOUNT = 10_000_000;

interface Props {
  addCookies: (amount: number) => void;
}

export function AdminPasswordChangeNotice({ addCookies }: Props) {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem(OLD_AUTH_KEY) === 'true'
      && localStorage.getItem(COMPENSATION_KEY) !== 'true';
  });

  if (!visible) return null;

  const handleClaim = () => {
    addCookies(GRANT_AMOUNT);
    localStorage.setItem(COMPENSATION_KEY, 'true');
    localStorage.removeItem(OLD_AUTH_KEY);
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="p-6 text-center">
          <div className="text-5xl mb-3">🥞🔒</div>
          <h2 className="text-xl font-bold text-amber-900 mb-3">
            Admin password changed
          </h2>
          <p className="text-amber-950 mb-2 leading-relaxed">
            If you had admin, we had to change the password since so many people knew it. Sorry!
          </p>
          <p className="text-amber-950 mb-5 leading-relaxed">
            As an apology, here's <span className="font-bold">10,000,000 free pancakes</span> on the house. 🥞
          </p>
          <button
            onClick={handleClaim}
            className="w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-lg shadow-lg transition-colors"
          >
            Claim 10,000,000 pancakes
          </button>
        </div>
      </div>
    </div>
  );
}
