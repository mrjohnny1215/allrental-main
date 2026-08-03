import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SITE_CONFIG } from './config';

// ==========================================
// 에러 경계 (상세 페이지 크래시 시 빈 화면 방지)
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('상세페이지 에러:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-700 font-medium mb-1">페이지를 불러오지 못했습니다</p>
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
                      <img src={it.image.startsWith('//') ? 'https:' + it.image : it.image} alt={it.name}
                        className="max-h-full max-w-full object-contain" onError={(e) => (e.target.style.display = 'none')} />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight mb-1 h-7 overflow-hidden">{it.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-500">월료</span>
                      <span className="text-xs font-bold text-gray-900">{Number(it.price || 0).toLocaleString()}원</span>
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

const parsePrice = (s) => parseInt(String(s || '0').replace(/[^0-9]/g, ''), 10) || 0;

// ==========================================
// 상품 상세 모달
// ==========================================
function ProductDetailModal({ product, onClose, onSelectRecommend, allProducts }) {
  const catKey = product.category;
  const detail = product.detail || product || {};
  const isMattress = catKey === 'mattress';

  // 오버레이 스크롤 컨테이너 ref
  const scrollRef = useRef(null);

  // 상세 페이지 진입 / 추천상품 전환 시 스크롤 맨 위로
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [product]);

  // 렌탈 불가 상품 (렌탈세계에서 판매/렌탈 중단된 상품)
  const notAvailable = detail.not_available;

  // 실제 렌탈세계 데이터만 사용 (하드코딩 폴백 제거)
  const periods = detail.rental_periods && detail.rental_periods.length
    ? detail.rental_periods
    : [];
  const cycles = detail.maintenance_cycles && detail.maintenance_cycles.length
    ? detail.maintenance_cycles
    : [];
  const colors = detail.colors && detail.colors.length
    ? detail.colors
    : [];
  const sizes = detail.sizes && detail.sizes.length
    ? detail.sizes
    : [];
  const careTypes = detail.care_types && detail.care_types.length
    ? detail.care_types
    : [];
  const detailImages = detail.detail_images && detail.detail_images.length
    ? detail.detail_images
    : [];
  const cards = detail.partner_cards && detail.partner_cards.length
    ? detail.partner_cards
    : [];
  const promotion = detail.promotion && detail.promotion.length ? detail.promotion : '';
  const recommendations = detail.recommendations && detail.recommendations.length
    ? detail.recommendations
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
  const brand = detail.brand || '';
  const productType = detail.product_type || '';
  const asPeriod = detail.as_period || '';

  const [selectedPeriod, setSelectedPeriod] = useState(periods[0] || '');
  const [selectedCycle, setSelectedCycle] = useState(
    (periodPrices[periods[0]] ? Object.keys(periodPrices[periods[0]])[0] : '') || cycles[0] || ''
  );
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [showCardModal, setShowCardModal] = useState(false);

  // 렌탈세계 동일 실시간 가격 계산: 최종월료 = it_price + 관리주기추가금(기간별 상이)
  const itPrice = parsePrice(detail.it_price) || parsePrice(product.price);
  const periodPrices = detail.period_prices || {};
  const addForPeriod = periodPrices[selectedPeriod] || {};
  const cycleAdd = addForPeriod[selectedCycle] || 0;
  const basePrice = itPrice + cycleAdd;
  const calculatedPrice = basePrice.toLocaleString();

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
    const subject = encodeURIComponent(`${brand} 렌탈 상담 신청`);
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
            {product.logo && <img src={product.logo} alt="logo" className="h-7 w-auto object-contain mb-2" onError={(e) => (e.target.style.display = 'none')} />}
            <div className="w-full h-64 flex items-center justify-center overflow-hidden">
              <img src={product.image} alt={product.desc} className="h-full w-full object-contain" onError={(e) => (e.target.src = 'https://via.placeholder.com/300x300?text=ALL렌탈')} />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">브랜드</div>
            <div className="text-lg font-bold text-blue-700 mb-3">{brand || extractBrand(product.desc)}</div>
            <div className="text-xs text-gray-500 mb-1">모델명</div>
            <div className="text-sm font-mono text-gray-800 mb-3">{product.model}</div>
            <div className="text-xs text-gray-500 mb-1">제품종류</div>
            <div className="text-sm font-semibold text-gray-800 mb-3">{productType || '-'}</div>
            <div className="text-xs text-gray-500 mb-1">AS기간</div>
            <div className="text-sm font-semibold text-gray-800 mb-3">{asPeriod || '-'}</div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">월 렌탈료</span>
                <span className="text-xl font-bold text-gray-900">{calculatedPrice}원</span>
              </div>
              {product.discount && product.discount !== '0' && (
                <div className="flex justify-between items-center pt-1 border-t border-blue-200">
                  <span className="text-sm text-red-600">할인적용</span>
                  <span className="text-lg font-bold text-red-600">{product.discount}원</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 mb-6">
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

          {periodPrices[selectedPeriod] && Object.keys(periodPrices[selectedPeriod]).length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">관리 주기</label>
              <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                {Object.keys(periodPrices[selectedPeriod]).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

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
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98] mb-8">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          이메일 상담신청
        </button>

        {allRecommendations.length > 0 && (
          <RecommendCarousel items={allRecommendations} onSelect={onSelectRecommend} />
        )}
      </div>

      {/* footer (빈 영역 - 추후 정보 입력 예정) */}
      <footer className="bg-gray-900 text-white mt-8">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
          ALL렌탈
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
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(SITE_CONFIG.categories[0].key);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [listRes, detailRes] = await Promise.all([
          fetch('/products_data.json?v=20250101'),
          fetch('/merged_products.json?v=20250101'),
        ]);
        const list = await listRes.json();
        const detailRaw = await detailRes.json();

        // 상세 데이터: merged_products.json 은 {url: detail} flat 구조
        // 매칭 키를 URL 전체가 아닌 'no' 파라미터로 (cid/gid 차이와 무관하게 정확 매칭)
        const detailMap = {};
        const noOf = (u) => { const m = /no=(\d+)/.exec(u); return m ? m[1] : u; };
        for (const url of Object.keys(detailRaw)) {
          detailMap[noOf(url)] = detailRaw[url];
        }

        const merged = list.map((item) => ({
          ...item,
          detail: detailMap[noOf(item.url)] || null,
        }));
        setProducts(merged);
      } catch (e) {
        console.error('데이터 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // 현재 카테고리 상품
  const categoryProducts = useMemo(
    () => products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  );

  // 브랜드 목록 (현재 카테고리 기준)
  const brands = useMemo(() => {
    const set = new Set(categoryProducts.map((p) => extractBrand(p.desc)));
    return Array.from(set);
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

    const sorted = [...arr];
    if (sort === 'price_asc') sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    else if (sort === 'price_desc') sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    else if (sort === 'brand') {
      const pri = SITE_CONFIG.brandPriority;
      sorted.sort((a, b) => {
        const ia = pri.indexOf(extractBrand(a.desc));
        const ib = pri.indexOf(extractBrand(b.desc));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
    return sorted;
  }, [categoryProducts, search, brandFilter, sort]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">상품 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">ALL<span className="text-blue-200">렌탈</span></h1>
              <p className="text-xs text-blue-100 mt-0.5">프리미엄 렌탈 서비스</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-2 py-2">
              {SITE_CONFIG.categories.map((c) => (
                <button key={c.key} onClick={() => { setActiveCategory(c.key); setBrandFilter('all'); setSearch(''); }}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 w-20 ${activeCategory === c.key ? 'bg-white text-blue-700 shadow-lg' : 'text-white hover:bg-white/20'}`}>
                  <div className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-white/90 ${activeCategory === c.key ? 'border-blue-600' : 'border-transparent'}`}>
                    {categoryImages[c.key] ? (
                      <img src={categoryImages[c.key]} alt={c.name} className="max-w-full max-h-full object-contain" onError={(e) => (e.target.style.display = 'none')} />
                    ) : (
                      <span className="text-lg">📦</span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* 검색/필터 바 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4 flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${currentName} 모델명·상품명 검색`}
            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white md:w-40">
            <option value="all">전체 브랜드</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white md:w-40">
            <option value="default">기본 정렬</option>
            <option value="price_asc">월료 낮은순</option>
            <option value="price_desc">월료 높은순</option>
            <option value="brand">브랜드순</option>
          </select>
        </div>

        <div className="text-sm text-gray-500 mb-3">{filtered.length}개 상품</div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p, idx) => {
            const isDiscounted = p.discount && p.discount !== '0' && p.discount !== '';
            const labelStyle = p.label === '반값할인' ? 'bg-red-500' : p.label === 'BEST' ? 'bg-yellow-500' : p.label === '타사보상' ? 'bg-gray-500' : p.label2 ? 'bg-emerald-500' : 'bg-blue-500';
            const brand = extractBrand(p.desc);
            return (
              <div key={idx} onClick={() => setSelectedProduct(p)}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="h-10 px-3 flex justify-center items-center bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                  {p.logo && <img src={p.logo} alt="" className="max-h-6 max-w-[80px] object-contain" onError={(e) => (e.target.style.display = 'none')} />}
                </div>
                <div className="relative h-36 bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-3">
                  {p.label && <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded text-white ${labelStyle}`}>{p.label}</span>}
                  {p.label2 && <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded text-white bg-emerald-500">{p.label2}</span>}
                  <img src={p.image} alt={p.desc} className="max-h-full max-w-full object-contain" onError={(e) => (e.target.src = 'https://via.placeholder.com/150x150?text=ALL렌탈')} />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <div className="text-[11px] font-bold text-gray-800 mb-1 line-clamp-2 leading-snug min-h-[2.2rem]">{p.desc}</div>
                  <div className="text-[9px] text-gray-400 mb-1 truncate font-mono bg-gray-50 px-1.5 py-0.5 rounded">{brand} · {p.model}</div>
                  <div className="mt-auto space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-gray-500">월 렌탈료</span>
                      <span className="text-sm font-bold text-gray-900">{p.price}원</span>
                    </div>
                    {isDiscounted && (
                      <div className="flex justify-between items-center bg-red-50 px-1.5 py-1 rounded">
                        <span className="text-[9px] text-red-600 font-semibold">할인적용</span>
                        <span className="text-xs font-bold text-red-600">{p.discount}원</span>
                      </div>
                    )}
                  </div>
                  <button className="mt-2.5 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] font-bold py-2 rounded-lg">상세보기</button>
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

      {/* 하단 플로팅 상담 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2">
          {SITE_CONFIG.kakaoUrl && (
            <a href={SITE_CONFIG.kakaoUrl} target="_blank" rel="noreferrer"
              className="flex-1 bg-yellow-400 text-gray-900 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-yellow-300 transition-all flex items-center justify-center gap-2">
              카톡 상담
            </a>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ErrorBoundary>
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            allProducts={products}
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
