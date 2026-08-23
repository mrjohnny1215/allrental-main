// ==========================================
// 직원(영업자) 계정 + 수수료 공제율 설정
// ==========================================
// 수수료 계산 방식 (A방식 - 엑셀/CSV 기준):
//   실지급 수수료 = 품목수수료(CSV, 약정년수별 절대금액) × (1 - 공제율)
//
//   all001 : 공제율 0%   → 수수료 100% 전액 지급
//   all002 : 공제율 10%  → 90% 지급
//   all003 : 공제율 18%  → 82% 지급
//   all004 : 공제율 24%  → 76% 지급
//
// ⚠️ 보안 고지: 프론트(Vercel 정적 호스팅) 번들에 아이디/비번이 노출됨.
//    "본인 수수료만 본다"는 UX 목적의 경량 로그인.
//
// 🔧 실제 운영: 아래 user1~4를 실제 아이디/비번으로 교체 후 재배포.
export const USERS = [
  { id: 'all001', pw: '1234', name: 'all001', deductRate: 0.00 },
  { id: 'all002', pw: '1234', name: 'all002', deductRate: 0.10 },
  { id: 'all003', pw: '1234', name: 'all003', deductRate: 0.18 },
  { id: 'all004', pw: '1234', name: 'all004', deductRate: 0.24 },
];

// 품목(모델) 수수료(원, 절대금액) → 해당 직원 실지급 수수료(원)
export function calcFee(baseFee, user) {
  const base = Number(baseFee || 0);
  if (!user || !user.deductRate) return base; // 공제율 없으면 전액
  return Math.round(base * (1 - user.deductRate));
}
