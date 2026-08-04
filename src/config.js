// 사이트 운영 설정 - 여기만 수정하면 상담 연락처가 전체에 반영됩니다.
export const SITE_CONFIG = {
  // 상담 받을 이메일 (이메일 상담신청에 사용)
  consultEmail: 'allrental@example.com',

  // 대표 전화번호 (클릭 시 tel: 링크)
  phone: '1877-2237',

  // 카카오톡 채널 URL (비워두면 버튼 숨김)
  kakaoUrl: '',

  // 카테고리 표시 순서/이름
  categories: [
    { key: 'water', name: '정수기' },
    { key: 'air', name: '공기청정기' },
    { key: 'bidet', name: '비데' },
    { key: 'mattress', name: '매트리스' },
  ],

  // NOTE: 카테고리별 기본 옵션(색상/관리주기/프로모션) 하드코딩은 제거했습니다.
  // 렌탈세계 실제 데이터(merged_products.json)만 표시하며, 데이터 없으면 "정보 없음"으로 표시합니다.

  // 브랜드 정렬 우선순위 (지정 브랜드를 앞에 배치)
  brandPriority: ['코웨이', '청호나이스', 'SK매직', '웰스', '쿠쿠', 'LG전자', '삼성'],
};
