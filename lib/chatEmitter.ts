import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
  var __onequiz_chat_emitter__: EventEmitter | undefined;
}

// Node.js 글로벌 싱글톤 이벤트 버스
if (!global.__onequiz_chat_emitter__) {
  global.__onequiz_chat_emitter__ = new EventEmitter();
  // 동시 접속 리스너 제한 해제
  global.__onequiz_chat_emitter__.setMaxListeners(0);
}

export const chatEmitter: EventEmitter = global.__onequiz_chat_emitter__;
