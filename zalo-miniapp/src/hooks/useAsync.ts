import { useCallback, useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
};

// Hook nhỏ để fetch dữ liệu: loading / error / retry.
export function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: false,
  });

  const run = useCallback(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    fn()
      .then((data) => {
        if (active) setState({ data, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ data: null, loading: false, error: true });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => run(), [run]);

  return { ...state, reload: run };
}
