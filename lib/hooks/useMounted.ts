import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * 컴포넌트가 클라이언트에 마운트되었는지 여부를 반환하는 커스텀 훅.
 * React 19의 react-hooks/set-state-in-effect 린트 에러를 유발하지 않으며,
 * SSR 시점과 클라이언트 하이드레이션 시점 간의 안전한 렌더링 분기를 제공합니다.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
