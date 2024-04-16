/**
 * A very minimal version of the `useQuery` hook, with a never expiring cache.
 * Prevents race conditions by ignoring outdated requests. Query keys are hashed
 * in a stable way to compare them properly, and can contain any serializable
 * value.
 *
 * @param {ReadonlyArray<unknown>} queryKey An array of serializable values that uniquely identify the query
 * @param {string | string[]} queryTemplate The GraphQL template to fetch the data from
 * @param { {enabled?: boolean} } options Additional options: whether the query is `enabled`
 * @returns The result of the query
 */
export function useQuery(
  queryKey,
  queryTemplate,
  options = {}
) {
  const { enabled = !!queryTemplate } = options;

  // We store state in a single object to make it easier to keep all state in sync
  const [state, setState] = useState({
    isLoading: true,
    isError: false,
    error: undefined,
    data: undefined,
  });

  const [refetchId, setRefetchId] = useState("");
  const lastRefetchIdHandled = useRef("");

  const queryHash = hashKey(queryKey);
  const lastQueryTemplate = useRef(queryTemplate);
  const queryTemplateChanged = partialDeepEqual(lastQueryTemplate.current, queryTemplate);
  lastQueryTemplate.current = queryTemplate;

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const forceRefetch = refetchId !== lastRefetchIdHandled.current;

        // Check cache first
        if (forceRefetch === false && cache.has(queryHash)) {
          setState({
            isLoading: false,
            isError: false,
            error: undefined,
            data: cache.get(queryHash),
          });
          return;
        }

        // Forced refetch or no cache, continue to fetch data

        // Set loading state
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          isError: false,
        }));

        // Update the refetch id to ensure we don't handle the same refetch multiple times
        lastRefetchIdHandled.current = refetchId;

        let data;
        // Fetch the data
        if (typeof queryTemplate === 'string') {
          data = humanize(await fetchApi(queryTemplate));
        } else {
          const results = queryTemplate.map(async query => humanize(await fetchApi(query)));
          data = await Promise.all(results);
        }

        // Ensure the effect hasn't been cleaned up
        if (!ignore) {
          cache.set(queryHash, data);
          setState({
            isLoading: false,
            isError: false,
            error: undefined,
            data,
          });
        }
      } catch (error) {
        // Ensure the effect hasn't been cleaned up
        if (!ignore) {
          setState({
            isLoading: false,
            isError: true,
            error,
            data: undefined,
          });
        }
      }
    }

    if (enabled) {
      fetchData();
    }

    return () => {
      // Ensures we don't update state after the effect has been cleaned up
      ignore = true;
    };
  }, [queryHash, queryTemplateChanged, enabled, refetchId]);

  const refetch = () => {
    setRefetchId("T" + Date.now());
  };

  return { ...state, refetch };
}

// Utils
// =============================================================================

/**
 * @param {ReadonlyArray<unknown>} queryKey
 */
function hashKey(queryKey) {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
        .sort()
        .reduce((result, key) => {
          result[key] = val[key];
          return result;
        }, {})
      : val
  );
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has no constructor
  const ctor = o.constructor;
  if (ctor === undefined) {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

/**
 * Checks if `b` partially matches with `a`.
 */
export function partialDeepEqual(a, b) {
  if (a === b) {
    return true
  }

  if (typeof a !== typeof b) {
    return false
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return !Object.keys(b).some(key => !partialDeepEqual(a[key], b[key]))
  }

  return false
}
