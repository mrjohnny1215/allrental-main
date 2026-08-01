import { useState, useEffect } from 'react';

// ==========================================
// 1. 카테고리별 기본 옵션 데이터 (현실적인 렌탈 세계 기준)
// ==========================================
const CATEGORY_DEFAULTS = {
  bidet: {
    name: '비데',
    cycles: ['자가관리', '방문관리/2개월', '방문관리/4개월', '방문관리/6개월'],
    colors: ['화이트', '블랙', '베이지'],
    promotion: '신규 가입 시 첫달 렌탈료 50% 할인',
    cards: [
      { name: '삼성카드', benefit: '무이자 6개월' },
      { name: '신한카드', benefit: '5% 할인' },
      { name: '현대카드', benefit: 'M포인트 2배' },
      { name: 'KB국민카드', benefit: '렌탈 전용 할인' }
    ]
  },
  water: {
    name: '정수기',
    cycles: ['자가관리', '방문관리/2개월', '방문관리/4개월'],
    colors: ['화이트', '블랙', '실버', '핑크', '골드'],
    promotion: '타사 제품 보유 시 추가 5% 할인',
    cards: [
      { name: '삼성카드', benefit: '무이자 12개월' },
      { name: '신한카드', benefit: 'Deep Dream 10% 할인' },
      { name: '현대카드', benefit: 'The Blue 15% 캐시백' },
      { name: 'KB국민카드', benefit: '리브 5% 적립' },
      { name: '롯데카드', benefit: 'L포인트 3배' }
    ]
  },
  air: {
    name: '공기청정기',
    cycles: ['자가관리', '방문관리/3개월', '방문관리/6개월', '방문관리/12개월'],
    colors: ['화이트', '블랙', '실버', '네이처베이지', '크리미스노우'],
    promotion: '봄맞이 공기청정기 필터 무료 증정',
    cards: [
      { name: '삼성카드', benefit: '무이자 6개월' },
      { name: '신한카드', benefit: 'Savings 7% 할인' },
      { name: '현대카드', benefit: '클럽M 포인트 3배' },
      { name: '하나카드', benefit: '1% 청구할인' }
    ]
  },
  mattress: {
    name: '매트리스',
    cycles: ['자가관리', '방문관리/6개월', '방문관리/12개월'],
    colors: ['싱글', '슈퍼싱글', '퀸', '킹', '라지킹', '그레이트킹'], // 매트리스는 색상 대신 사이즈
    promotion: '침대 프레임 동시 렌탈 시 10% 추가 할인',
    cards: [
      { name: '삼성카드', benefit: '무이자 24개월' },
      { name: '신한카드', benefit: '무이자 24개월' },
      { name: '현대카드', benefit: 'The Red 10% 할인' },
      { name: 'KB국민카드', benefit: '청약저축 2% 우대' },
      { name: 'BC카드', benefit: '가구전문 5% 할인' }
    ]
  }
};

// ==========================================
// 2. CSV 파싱 함수
// ==========================================
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = [];
    let current = '', inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQuotes && line[j+1] === '"') { current += '"'; j++; }
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        values.push(current); current = '';
      } else { current += c; }
    }
    values.push(current);
    if (values.length >= 7) {
      products.push({
        url: values[0],
        logo: values[1],
        image: values[2],
        model: values[3],
        description: values[4],
        price: values[5],
        discount: values[6],
        label: values[7] || '',
        label2: values[8] || ''
      });
    }
  }
  return products;
}

// ==========================================
// 3. 카테고리 판별 함수
// ==========================================
function getCategoryFromDesc(desc) {
  if (desc.includes('비데')) return 'bidet';
  if (desc.includes('정수기')) return 'water';
  if (desc.includes('공기청정기') || desc.includes('청정기')) return 'air';
  if (desc.includes('매트리스') || desc.includes('프레임') || desc.includes('파운데이션')) return 'mattress';
  return 'bidet';
}

