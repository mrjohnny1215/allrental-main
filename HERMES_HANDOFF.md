# 상품 상세 이미지 정리 작업 인수인계

## 저장소와 현재 반영 상태

- 저장소: `mrjohnny1215/allrental_customer`
- 작업 브랜치: `main`
- 현대큐밍 상세 이미지 수집 및 노출 복구: `94ea179`
- 청호나이스 상세 이미지 오염 정리: `45f7fc7`
- 배포 사이트: `https://allrental-xi.vercel.app/`

현대큐밍과 청호나이스 수정은 빌드, GitHub 푸시, Vercel 공개 배포 검증까지 완료됐다. 이 두 브랜드의 `detail_description_images`는 다시 손상시키지 말아야 한다.

## 남은 목표

`public/data/products.json`의 코웨이, 쿠쿠, 웰스, LG 상품에 대해 상품별로 정확한 상세 이미지만 남긴다. 인기상품, 추천상품, 관련상품, 가입 유도상품, 공통 배너, 초기 로딩용 임시 이미지가 상세 이미지로 노출되면 안 된다.

정확한 상세 이미지를 확인할 수 없는 상품은 다른 상품 이미지를 보여주는 것보다 `detail_description_images: []`로 비우는 것이 우선이다. 가격, 수수료, 상품명, 모델명, 옵션 등 다른 필드는 변경하지 않는다.

## 코웨이 조사 결과

- 총 252개 상품, 상세 URL 126개(중복 제거 기준)
- 227개 상품에 같은 잘못된 이미지가 복사되어 있음:
  - `https://mall.cowaystatic.com/static/upload/product/product/ID0105_5314_attimg_org.jpg`
- 코웨이 공식몰은 초기 HTML에 임시 이미지를 넣고 JavaScript 로딩 후 실제 내용을 채운다.
- 렌더링 완료 후 실제 상세 영역은 `#vip_detail_pdp_wrap`이다.
- 공식몰 `아이스 스탠드 3.8` 페이지를 렌더링하면 해당 영역에 `CHPI-5810L(1)` 경로의 올바른 기능 이미지들이 들어온다.

사용자가 알려준 대체 소스 `https://cowayga.com/`도 활용 가능하다.

- 모델 검색 예시: `https://cowayga.com/product/search.html?keyword=CHPI-5810L`
- 동일 모델의 약정/관리주기별 상품이 여러 개 검색될 수 있으나 상세 이미지는 공유한다.
- 검색 결과 전체의 추천 링크를 가져오지 말고, 검색 결과 상품명/모델명이 정확히 일치하는 상품 링크를 선택해야 한다.
- 사용자 제공 CHPI-5810L 상세 페이지에는 실제 상세 이미지가 `ec-data-src`로 저장돼 있다.
  - `/web/upload/NNEditor/20230414/copy-1681456940-copy-1656480984-5810.jpg` (1260×14666)
  - `/web/upload/NNEditor/20230414/copy-1681456944-EB8BA4EC9AB4EBA19CEB939C.png` (1220×674)
- Cafe24 페이지 전체 이미지를 수집하지 말고 상품 상세 컨테이너 내부 `ec-data-src`만 사용한다.

## 쿠쿠 조사 결과

- 총 97개 상품, 상세 URL 77개(중복 제거 기준)
- URL 출처:
  - `www.cuckoo.co.kr`: 74개
  - `www.coupang.com`: 4개
  - `cuckoo.rentalplay.kr`: 1개
  - `waterrental.co.kr`: 18개
- 56개 상품에 상세 이미지 361개가 있으나 관련상품 이미지가 섞여 있다.
- 아래 이미지는 서로 다른 쿠쿠 상품 50개에 공통으로 잘못 포함돼 있다.
  - `https://cdn.cuckoo.co.kr/upload_cuckoo/_bo_rental/product/39148b52-f016-4695-b40e-8e482a978deb.jpg`
