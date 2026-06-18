export function getCurrentUserKey() {
  try {
    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    if (!storedUser) {
      return "guest";
    }

    const user = JSON.parse(storedUser);

    return user.id || user.email || user.username || "guest";
  } catch {
    return "guest";
  }
}

export function getUserStorageKey(key: string) {
  const userKey = getCurrentUserKey();
  return `${key}:user:${userKey}`;
}

export function getUserStorageItem(key: string) {
  return localStorage.getItem(getUserStorageKey(key));
}

export function setUserStorageItem(key: string, value: string) {
  localStorage.setItem(getUserStorageKey(key), value);
}

export function removeUserStorageItem(key: string) {
  localStorage.removeItem(getUserStorageKey(key));
}
