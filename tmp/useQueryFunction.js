useQueryWrapper: (queryKey, graphQl, options = { enabled: true }) => {
      const [data, setData] = useState(null);
      const [isLoading, setIsLoading] = useState(true);
      const [shouldReloadCache, setShouldReloadCache] = useState(false);
      const isMountedRef = useRef(true);
      const key = hashKey(queryKey);
      const isMatch = partialMatchKey(queryKey, key);
      globalThis.mmCache = globalThis?.mmCache || new Map();

      useEffect(async () => {
        console.log('jeshua useQueryWrapper')
        if (!isMountedRef.current) return;
        console.log('jeshua useQueryWrapper running', { key, graphQl })

        async function fetchData() {
          if (options?.enabled == false || !graphQl) {
            return;
          }
          if (!globalThis.mmCache.has(key) || shouldReloadCache) {
            setIsLoading(true);
            let result;
            if (typeof graphQl === 'string') {
              result = humanize(await fetchApi(graphQl));
              // console.log('not using cache', key)
            } else {
              // console.log('not using cache', key)
              result = graphQl.map(async query => humanize(await fetchApi(query)));
              result = await Promise.all(result);
            }
            // add this line
            setIsLoading(false);
            setData(result);
            setShouldReloadCache(false);
            globalThis.mmCache.set(key, result);
          } else {
            setIsLoading(false);
            setData(globalThis.mmCache.get(key));
            // console.log('using cache', key);
          }
        }

        fetchData();

        return () => {
          void (isMountedRef.current = false);
        };
      }, [key, shouldReloadCache, options.enabled, graphQl]);

      return {
        isLoading,
        isError: false,
        error: null,
        data: data,
        refetch: () => {
          setShouldReloadCache(true);
        },
      }
    }
