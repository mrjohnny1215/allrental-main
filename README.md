# ALL렌탈 (allrental-main)

렌탈세계(rentalsegye.com)에서 수집한 **정수기 · 비데 · 공기청정기 · 매트리스** 렌탈 상품을
모아 보여주는 나만의 렌탈 카탈로그 사이트입니다.

## 구성

- `src/App.jsx` — React + Vite SPA (카테고리 탭, 검색, 브랜드/가격 필터·정렬, 상세 모달)
- `src/config.js` — 상담 이메일/전화/카카오톡, 카테고리·프로모션 설정 (**여기만 고치면 됨**)
- `public/products_data.json` — 상품 리스트 (493개: 정수기 228 / 비데 72 / 공기청정기 157 / 매트리스 36)
- `public/merged_products.json` — 상품별 상세 (약정기간·관리주기·색상·제휴카드)
- `backend/` — 원본 크롤러 (Python) 및 CSV 데이터

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드 -> dist/
npm run preview  # 빌드 결과 미리보기
```

## 배포 (Vercel)

이 저장소를 Vercel에 연결하면 자동으로 빌드/배포됩니다 (`vercel.json` 설정 포함).
빌드 명령: `npm run build`, 출력: `dist`.

## 상담 연락처 설정

`src/config.js`의 `SITE_CONFIG`에서 아래만 바꾸면 사이트 전체에 적용됩니다.

- `consultEmail` : 이메일 상담 수신 주소
- `phone` : 하단 플로팅 "전화 상담" 버튼 (tel: 링크)
- `kakaoUrl` : 카카오톡 채널 URL (비우면 버튼 숨김)

## 데이터 갱신

백엔드 크롤러로 새 데이터를 모은 뒤 `public/`의 JSON 두 개를 교체하고 재배포하세요.
