// 🛵 номери віртуальних столів: 1001+ — доставка (Д‑1…), 2001+ — самовивіз (С‑1…); решта — столи залу
export const GO_DEL = 1000, GO_PICK = 2000;
export const isGo = t => +t > GO_DEL;
export const goKind = t => +t > GO_PICK ? 'pick' : +t > GO_DEL ? 'del' : null;
export const tn = t => +t > GO_PICK ? 'С‑' + (t - GO_PICK) : +t > GO_DEL ? 'Д‑' + (t - GO_DEL) : t;
