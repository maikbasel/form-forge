import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useSheetFields = () => {
  const { data, error } = useSWR("/api/users", fetcher);
  return {
    fields: data,
    isLoading: !(error || data),
    isError: error,
  };
};
