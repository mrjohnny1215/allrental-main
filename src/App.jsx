import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SITE_CONFIG } from './config';
import { useSession, LoginGate } from './auth';
import { calcFee } from './users';

// ==========================================
// 에러 경계 (상세 페이지 크래시 시 빈 화면 방지)
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, errMsg: error && error.message ? error.message : String(error) }; }
  componentDidCatch(error, info) { console.error('상세페이지 에러:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-700 font-medium mb-1">페이지를 불러오지 못했습니다</p>
            <p className="text-xs text-red-600 mt-2 break-words">{this.state.errMsg}</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">새로고침</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 추천상품 자동 회전 캐러셀 (렌탈세계 동일)
// ==========================================
function RecommendCarousel({ items, onSelect }) {
  const [idx, setIdx] = useState(0);
  const len = items.length;
  useEffect(() => {
    if (len <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % len), 3000);
    return () => clearInterval(t);
  }, [len]);

  // 한 화면에 보여줄 슬라이드 수 (모바일 2개, 데스크탑 4개)
  const visible = 4;
  const pages = Math.max(1, Math.ceil(len / visible));
  const pageIdx = Math.floor(idx / visible) % pages;

  return (
    <div className="mb-8">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-blue-600">📋</span> 추천 상품
      </h3>
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out gap-3"
          style={{ transform: `translateX(-${pageIdx * 100}%)` }}
        >
          {Array.from({ length: pages }).map((_, p) => (
            <div key={p} className="flex gap-3 shrink-0" style={{ width: '100%' }}>
              {items.slice(p * visible, p * visible + visible).map((it, i) => (
                <button key={i} onClick={() => onSelect && onSelect(it)}
                  className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all text-left">
                  <div className="h-24 bg-gray-50 flex items-center justify-center p-2">
                    {it.image ? (
                      <SmartImage src={it.image.startsWith('//') ? 'https:' + it.image : it.image} alt={it.name} brand={extractBrand(it.name)} className="h-24" />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight mb-1 h-7 overflow-hidden">{it.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-500">월료</span>
                      <span className="text-xs font-bold text-gray-900">{it.price ? Number(it.price).toLocaleString()+'원' : '가격문의'}</span>
                    </div>
                    {it.discount && (
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-red-600">할인</span>
                        <span className="text-[11px] font-bold text-red-600">{Number(it.discount).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: pages }).map((_, p) => (
            <button key={p} onClick={() => setIdx(p * visible)}
              className={`h-2 rounded-full transition-all ${p === pageIdx ? 'w-5 bg-blue-600' : 'w-2 bg-gray-300'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 유틸
// ==========================================
function normalizeUrl(u) {
  if (!u) return '';
  return u
    .replace('https://www.rentalsegye.com', 'https://rentalsegye.com')
    .replace('http://www.rentalsegye.com', 'http://rentalsegye.com')
    .replace('https://rentalsegye.com', 'https://rentalsegye.com');
}

// 렌탈세계 상품 고유번호(no) 추출 — 추천 URL(no=11344)과 목록 URL(no=11470&cid=..&gid=..) 매칭용
function getNo(u) {
  if (!u) return '';
  const m = u.match(/no=(\d+)/);
  return m ? m[1] : '';
}

function extractBrand(desc = '') {
  const m = desc.match(/\[(.*?)\]/);
  return m ? m[1] : '기타';
}

// 정수기 기능 분류 — 렌탈세계 실제 '기능 XXX' 태그 우선, 없으면 제목 키워드 폴백
function classifyFunc(product) {
  const desc = product?.desc || '';
  const tag = product?.func_tag;
  const VALID = ['냉수전용','냉온전용','얼음냉온','얼음냉정','온수전용','정수전용','커피정수기','탄산정수기'];
  if (tag && VALID.includes(tag)) return tag;
  const d = desc;
  if (d.includes('얼음') && d.includes('냉정')) return '얼음냉정';
  if (d.includes('얼음')) return '얼음냉온';
  if (d.includes('탄산')) return '탄산정수기';
  if (d.includes('커피')) return '커피정수기';
  if (d.includes('냉온')) return '냉온전용';
  if (d.includes('냉수')) return '냉수전용';
  if (d.includes('온수')) return '온수전용';
  return '정수전용';
}
function classifyType(desc = '') {
  const d = desc;
  if (d.includes('빌트인') || d.includes('매립')) return '빌트인';
  if (d.includes('스탠드')) return '스탠드형';
  if (d.includes('하프') || d.includes('언더') || d.includes('캐비닛')) return '하프형';
  return '스탠드형';
}
function classifyMethod(desc = '') {
  const d = desc;
  if (d.includes('탱크') || d.includes('저수조') || d.includes('저장')) return '탱크형';
  return '직수형';
}

// ==========================================
// 스마트 이미지 (외부 CDN 깨져도 깨끗한 로컬 브랜드 폴백)
// - lazy loading (loading="lazy")
// - onError 시 외부 placeholder 가 아닌 로컬 브랜드 라벨로 대체 (CDN/외부망 의존 제거)
// ==========================================
function SmartImage({ src, alt, brand, className }) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className || ''}`}>
        <span className="text-3xl mb-1">📦</span>
        <span className="text-[10px] font-bold text-gray-400 leading-tight px-1">{brand || 'ALL렌탈'}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`max-h-full max-w-full object-contain ${className || ''}`}
      onError={() => setErrored(true)}
    />
  );
}
function classifyPriceRange(price = 0) {
  const p = parsePrice(price);
  if (p <= 10000) return '1만원이하';
  if (p < 20000) return '1만원대';
  if (p < 30000) return '2만원대';
  if (p < 40000) return '3만원대';
  if (p <= 100000) return '4~10만원';
  return '10만원이상';
}
// 공기청정기 평형/기능
function classifyArea(desc = '') {
  const d = desc;
  const m = d.match(/(\d+)\s*평/);
  if (m) { const n = parseInt(m[1],10); if (n<=10) return '10평이하'; if (n<=20) return '11~20평'; if (n<=30) return '21~30평'; return '31~50평'; }
  if (d.includes('대형') || d.includes('30평') || d.includes('50평')) return '31~50평';
  return '11~20평';
}
function classifyAirFunc(desc = '') {
  const d = desc;
  if (d.includes('가습')) return '가습기능';
  if (d.includes('온풍')) return '온풍기능';
  if (d.includes('제습')) return '제습기능';
  if (d.includes('펫') || d.includes('반려')) return '펫기능';
  if (d.includes('환기')) return '환기청정기';
  return ''; // 렌탈세계엔 '일반청정' 칩 없음 → 매칭 안 되면 필터에서 제외
}
// 매트리스 타입 (상품명 실제 특성 기준 — 렌탈세계 '타입' 필터와 유사한 의미 분류)
function classifyMattressType(desc = '') {
  const d = desc;
  if (d.includes('탑퍼')) return '탑퍼교체';
  if (d.includes('메모리')) return '메모리폼';
  if (d.includes('커버') || d.includes('원바디')) return '커버교체';
  if (d.includes('온열')) return '온열';
  if (d.includes('말총')) return '말총';
  if (d.includes('하이브리드')) return '하이브리드';
  if (d.includes('유로탑')) return '유로탑';
  if (d.includes('포켓스프링')) return '포켓스프링';
  if (d.includes('폼')) return '폼';
  if (d.includes('모션') || d.includes('마사지') || d.includes('안마') || d.includes('진동')) return '모션/마사지';
  // 라인업명 기반 보강 (코웨이/청호/SK매직/쿠쿠/젠티스 등)
  if (d.includes('비렉스') || d.includes('엘리트') || d.includes('시그니처') || d.includes('스마트') || d.includes('모디') || d.includes('온리') || d.includes('듀얼') || d.includes('William') || d.includes('웜') || d.includes('레스티노') || d.includes('워커힐') || d.includes('디클라시') || d.includes('네스티지') || d.includes('로얄스위트') || d.includes('멜로우') || d.includes('고마르코') || d.includes('어댑트') || d.includes('헬렌') || d.includes('마제스틱') || d.includes('레인보우')) return '스프링매트리스';
  return '기타';
}

const parsePrice = (s) => parseInt(String(s || '0').replace(/[^0-9]/g, ''), 10) || 0;

// ==========================================
// 스마트 필터 칩 버튼 그룹
// ==========================================
function FilterChips({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-black text-blue-700 w-16 flex-shrink-0 bg-blue-50 border border-blue-100 rounded-md px-1.5 py-1 text-center">{label}</span>
      <button onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${value === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
        전체
      </button>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${value === opt ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// 상품 상세 모달
// ==========================================
function ProductDetailModal({ product, onClose, onSelectRecommend, allProducts, sessionUser, feeTable, showFee }) {
  if (!product) return null;
  const catKey = product.category;
  const detail = product.detail || product || {};
  // detail 필드 안전 기본값 (null/undefined 접근 방지)
  const safeDetail = {
    it_price: detail.it_price,
    period_prices: detail.period_prices || {},
    rental_periods: detail.rental_periods || [],
    maintenance_cycles: detail.maintenance_cycles || [],
    colors: detail.colors || [],
    sizes: detail.sizes || [],
    care_types: detail.care_types || [],
    detail_images: detail.detail_images || [],
    partner_cards: detail.partner_cards || [],
    promotion: detail.promotion,
    product_type: detail.product_type || '',
    as_period: detail.as_period || '',
  };
  // 하위 코드 호환: detail을 safeDetail로 교체
  const d = safeDetail;
  const isMattress = catKey === 'mattress';

  // 오버레이 스크롤 컨테이너 ref
  const scrollRef = useRef(null);

  // 상세 페이지 진입 / 추천상품 전환 시 스크롤 맨 위로
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [product]);

  // 렌탈 불가 상품 (렌탈세계에서 판매/렌탈 중단된 상품)
  const notAvailable = d.not_available;

  // 실제 렌탈세계 데이터만 사용 (하드코딩 폴백 제거)
  const periods = d.rental_periods && d.rental_periods.length
    ? d.rental_periods
    : [];
  const cycles = d.maintenance_cycles && d.maintenance_cycles.length
    ? d.maintenance_cycles
    : [];
  const colors = d.colors && d.colors.length
    ? d.colors
    : [];
  const sizes = d.sizes && d.sizes.length
    ? d.sizes
    : [];
  const careTypes = d.care_types && d.care_types.length
    ? d.care_types
    : [];
  const detailImages = d.detail_images && d.detail_images.length
    ? d.detail_images
    : [];
  const cards = d.partner_cards && d.partner_cards.length
    ? d.partner_cards
    : [];
  const promotion = d.promotion && d.promotion.length ? d.promotion : '';
  const recommendations = d.recommendations && d.recommendations.length
    ? d.recommendations
    : [];
  // 교차 추천: 렌탈세계는 같은 카테고리만 추천하므로, 다른 카테고리 인기 상품(월료 낮은 순)을 섞어서 다양성 확보
  const recNos = new Set(recommendations.map((r) => getNo(r.url)));
  let crossRecs = [];
  if (allProducts && allProducts.length) {
    crossRecs = allProducts
      .filter((p) => p.category !== catKey && p.desc && getNo(p.url) && !recNos.has(getNo(p.url)))
      .sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
      .slice(0, 8)
      .map((p) => ({
        name: p.desc,
        price: p.price,
        image: p.image,
        url: p.url,
        logo: p.logo,
      }));
  }
  const allRecommendations = [...recommendations, ...crossRecs].slice(0, 12);
  const brand = d.brand || '';
  const productType = classifyFunc(product) || d.product_type || '';
  const asPeriod = d.as_period || '';

  // periodPrices는 아래 useState 초기값에서 참조하므로, 선언을 먼저 해야 함 (TDZ 방지)
  const periodPrices = d.period_prices || {};

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0] || '');
  const [selectedCycle, setSelectedCycle] = useState(
    (periodPrices[periods[0]] ? Object.keys(periodPrices[periods[0]])[0] : '') || cycles[0] || ''
  );
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [showCardModal, setShowCardModal] = useState(false);

  // 렌탈세계 동일 실시간 가격 계산: 최종월료 = it_price + 관리주기추가금(기간별 상이)
  const itPrice = parsePrice(d.it_price) || parsePrice(product.price);
  const addForPeriod = periodPrices[selectedPeriod] || {};
  const cycleAdd = addForPeriod[selectedCycle] || 0;
  const basePrice = itPrice + cycleAdd;
  // 0원 방어: 실제 금액 미확보 시 '가격문의'로 폴백 (손님 화면 0원 노출 방지)
  const calculatedPrice = basePrice > 0 ? basePrice.toLocaleString() : '가격문의';

  const handleConsult = () => {
    const brand = extractBrand(product.desc);
    const msg = encodeURIComponent(
      `[ALL렌탈 상담 신청]\n\n` +
      `📦 상품명: ${product.desc}\n` +
      `🔢 모델명: ${product.model}\n` +
      `🏷️ 브랜드: ${brand}\n` +
      `⏳ 약정 기간: ${selectedPeriod}\n` +
      `🔧 관리 주기: ${selectedCycle}\n` +
      `🎨 ${isMattress ? '사이즈' : '색상'}: ${selectedColor || '기본'}\n` +
      `💰 예상 월 렌탈료: ${calculatedPrice}원\n` +
      (product.discount && product.discount !== '0' ? `🎉 할인적용가: ${product.discount}원\n` : '') +
      `\n상세 견적 및 설치 가능 여부 부탁드립니다.`
    );
    if (SITE_CONFIG.kakaoUrl) {
      window.open(SITE_CONFIG.kakaoUrl, '_blank', 'noreferrer');
      return;
    }
    window.location.href = `mailto:${SITE_CONFIG.consultEmail}?subject=${subject}&body=${msg}`;
  };

  return (
    <div ref={scrollRef} className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      {/* 상단 바 (뒤로가기) */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-medium flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          목록
        </button>
        <h1 className="text-base font-bold text-gray-900 truncate">{product.desc}</h1>
      </div>

      {/* 브레드크럼 (렌탈세계 동일) */}
      {detail.breadcrumb && detail.breadcrumb.length > 0 && (
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 max-w-3xl mx-auto w-full">
          <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
            <span>HOME</span>
            {detail.breadcrumb.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-300">›</span>
                <span>{c}</span>
              </span>
            ))}
            <span className="text-gray-300">›</span>
            <span className="text-gray-700 font-medium">{product.desc}</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-4">
        {notAvailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-sm font-bold text-amber-900">현재 렌탈 신청 불가 상품입니다</div>
              <div className="text-xs text-amber-700 mt-0.5">렌탈세계에서 판매/렌탈이 종료된 상품으로, 상세 옵션을 제공해 드리지 못합니다. 다른 상품을 추천해 드릴까요?</div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center overflow-hidden">
            {product.logo ? <img src={product.logo.startsWith('//') ? 'https:' + product.logo : product.logo} alt="logo" className="h-7 w-auto object-contain mb-2" onError={(e) => { e.target.style.display = 'none'; }} /> : <div className="text-sm font-bold text-blue-700 mb-2">{brand || extractBrand(product.desc)}</div>}
            <div className="w-full h-56 sm:h-64 flex items-center justify-center overflow-hidden">
              <SmartImage src={(product.image || (product.detail_images && product.detail_images[0]) || '')} alt={product.desc} brand={brand || extractBrand(product.desc)} className="h-full" />
            </div>
            {detailImages.length > 1 && (
              <div className="flex gap-1.5 mt-3 w-full overflow-x-auto pb-1">
                {detailImages.slice(0, 6).map((img, i) => (
                  <img key={i} src={img} alt={`${product.desc} ${i + 1}`} loading="lazy"
                    className="h-12 w-12 object-cover rounded-lg border border-gray-200 flex-shrink-0 bg-white"
                    onError={(e) => (e.target.style.display = 'none')} />
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
              <div>
                <span className="text-xs text-gray-400">브랜드 </span>
                <span className="text-base font-bold text-blue-700">{brand || extractBrand(product.desc)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400">모델명 </span>
                <span className="text-sm font-mono text-gray-800">{product.model}</span>
              </div>
            </div>
            <div className="mb-3">
              <span className="text-xs text-gray-400">제품종류 </span>
              <span className="text-sm font-semibold text-gray-800">{productType || '-'}</span>
            </div>
            <div className="text-xs text-gray-500 mb-1">AS기간</div>
            <div className="text-sm font-semibold text-gray-800 mb-3">{asPeriod || '-'}</div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">월 렌탈료</span>
                <span className="text-xl font-bold text-gray-900">{calculatedPrice}원</span>
              </div>
              {sessionUser && showFee && feeTable[product.model] && (() => {
                const modelFee = feeTable[product.model];
                const periodFee = modelFee[selectedPeriod];
                if (!periodFee) return null;
                // 사용자가 고른 관리주기(없으면 첫 슬롯)의 수수료를 동적으로 표시
                const cycleKey = periodFee[selectedCycle] != null ? selectedCycle
                  : Object.keys(periodFee)[0] || '';
                if (cycleKey === '' || periodFee[cycleKey] == null) return null;
                const fee = calcFee(periodFee[cycleKey], sessionUser);
                return (
                  <div className="pt-1.5 mt-1 border-t border-blue-200 space-y-0.5">
                    <div className="text-sm text-emerald-700 font-semibold mb-0.5">
                      내 수수료 ({selectedPeriod} · {cycleKey})
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-emerald-700">예상 수수료</span>
                      <span className="text-lg font-bold text-emerald-700">{fee.toLocaleString()}원</span>
                    </div>
                  </div>
                );
              })()}
              {product.discount && product.discount !== '0' && (
                <div className="flex justify-between items-center pt-1 border-t border-blue-200">
                  <span className="text-sm text-red-600">할인적용</span>
                  <span className="text-lg font-bold text-red-600">{Number(product.discount || 0).toLocaleString()}원</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 mb-6">
          {periodPrices[selectedPeriod] && Object.keys(periodPrices[selectedPeriod]).length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">관리 주기</label>
              <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                <option value="">선택안함</option>
                {Object.keys(periodPrices[selectedPeriod]).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">렌탈 기간</label>
            {periods.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {periods.map((period) => (
                  <button key={period} onClick={() => { setSelectedPeriod(period); const cyc = periodPrices[period] ? Object.keys(periodPrices[period]) : []; setSelectedCycle(cyc[0] || ''); }}
                    className={`py-2.5 px-2 rounded-lg border-2 text-sm font-semibold transition-all ${selectedPeriod === period ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div>{period}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-200">해당 상품의 렌탈 기간 정보가 없습니다.</div>
            )}
          </div>

          {isMattress ? (
            sizes.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">매트리스 사이즈 / 관리등급</label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((item) => (
                    <button key={item} onClick={() => setSelectedColor(item)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedColor === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            colors.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">제품 색상</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((item) => (
                    <button key={item} onClick={() => setSelectedColor(item)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedColor === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {isMattress && careTypes.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">관리 유형</label>
              <div className="flex flex-wrap gap-2">
                {careTypes.map((item) => (
                  <span key={item} className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {promotion ? (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
              <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center">
                <span className="mr-2">🎉</span> 진행 중인 프로모션
              </h4>
              <div className="text-sm text-red-700 font-medium">• {promotion}</div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center">
                <span className="mr-2">🎉</span> 진행 중인 프로모션
              </h4>
              <div className="text-sm text-gray-400">해당 상품의 프로모션 정보가 없습니다.</div>
            </div>
          )}

          {cards.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-purple-900 flex items-center">
                  <span className="mr-2">💳</span> 제휴카드 안내
                </h4>
                <button onClick={() => setShowCardModal(true)} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700">자세히 보기</button>
              </div>
              <div className="space-y-2">
                {cards.slice(0, 2).map((card, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 flex items-center gap-3 border border-purple-100">
                    {card.image ? (
                      <img src={card.image.startsWith('//') ? 'https:' + card.image : card.image} alt={card.name} className="h-7 w-auto object-contain flex-shrink-0" onError={(e) => (e.target.style.display = 'none')} />
                    ) : null}
                    <span className="text-sm font-semibold text-gray-800">{card.name}</span>
                  </div>
                ))}
                {cards.length > 2 && (
                  <div className="text-xs text-purple-600 text-center pt-1">외 {cards.length - 2}개 카드 더보기</div>
                )}
              </div>
            </div>
          )}
        </div>

        {detailImages.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">제품 상세</label>
            <div className="space-y-3">
              {detailImages.map((img, i) => (
                <img
                  key={i}
                  src={img.startsWith('//') ? 'https:' + img : img}
                  alt={`${product.desc} 상세이미지 ${i + 1}`}
                  className="w-full rounded-xl border border-gray-200"
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ))}
            </div>
          </div>
        )}

        <button onClick={handleConsult}
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg hover:from-yellow-500 hover:to-yellow-600 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98] mb-8">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c5.5 0 10 3.6 10 8s-4.5 8-10 8c-1.1 0-2.2-.1-3.2-.4L4 20l.9-3.3C3.3 15.5 2 13.3 2 11c0-4.4 4.5-8 10-8z"/></svg>
          카톡 상담신청
        </button>

        {allRecommendations.length > 0 && (
          <RecommendCarousel items={allRecommendations} onSelect={onSelectRecommend} />
        )}
      </div>

      {/* footer (빈 영역 - 추후 정보 입력 예정) */}
      <footer className="bg-white text-gray-600 mt-8 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
          <div className="font-bold text-gray-900 text-base mb-3">올(AII)렌탈</div>
          <div className="space-y-1 text-gray-500">
            <div>주식회사 올(AII)렌탈 | 대표이사 : 김성훈</div>
            <div>사업자등록번호 : 764-36-01626</div>
            <div>업태 : 서비스업 | 종목 : 정수기, 청정기, 비데, 안마의자 렌탈</div>
            <div>주소 : 301ho, 27 Daejukseoro 16beon-gil, Muan-gun, Gwangju-metropolitan Autonomous City, Republic of Korea</div>
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 text-gray-400 text-xs">
            Copyright 2026 주식회사 올(AII)렌탈 All rights reserved
          </div>
        </div>
      </footer>

      {showCardModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowCardModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center"><span className="mr-2">💳</span> 제휴카드 안내</h3>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {cards.map((card, idx) => (
                <div key={idx} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-3 mb-3">
                    {card.image ? (
                      <img src={card.image.startsWith('//') ? 'https:' + card.image : card.image} alt={card.name} className="h-8 w-auto object-contain" onError={(e) => (e.target.style.display = 'none')} />
                    ) : null}
                    <span className="text-sm font-bold text-purple-900">{card.name}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {card.benefits && card.benefits.map((b, bi) => (
                      <li key={bi} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 메인 App
// ==========================================
export default function App() {
  const [products, setProducts] = useState([]);
  const [feeTable, setFeeTable] = useState({}); // 모델별 수수료 (CSV)
  const [loading, setLoading] = useState(true);
  const loadStartRef = useRef(Date.now());
  const [activeCategory, setActiveCategory] = useState(SITE_CONFIG.categories[0].key);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sort, setSort] = useState('sales_desc');
  const [funcFilter, setFuncFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [airFuncFilter, setAirFuncFilter] = useState('all');
  const [mattressTypeFilter, setMattressTypeFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 직원 로그인 세션 (수수료 표시용)
  const { user: sessionUser, login, logout } = useSession();
  // 수수료 표시 ON/OFF 토글 (우측하단 녹색 버튼) — 기본 ON
  const [showFee, setShowFee] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      loadStartRef.current = Date.now();
      try {
        // 빌드 시점마다 바뀌는 캐시 키 주입 (vite.config.js define으로 주입, 미설정 시 날짜 기반 폴백)
        const CACHE_BUST = (import.meta.env.VITE_CACHE_BUST || `d${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
        const [listRes, detailRes] = await Promise.all([
          fetch(`/products_data.json?v=${CACHE_BUST}`),
          fetch(`/merged_products.json?v=${CACHE_BUST}`),
        ]);
        const list = await listRes.json();
        const detailRaw = await detailRes.json();

        // 수수료 표 (CSV → JSON): 모델명 → {년수: 금액}
        let feeRaw = {};
        try {
          const feeRes = await fetch(`/fee_table.json?v=${CACHE_BUST}`);
          if (feeRes.ok) feeRaw = await feeRes.json();
        } catch (e) { console.warn('수수료 표 로드 실패', e); }
        setFeeTable(feeRaw || {});

        // 상세 데이터: merged_products.json 은 {url: detail} flat 구조 (URL 정규화 키맵)
        const detailMap = {};
        for (const url of Object.keys(detailRaw)) {
          detailMap[normalizeUrl(url)] = detailRaw[url];
        }

        const merged = list.map((item) => ({
          ...item,
          detail: detailMap[normalizeUrl(item.url)] || null,
        }));
        setProducts(merged);
      } catch (e) {
        console.error('데이터 로드 실패:', e);
      } finally {
        // 최소 3초 로딩 애니메이션 보장 (데이터 빨리 와도 3초는 노출)
        const MIN = 3000;
        const elapsed = Date.now() - loadStartRef.current;
        setTimeout(() => setLoading(false), Math.max(0, MIN - elapsed));
      }
    };
    loadAll();
  }, []);

  // 현재 카테고리 상품 (이름/금액 데이터가 비어있는 상품은 카드에 빈 칸으로 나오므로 제외)
  const categoryProducts = useMemo(
    () => products.filter(
      (p) => p.category === activeCategory &&
        (p.desc && p.desc.trim() !== '') &&
        (p.price !== '' && p.price !== null && p.price !== undefined)
    ),
    [products, activeCategory]
  );

  // 브랜드 목록 (지정 순서 고정, 실제 데이터에 있는 것만)
  const BRAND_ORDER = ['코웨이','청호나이스','쿠쿠','SK매직','현대큐밍','LG','웰스','세스코'];
  const brands = useMemo(() => {
    const set = new Set(categoryProducts.map((p) => extractBrand(p.desc)));
    set.delete('기타');
    return BRAND_ORDER.filter((b) => set.has(b));
  }, [categoryProducts]);

  // 검색 + 브랜드 + 정렬 적용
  const filtered = useMemo(() => {
    let arr = categoryProducts;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.desc.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          (p.detail?.title || '').toLowerCase().includes(q)
      );
    }

    if (brandFilter !== 'all') {
      arr = arr.filter((p) => extractBrand(p.desc) === brandFilter);
    }

    if (activeCategory === 'water') {
      if (funcFilter !== 'all') {
        arr = arr.filter((p) => classifyFunc(p) === funcFilter);
      }
      if (typeFilter !== 'all') {
        arr = arr.filter((p) => classifyType(p.desc) === typeFilter);
      }
      if (methodFilter !== 'all') {
        arr = arr.filter((p) => classifyMethod(p.desc) === methodFilter);
      }
      if (priceFilter !== 'all') {
        arr = arr.filter((p) => classifyPriceRange(p.price) === priceFilter);
      }
    }

    if (activeCategory === 'air') {
      if (areaFilter !== 'all') {
        arr = arr.filter((p) => classifyArea(p.desc) === areaFilter);
      }
      if (airFuncFilter !== 'all') {
        arr = arr.filter((p) => classifyAirFunc(p.desc) === airFuncFilter);
      }
      if (priceFilter !== 'all') {
        arr = arr.filter((p) => classifyPriceRange(p.price) === priceFilter);
      }
    }

    if (activeCategory === 'mattress') {
      if (mattressTypeFilter !== 'all') {
        arr = arr.filter((p) => classifyMattressType(p.desc) === mattressTypeFilter);
      }
      if (priceFilter !== 'all') {
        arr = arr.filter((p) => classifyPriceRange(p.price) === priceFilter);
      }
    }

    // 비데(bidet): 렌탈료(priceFilter)만 사용
    if (activeCategory === 'bidet') {
      if (priceFilter !== 'all') {
        arr = arr.filter((p) => classifyPriceRange(p.price) === priceFilter);
      }
    }

    const sorted = [...arr];
    // 수수료 추정액 = 월료 × 약정개월(렌탈기간 최대값) — 판매량많은순(수수료많은순) 정렬용
    const feeScore = (p) => {
      const price = parsePrice(p.price) || 0;
      const periods = (p.rentalPeriods || []).map((s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0);
      const months = periods.length ? Math.max(...periods) : 0;
      return price * months;
    };
    if (sort === 'price_asc') sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    else if (sort === 'price_desc') sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    else if (sort === 'sales_desc') sorted.sort((a, b) => feeScore(b) - feeScore(a));
    return sorted;
  }, [categoryProducts, search, brandFilter, sort, funcFilter, typeFilter, methodFilter, priceFilter, areaFilter, airFuncFilter, mattressTypeFilter, activeCategory]);

  const currentName = SITE_CONFIG.categories.find((c) => c.key === activeCategory)?.name || '';

  // 카테고리별 대표 이미지 (렌탈세계 서브카테고리 이미지 탭용)
  const categoryImages = useMemo(() => {
    const map = {};
    for (const c of SITE_CONFIG.categories) {
      const p = products.find((x) => x.category === c.key);
      map[c.key] = p ? (p.image || p.logo || '') : '';
    }
    return map;
  }, [products]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden relative">
        {/* 배경 플로팅 원 */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-blue-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="text-center relative z-10 px-6">
          {/* 워드마크 펄스 */}
          <div className="mb-8 animate-[pulse_1s_ease-in-out_infinite]">
            <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
              ALL<span className="text-blue-200">렌탈</span>
            </h1>
            <p className="text-blue-100/80 text-xs mt-1 tracking-[0.3em]">PREMIUM RENTAL</p>
          </div>

          {/* 다이나믹 스피너: 3중 링 회전 + 중심 점 */}
          <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" style={{ animationDuration: '0.8s' }}></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-200 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>

          {/* 점 3개 바운스 */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2.5 h-2.5 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>

          <p className="text-white/90 font-medium text-sm mb-4">상품 데이터를 불러오는 중...</p>

          {/* 3초 진행바 */}
          <div className="w-56 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-white rounded-full animate-[loadingBar_3s_ease-out_forwards]"></div>
          </div>
        </div>

        <style>{`
          @keyframes loadingBar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  // 로그인 게이트: 미로그인 시 풀스크린 로그인 화면만 표시
  if (!sessionUser) {
    return <LoginGate onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">ALL<span className="text-blue-200">렌탈</span></h1>
              <p className="text-[11px] text-blue-100 mt-0">프리미엄 렌탈 서비스</p>
            </div>
            <div className="flex items-center gap-2">
              {sessionUser ? (
                <>
                  <div className="text-right leading-tight">
                    <div className="text-[10px] text-blue-100">로그인됨</div>
                    <div className="text-xs font-bold text-white">{sessionUser.name}</div>
                  </div>
                  <button onClick={logout}
                    className="text-[11px] bg-white/15 text-white px-2.5 py-1.5 rounded-full hover:bg-white/25 transition-all font-medium flex-shrink-0">
                    로그아웃
                  </button>
                </>
              ) : null}
              {SITE_CONFIG.kakaoUrl && (
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-9 h-9 rounded-full bg-white/15 text-white shadow-lg hover:bg-white/25 transition-all flex items-center justify-center flex-shrink-0"
                title="위로 올라가기">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
            )}
            </div>
          </div>
        </div>
        <div className="bg-blue-900/40 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-1.5 py-1.5">
              {SITE_CONFIG.categories.map((c) => (
                <button key={c.key} onClick={() => { setActiveCategory(c.key); setBrandFilter('all'); setSearch(''); setFuncFilter('all'); setTypeFilter('all'); setMethodFilter('all'); setPriceFilter('all'); setAreaFilter('all'); setAirFuncFilter('all'); setMattressTypeFilter('all'); }}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all flex-shrink-0 w-20 ${activeCategory === c.key ? 'bg-white text-blue-700 shadow-md font-black' : 'bg-white/15 text-white hover:bg-white/30 font-semibold'}`}>
                  <div className={`w-9 h-9 rounded-md overflow-hidden border-2 flex items-center justify-center ${activeCategory === c.key ? 'bg-white border-white' : 'bg-white/90 border-transparent'}`}>
                    {categoryImages[c.key] ? (
                      <img src={categoryImages[c.key]} alt={c.name} className="max-w-full max-h-full object-contain" onError={(e) => (e.target.style.display = 'none')} />
                    ) : (
                      <span className="text-sm">📦</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold whitespace-nowrap ${activeCategory === c.key ? 'text-blue-700' : 'text-blue-100'}`}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* 검색/정렬 바 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-3 flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${currentName} 모델명·상품명 검색`}
            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white md:w-40">
            <option value="sales_desc">판매량 많은순</option>
            <option value="price_desc">렌탈료 높은순</option>
            <option value="price_asc">렌탈료 낮은순</option>
          </select>
        </div>

        {/* 스마트 필터 (클릭 칩) */}
        <div className="bg-blue-50/60 rounded-xl shadow-md border-2 border-blue-200 p-3 mb-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-blue-700">🔍 스마트 필터</span>
            <span className="text-xs text-blue-400">렌탈사 · 기능 · 타입 · 렌탈료</span>
          </div>
          {/* 렌탈사 = 브랜드 */}
          <FilterChips label="렌탈사" options={brands} value={brandFilter} onChange={setBrandFilter} />
          {activeCategory === 'water' && (
            <>
              <FilterChips label="기능" options={['냉수전용','냉온전용','얼음냉온','정수전용']} value={funcFilter} onChange={setFuncFilter} />
              <FilterChips label="타입" options={['빌트인','스탠드형','하프형']} value={typeFilter} onChange={setTypeFilter} />
              <FilterChips label="렌탈료" options={['1만원이하','1만원대','2만원대','3만원대','4~10만원']} value={priceFilter} onChange={setPriceFilter} />
            </>
          )}
          {activeCategory === 'air' && (
            <>
              <FilterChips label="평형" options={['10평이하','11~20평','21~30평','31~50평']} value={areaFilter} onChange={setAreaFilter} />
              <FilterChips label="기능" options={['가습기능','온풍기능','제습기능','펫기능','환기청정기']} value={airFuncFilter} onChange={setAirFuncFilter} />
            </>
          )}
          {activeCategory === 'bidet' && (
            <FilterChips label="렌탈료" options={['1만원이하','1만원대','2만원대']} value={priceFilter} onChange={setPriceFilter} />
          )}
          {activeCategory === 'mattress' && (
            <>
              <FilterChips label="타입" options={['탑퍼교체','메모리폼','커버교체','온열','말총','하이브리드','유로탑','포켓스프링','폼','스프링매트리스']} value={mattressTypeFilter} onChange={setMattressTypeFilter} />
              <FilterChips label="렌탈료" options={['1만원대','2만원대','3만원대','4~10만원','10만원이상']} value={priceFilter} onChange={setPriceFilter} />
            </>
          )}
        </div>

        <div className="text-sm text-gray-500 mb-3">{filtered.length}개 상품</div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {filtered.map((p, idx) => {
            const isDiscounted = p.discount && p.discount !== '0' && p.discount !== '';
            const promos = (p.promotion && Array.isArray(p.promotion)) ? p.promotion : [];
            const promoStyle = (t) => t === '반값할인' ? 'bg-red-500' : t === '타사보상' ? 'bg-gray-500' : t === 'BEST' ? 'bg-yellow-500' : 'bg-emerald-500';
            const brand = extractBrand(p.desc);
            return (
              <div key={idx} onClick={() => setSelectedProduct(p)}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all" data-testid="card">
                {/* 사진 위 작은 브랜드 로고 (렌탈세계 동일) */}
                <div className="h-9 px-3 flex justify-center items-center bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                  {p.logo ? (
                    <img src={p.logo.startsWith('//') ? 'https:' + p.logo : p.logo} alt="" className="max-h-5 max-w-[70px] object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-500">{brand}</span>
                  )}
                </div>
                <div className="relative h-36 bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-3">
                  {promos[0] && <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded text-white ${promoStyle(promos[0])}`}>{promos[0]}</span>}
                  <SmartImage src={(p.image || (p.detail_images && p.detail_images[0]) || '')} alt={p.desc} brand={brand} className="" />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  {/* 라벨 (반값할인/타사보상 등 한 줄) */}
                  {promos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {promos.map((t, i) => (
                        <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${promoStyle(t)}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  {/* 모델명 (렌탈세계: WPU-IAC414) */}
                  <div className="text-[9px] text-gray-400 mb-0.5 truncate font-mono">{p.model}</div>
                  {/* 상품명 (렌탈세계: [SK매직] 원코크 얼음물 직수얼음 정수기) */}
                  <div className="text-[11px] font-bold text-gray-800 mb-2 line-clamp-2 leading-snug min-h-[2.2rem]">{p.desc}</div>
                  <div className="mt-auto space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-500">월 렌탈료</span>
                      <span className="text-sm font-bold text-gray-900">{Number(p.price || 0).toLocaleString()}원</span>
                    </div>
                    {sessionUser && showFee && feeTable[p.model] && (() => {
                      const modelFee = feeTable[p.model];
                      const order = {'3년':0,'4년':1,'5년':2,'6년':3,'7년':4,'8년':5,'9년':6};
                      const periods = Object.keys(modelFee).filter(k => modelFee[k] && typeof modelFee[k] === 'object').sort((a,b)=>(order[a]??99)-(order[b]??99));
                      if (!periods.length) return null;
                      // 카드엔 대표 조합(첫 기간·첫 관리주기) 수수료 한 줄 표시
                      const per = periods[0];
                      const cycleKeys = Object.keys(modelFee[per]);
                      const cyc = cycleKeys[0] || '';
                      if (cyc === '' || modelFee[per][cyc] == null) return null;
                      return (
                        <div className="bg-emerald-50 px-1.5 py-0.5 rounded">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-emerald-700 font-semibold">내 수수료 {per} · {cyc}</span>
                            <span className="text-xs font-bold text-emerald-700">{calcFee(modelFee[per][cyc], sessionUser).toLocaleString()}원</span>
                          </div>
                        </div>
                      );
                    })()}
                    {isDiscounted && (
                      <div className="flex justify-between items-center bg-red-50 px-1.5 py-1 rounded">
                        <span className="text-[9px] text-red-600 font-semibold">할인적용</span>
                        <span className="text-xs font-bold text-red-600">{Number(p.discount || 0).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }} className="mt-2.5 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] font-bold py-2 rounded-lg">상세보기</button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">조건에 맞는 상품이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 하단 플로팅 상담 버튼 제거됨 (사용자 요청) */}

      {/* 우측 상단 카톡 상담 아이콘은 헤더 내부로 이동됨 */}

      {/* 우측 하단 플로팅: 수수료 ON/OFF + 카톡 상담 + 맨위로가기 */}
      <div className="fixed bottom-28 right-3 z-40 flex flex-col gap-2 items-end">
        <button
          onClick={() => setShowFee((v) => !v)}
          className={`w-12 h-12 rounded-full shadow-lg transition-all flex items-center justify-center text-white font-bold text-[10px] ${showFee ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 hover:bg-gray-400'}`}
          title={showFee ? '수수료 표시 중 (클릭해 끄기)' : '수수료 숨김 (클릭해 켜기)'}
        >
          {showFee ? 'ON' : 'OFF'}
        </button>
        {SITE_CONFIG.kakaoUrl && (
          <a href={SITE_CONFIG.kakaoUrl} target="_blank" rel="noreferrer"
            className="w-12 h-12 rounded-full bg-yellow-400 text-gray-900 shadow-lg hover:bg-yellow-300 transition-all flex items-center justify-center"
            title="카톡 상담">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c5.5 0 10 3.6 10 8s-4.5 8-10 8c-1.1 0-2.2-.1-3.2-.4L4 20l.9-3.3C3.3 15.5 2 13.3 2 11c0-4.4 4.5-8 10-8z"/></svg>
          </a>
        )}
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center"
          title="위로 올라가기">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      </div>

      {selectedProduct && (
        <ErrorBoundary>
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            allProducts={products}
            sessionUser={sessionUser}
            feeTable={feeTable}
            showFee={showFee}
            onSelectRecommend={(rec) => {
              const recNo = getNo(rec.url);
              const target = products.find((p) => getNo(p.url) === recNo);
              if (target) {
                setSelectedProduct(target);
                window.scrollTo(0, 0);
              }
              // 우리 사이트에 없는 상품은 렌탈세계로 리다이렉트하지 않고 무시
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
