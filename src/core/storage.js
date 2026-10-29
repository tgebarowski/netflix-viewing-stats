// Namespaced localStorage wrapper that never throws.

export const LS = {
  get(k, d) { try { const v = localStorage.getItem('nfh.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nfh.' + k, JSON.stringify(v)); return true; } catch (e) { console.warn('storage full', e); return false; } },
  del(k) { try { localStorage.removeItem('nfh.' + k); } catch {} },
};
