#!/bin/bash
# 재크롤 진행 상황을 텔레그램으로 1분마다 보고
TOKEN="8708414924:AAHBJHXSgI61wQbGEO_BYsmzvXNxvdT60Qo"
CHAT_FILE="/opt/data/allrental/backend/.tg_chatid"
LOG="/tmp/recrawl5.log"

# chat_id 없으면 getUpdates에서 추출 시도
if [ ! -f "$CHAT_FILE" ]; then
  CID=$(curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates" 2>/dev/null | grep -o '"chat":{"id":[0-9-]*' | head -1 | grep -o '[0-9-]*$')
  if [ -n "$CID" ]; then echo "$CID" > "$CHAT_FILE"; fi
fi
[ -f "$CHAT_FILE" ] || exit 0
CHAT=$(cat "$CHAT_FILE")

# 진행률 읽기
LAST=$(tail -1 "$LOG" 2>/dev/null)
if [ -z "$LAST" ]; then LAST="로그 없음"; fi

# 재크롤 프로세스 상태
PID=$(pgrep -f "rebuild_merged.py" | head -1)
if [ -n "$PID" ]; then
  STATUS="🔄 진행 중 (PID $PID)"
else
  STATUS="⏹ 종료됨"
fi

MSG="[ALL렌탈 재크롤]
상태: $STATUS
진행: $LAST
시각: $(date '+%H:%M:%S')"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d "chat_id=${CHAT}" -d "text=${MSG}" >/dev/null 2>&1
