import React, { useState, useEffect } from 'react';
import { USERS } from './users';

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
    const found = USERS.find((u) => u.id === id && u.pw === pw);
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

// 로그인 모달 (회원가입 제거됨)
export function LoginModal({ onLogin, onClose }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = onLogin(id.trim(), pw);
    if (!res.ok) setErr(res.error);
    else onClose(); // 로그인 성공 시 모달 닫기 (overlay 제거 → 카드 클릭 정상화)
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black text-gray-900 mb-1">직원 로그인</h2>
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
      </div>
    </div>
  );
}

// 풀스크린 로그인 게이트 (사이트 진입 시 먼저 표시)
export function LoginGate({ onLogin }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = onLogin(id.trim(), pw);
    if (!res.ok) setErr(res.error);
    // 성공 시 onLogin이 setUser 하여 부모가 게이트를 내림 (여기선 닫을 것 없음)
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 overflow-hidden relative">
      {/* 배경 플로팅 원 */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-blue-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* 워드마크 */}
        <div className="text-center mb-8 animate-[pulse_1.5s_ease-in-out_infinite]">
          <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
            ALL<span className="text-blue-200">렌탈</span>
          </h1>
          <p className="text-blue-100/80 text-xs mt-1 tracking-[0.3em]">PREMIUM RENTAL</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-black text-gray-900 mb-1">직원 로그인</h2>
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
        </div>
      </div>
    </div>
  );
}
