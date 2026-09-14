import { DATA_PATHS } from "../types/paths";
import type { Poll, PollsFile } from "../types/polls";
import { useCallback, useEffect, useState } from "react";

interface UsePollsResult {
  polls: Poll[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePolls(): UsePollsResult {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`${DATA_PATHS.polls}?t=${Date.now()}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "No polls.json yet. Run npm run seed:polls or add a poll."
              : `Failed to load polls (${res.status})`,
          );
        }
        return (await res.json()) as PollsFile;
      })
      .then((file) => {
        setPolls(Array.isArray(file.polls) ? file.polls : []);
        setError(null);
      })
      .catch((err: unknown) => {
        setPolls([]);
        setError(err instanceof Error ? err.message : "Failed to load polls");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { polls, loading, error, reload };
}