// ==========================================
// 4. 상품 상세 모달 컴포넌트
// ==========================================
function ProductDetailModal({ product, onClose }) {
  const catKey = getCategoryFromDesc(product.description);
  const defaults = CATEGORY_DEFAULTS[catKey];
  
  const [selectedPeriod, setSelectedPeriod] = useState('6년');
  const [selectedCycle, setSelectedCycle] = useState(defaults.cycles[0]);
  const [selectedColor, setSelectedColor] = useState(defaults.colors[0]);
  const [showCardModal, setShowCardModal] = useState(false);

  // 약정별 가격 계산
  const calculatePrice = () => {
    const basePrice = parseInt(product.price.replace(/[^0-9]/g, ''));
    const rates = { '3년': 1.0, '5년': 0.92, '6년': 0.88, '7년': 0.85 };
    const rate = rates[selectedPeriod] || 1.0;
    return Math.floor(basePrice * rate).toLocaleString();
  };

  const handleConsult = () => {
    const finalPrice = calculatePrice();
    const msg = encodeURIComponent(
      `[ALL렌탈 상담 신청]\n\n` +
      `📦 상품명: ${product.description}\n` +
      `🔢 모델명: ${product.model}\n` +
      `🏷️ 카테고리: ${defaults.name}\n` +
      `⏳ 약정 기간: ${selectedPeriod}\n` +
      `🔧 관리 주기: ${selectedCycle}\n` +
      `🎨 ${catKey === 'mattress' ? '사이즈' : '색상'}: ${selectedColor}\n` +
      `💰 예상 월 렌탈료: ${finalPrice}원\n` +
      (product.discount && product.discount !== '0' ? `🎉 할인적용가: ${product.discount}원\n` : '') +
      `\n상세 견적 및 설치 가능 여부 부탁드립니다.`
    );
    window.location.href = `mailto:your-email@example.com?subject=${defaults.name} 렌탈 상담 신청&body=${msg}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{product.description}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
        </div>

        <div className="p-6">
          {/* 이미지 + 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
              {product.logo && <img src={product.logo} alt="logo" className="h-8 mb-4 object-contain mx-auto" onError={(e) => e.target.style.display = 'none'} />}
              <img src={product.image} alt={product.description} className="max-h-64 object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/300x300?text=ALL렌탈'} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">모델명</div>
              <div className="text-sm font-mono text-gray-800 mb-3">{product.model}</div>
              <div className="text-xs text-gray-500 mb-1">렌탈사</div>
              <div className="text-lg font-bold text-blue-700 mb-4">{product.description.match(/\[(.*?)\]/)?.[1] || '기타'}</div>
              
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">월 렌탈료</span>
                  <span className="text-xl font-bold text-gray-900">{product.price}원</span>
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

          {/* 옵션 선택 영역 */}
          <div className="space-y-5 mb-6">
            {/* 1. 렌탈 기간 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">렌탈 기간</label>
              <div className="grid grid-cols-4 gap-2">
                {['3년', '5년', '6년', '7년'].map((period) => (
                  <button key={period} onClick={() => setSelectedPeriod(period)}
                    className={`py-2.5 px-2 rounded-lg border-2 text-sm font-semibold transition-all ${selectedPeriod === period ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <div>{period}</div>
                    <div className="text-[10px] font-normal mt-0.5 text-gray-500">
                      {period === '3년' ? '기본가' : period === '5년' ? '8% 할인' : period === '6년' ? '12% 할인' : '15% 할인'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 관리 주기 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">관리 주기</label>
              <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                {defaults.cycles.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 3. 색상 / 사이즈 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{catKey === 'mattress' ? '매트리스 사이즈' : '제품 색상'}</label>
              <div className="flex flex-wrap gap-2">
                {defaults.colors.map((item) => (
                  <button key={item} onClick={() => setSelectedColor(item)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedColor === item ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. 프로모션 */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
              <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center">
                <span className="mr-2">🎉</span> 진행 중인 프로모션
              </h4>
              <div className="text-sm text-red-700 font-medium">• {defaults.promotion}</div>
            </div>

            {/* 5. 제휴카드 안내 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-purple-900 flex items-center">
                  <span className="mr-2">💳</span> 제휴카드 안내 ({defaults.name} 전용)
                </h4>
                <button onClick={() => setShowCardModal(true)} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700">자세히 보기</button>
              </div>
              <div className="space-y-2">
                {defaults.cards.slice(0, 2).map((card) => (
                  <div key={card.name} className="bg-white rounded-lg p-3 flex justify-between items-center border border-purple-100">
                    <span className="font-bold text-sm text-gray-800">{card.name}</span>
                    <span className="text-xs text-purple-600 font-medium">{card.benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 상담신청 버튼 */}
          <button onClick={handleConsult}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-lg flex items-center justify-center gap-2 active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            이메일 상담신청
          </button>
        </div>
      </div>

      {/* 제휴카드 상세 모달 */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowCardModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">제휴카드 상세 안내</h3>
              <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {defaults.cards.map((card, idx) => (
                <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-100 flex justify-between items-center">
                  <span className="font-bold text-gray-800">{card.name}</span>
                  <span className="text-sm text-purple-700 font-medium">{card.benefit}</span>
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
// 5. 메인 App 컴포넌트
// ==========================================
export default function App() {
  const [activeCategory, setActiveCategory] = useState('bidet');
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      const data = {};
      const files = {
        bidet: '/비데.csv',
        water: '/정수기.csv',
        air: '/공기청정기.csv',
        mattress: '/매트리스.csv'
      };
      for (const [key, file] of Object.entries(files)) {
        try {
          const res = await fetch(file);
          const text = await res.text();
          data[key] = parseCSV(text);
        } catch (e) {
          console.error(`${key} 로드 실패:`, e);
          data[key] = [];
        }
      }
      setProducts(data);
      setLoading(false);
    };
    loadAll();
  }, []);

  const currentProducts = products[activeCategory] || [];

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
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">ALL<span className="text-blue-200">렌탈</span></h1>
              <p className="text-xs text-blue-100 mt-0.5">프리미엄 렌탈 서비스</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">모바일 카탈로그</p>
              <p className="text-xs font-semibold">{currentProducts.length}개 상품</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border-t border-white/20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-1 py-2">
              {Object.entries(CATEGORY_DEFAULTS).map(([key, cat]) => (
                <button key={key} onClick={() => setActiveCategory(key)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === key ? 'bg-white text-blue-700 shadow-lg' : 'text-white hover:bg-white/20'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 상품 그리드 */}
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentProducts.map((p, idx) => {
            const isDiscounted = p.discount && p.discount !== '0' && p.discount !== '';
            const labelStyle = p.label === '반값할인' ? 'bg-red-500' : p.label === 'BEST' ? 'bg-yellow-500' : p.label === '타사보상' ? 'bg-gray-500' : 'bg-blue-500';

            return (
              <div key={idx} onClick={() => setSelectedProduct(p)}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="h-10 px-3 flex justify-center items-center bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                  {p.logo && <img src={p.logo} alt="" className="max-h-6 max-w-[80px] object-contain" onError={e => e.target.style.display='none'} />}
                </div>
                <div className="relative h-36 bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-3">
                  {p.label && <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded text-white ${labelStyle}`}>{p.label}</span>}
                  <img src={p.image} alt={p.description} className="max-h-full max-w-full object-contain" onError={e => e.target.src='https://via.placeholder.com/150x150?text=ALL렌탈'} />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <div className="text-[11px] font-bold text-gray-800 mb-1 line-clamp-2 leading-snug min-h-[2.2rem]">{p.description}</div>
                  <div className="text-[9px] text-gray-400 mb-2 truncate font-mono bg-gray-50 px-1.5 py-0.5 rounded">{p.model}</div>
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

        {currentProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 font-medium">상품이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 하단 플로팅 상담 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button onClick={() => {
            const cat = CATEGORY_DEFAULTS[activeCategory];
            const msg = encodeURIComponent(`[ALL렌탈] ${cat.name} 카테고리 상담 요청드립니다.\n\n관심 있는 상품을 선택하여 상담을 신청해주세요.`);
            window.location.href = `mailto:your-email@example.com?subject=${cat.name} 렌탈 상담 신청&body=${msg}`;
          }} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            이메일 상담신청
          </button>
        </div>
      </div>

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}