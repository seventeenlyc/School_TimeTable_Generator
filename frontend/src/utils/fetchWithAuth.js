export const fetchWithAuth = async (_token, url, options = {}) => {
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
  };
  return fetch(url, { ...options, headers });
};
