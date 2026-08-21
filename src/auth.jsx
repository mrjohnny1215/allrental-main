import React, { useState, useEffect } from 'react';
import { findUser, registerUser } from './users';

const SESSION_KEY = 'allrental_session_v1';

// localStorage에서 세션 복원 (새로고침해도 로그인 유지)
export function useSession() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = (id, pw) => {
    const found = findUser(id, pw);
    if (found) {
      const { pw: _omit, ...safe } = found; // 비번은 메모리에 안 남김
      setUser(safe);
      return { ok: true };
    }
    return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  };

  const logout = () => setUser(null);

  return { user, login, logout };
}

// 공통 입력 스타일
const inputCls =
  'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm';

// 로그인 모달
export function LoginModal({ onLogin, onClose, onGoSignup }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = onLogin(id.trim(), pw);
    if (!res.ok) setErr(res.error);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black text-gray-900 mb-1">직원 로그인</h2>
        <p className="text-xs text-gray-400 mb-5">로그인하면 본인 수수료가 상품에 표시됩니다.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={id}
            onChange={(e) => { setId(e.target.value); setErr(''); }}
            placeholder="아이디"
            autoFocus
            className={inputCls}
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(''); }}
            placeholder="비밀번호"
            className={inputCls}
          />
          {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all">
            로그인
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px]">
          <span className="text-gray-400">계정이 없으신가요?</span>
          <button onClick={onGoSignup} className="font-bold text-blue-600 hover:underline">
            회원가입
          </button>
        </div>

        <div className="mt-3 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 leading-relaxed">
          <span className="font-bold text-gray-500">기본 계정</span><br />
          all001/1234 · all002/1234<br />all003/1234 · all004/1234
        </div>
      </div>
    </div>
  );
}

// 회원가입 모달
export function SignupModal({ onClose, onGoLogin, onSignedUp }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [name, setName] = useState('');
  const [feeRate, setFeeRate] = useState('5');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (pw !== pw2) {
      setErr('비밀번호가 일치하지 않습니다.');
      return;
    }
    const res = registerUser({ id, pw, name, feeRate: Number(feeRate) / 100 });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    // 가입 직후 로그인 처리
    onSignedUp(id.trim(), pw);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black text-gray-900 mb-1">직원 회원가입</h2>
        <p className="text-xs text-gray-400 mb-5">가입한 계정은 이 브라우저에 저장되어 바로 로그인됩니다.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={id}
            onChange={(e) => { setId(e.target.value); setErr(''); }}
            placeholder="아이디 (3자 이상)"
            autoFocus
            className={inputCls}
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(''); }}
            placeholder="비밀번호 (4자 이상)"
            className={inputCls}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => { setPw2(e.target.value); setErr(''); }}
            placeholder="비밀번호 확인"
            className={inputCls}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (선택, 미입력 시 아이디로 표시)"
            className={inputCls}
          />
          <div>
            <label className="text-xs text-gray-500 font-medium">수수료율 (%)</label>
            <select
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className={inputCls}
            >
              <option value="5">5%</option>
              <option value="6">6%</option>
              <option value="7">7%</option>
              <option value="8">8%</option>
              <option value="10">10%</option>
            </select>
          </div>
          {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all">
            가입하기
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[12px]">
          <span className="text-gray-400">이미 계정이 있으신가요?</span>
          <button onClick={onGoLogin} className="font-bold text-blue-600 hover:underline">
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}