- 공식 페이지 `idx=445`에서 이 이미지는 `인스퓨어셀프직수얼음정수기`, 모델 `CP-SS011WSV(S)` 가입 유도상품 영역에 있다.
- `idx=445`의 앞선 3개 이미지는 해당 상품의 S/M/L 대표 이미지일 뿐 긴 상세 설명 이미지는 아니다.
- 최소한 관련상품/패키지/가입 유도 영역을 제외해야 하며, 정확한 상세 설명 컨테이너를 찾지 못하면 해당 상품 배열을 비운다.

## 웰스 조사 결과

- 총 88개 상품, 상세 URL 36개(중복 제거 기준)
- 82개는 `www.kyowonwells.com`, 6개는 URL이 비어 있다.
- 41개 상품에 상세 이미지 275개가 있으나 인기제품·추천상품 이미지가 섞여 있다.
- 대표 오류 상품: `아이스원 얼음정수기`, 모델 `WR872`
  - URL: `https://www.kyowonwells.com/Product/Detail?grpIdx=1462&productIdx=1190`
  - `00828014981.png`: `.popular-products`의 `웰스 에어가든 공기청정기`
  - `00295482188.png`: `.popular-products`의 다른 아이스원 상품
  - `00470166081.png`, `00035411429.png`, `00576591027.png`: `.recommended-prd` 추천상품
  - 실제 선택 상품 썸네일은 `#thumb-btns`에 있다.
- `.popular-products`와 `.recommended-prd`는 반드시 제외한다.
- 실제 제품 설명 후보 영역은 `.prd-details`, `#prdInfo_feature`이다. 제품 전용 이미지임을 검증하지 못하면 비운다.

## LG 조사 결과

- 총 45개 상품, 상세 URL 36개(중복 제거 기준)
- 현재 45개 모두 `detail_description_images: []` 상태라 화면에 상세 이미지가 없다.
- 공식 URL은 `www.lge.co.kr/care-solutions/...`에서 `www.lge.co.kr/product/care-solutions/...` 형태로 이동한다.
- 서버 HTML에 다음 실제 제품 설명 후보 영역이 있다.
  - `.care-solution-contents-html`
  - `.subscribe-feature`
  - `.PdpPcProductDetail_product_detail__...`
  - `#overview`
- 유사상품, 추천상품, 공통 배너, 카드 혜택 영역은 제외한다.
- 동적 렌더링이 필요하면 브라우저 로딩 후 제품 설명 컨테이너 내부 이미지만 추출한다.

## 구현 원칙

1. 브랜드별 재실행 가능한 스크립트를 `scripts/`에 추가한다.
2. `--dry-run`을 지원하고 낮은 동시성(약 2)을 사용한다.
3. 동일 URL이나 동일 모델은 한 번만 수집하고 결과를 공유한다.
4. 수집 실패 시 다른 상품 이미지를 보존하지 않는다. 정확성을 검증할 수 없으면 빈 배열을 쓴다.
5. URL은 절대주소로 정규화하고 중복을 제거한다.
6. 변경 전후를 비교해 대상 브랜드의 `detail_description_images` 외 필드가 바뀌지 않았는지 검사한다.
7. `npm run build`를 실행한다.
8. 대표 상품을 실제 화면에서 확인한다.
   - 코웨이: `아이스 스탠드 3.8` / `CHPI-5810L`
   - 쿠쿠: `대용량 얼음정수기 지하수(ACSR1620)` / `CP-ACSR1620SW`
   - 웰스: `아이스원 얼음정수기` / `WR872`
   - LG: `AI 오브제컬렉션 얼음정수기` / `WD724R`
9. 테팔, 공기청정기, 관련상품 등 다른 제품 이미지가 없는지 확인한다.
10. 커밋 후 `main`에 푸시하고 Vercel 공개 데이터와 실제 화면까지 확인한다.

## 주의사항

- `판매량 많은순`이 실제로 `max_commission` 기준인 것은 사용자가 의도한 동작이므로 변경하지 않는다.
- 현대큐밍 크롤러: `scripts/crawl-hyundai-details.mjs`
- 청호나이스 크롤러: `scripts/crawl-chungho-details.mjs`
- 카테고리 변경 시 브랜드 전체값은 이전 작업에서 수정됐으므로 되돌리지 않는다.
