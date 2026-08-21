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
        <div className="mt-4 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 leading-relaxed">
          <span className="font-bold text-gray-500">계정</span><br />
          all001/1234 · all002/1234<br />all003/1234 · all004/1234
        </div>
      </div>
    </div>
  );
}
