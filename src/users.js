// ==========================================
// 직원(영업자) 계정 + 수수료 설정 + 회원가입
// ==========================================
// 수수료 모델 (A방식):
//   수수료 = 월 렌탈료(price) × feeRate(소수, 예: 0.05 = 5%)
// 각 직원이 로그인하면 본인 수수료율로 상품별 수수료가 계산되어
// 카드/상세 화면에 노출됩니다. (동일 상품이 사람마다 다른 수수료로 표시됨)
//
// ⚠️ 보안 고지: 이 파일은 프론트(Vercel 정적 호스팅)에 포함되므로
//    아이디/비번이 클라이언트 번들에 노출됩니다. 즉 "진짜 인증"이 아닌
//    "본인 수수료만 본다"는 UX 목적의 경량 로그인입니다.
//    실제 영업 기밀이라기보다 "내 수수료가 남랑 다르게 보인다"가 핵심.
//
// 📝 회원가입: Vercel 정적 호스팅이라 백엔드 DB가 없으므로,
//    가입한 계정은 브라우저 localStorage 에 저장됩니다(기기/브라우저별 독립).
//    시드 계정(아래 SEED_USERS)은 언제든 로그인 가능한 기본 계정입니다.

// 기본 계정 (미리 등록된 시드)
export const SEED_USERS = [
  { id: 'all001', pw: '1234', name: 'all001', feeRate: 0.05 },
  { id: 'all002', pw: '1234', name: 'all002', feeRate: 0.07 },
  { id: 'all003', pw: '1234', name: 'all003', feeRate: 0.08 },
  { id: 'all004', pw: '1234', name: 'all004', feeRate: 0.06 },
];

const REG_KEY = 'allrental_registered_users_v1';

// localStorage 에 저장된 가입 계정 로드
export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 전체 계정(시드 + 가입) 반환 — 하위 호환용
export const USERS = [...SEED_USERS, ...getRegisteredUsers()];

// 로그인 검증 (시드 + 가입 계정 모두 대상)
export function findUser(id, pw) {
  const all = [...SEED_USERS, ...getRegisteredUsers()];
  return all.find((u) => u.id === id && u.pw === pw) || null;
}

// 회원가입 (중복 아이디 체크 후 localStorage 저장)
export function registerUser({ id, pw, name, feeRate }) {
  const id2 = (id || '').trim();
  const pw2 = (pw || '').trim();
  if (id2.length < 3) return { ok: false, error: '아이디는 3자 이상 입력하세요.' };
  if (pw2.length < 4) return { ok: false, error: '비밀번호는 4자 이상 입력하세요.' };

  const all = [...SEED_USERS, ...getRegisteredUsers()];
  if (all.some((u) => u.id === id2)) {
    return { ok: false, error: '이미 존재하는 아이디입니다.' };
  }

  const newUser = {
    id: id2,
    pw: pw2,
    name: (name || '').trim() || id2,
    feeRate: Number(feeRate) || 0.05,
  };
  const list = getRegisteredUsers();
  list.push(newUser);
  localStorage.setItem(REG_KEY, JSON.stringify(list));
  return { ok: true };
}

// 월 렌탈료(숫자) → 해당 직원 수수료(원) 계산
export function calcFee(monthlyPrice, user) {
  const p = Number(monthlyPrice || 0);
  if (!user || !user.feeRate) return 0;
  return Math.round(p * user.feeRate);
}
