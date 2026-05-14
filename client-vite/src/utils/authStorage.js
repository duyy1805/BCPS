const STORAGE_KEYS = {
    token: 'jwt_token',
    userName: 'user_name',
    empCode: 'emp_code',
    deptCode: 'department_code',
    unitName: 'unit_name',
    roles: 'user_roles',
    rememberedUsername: 'remembered_login_username',
};

const STORAGE_ORDER = [window.localStorage, window.sessionStorage];

function readFromStorage(storage) {
    const token = storage.getItem(STORAGE_KEYS.token);
    const userName = storage.getItem(STORAGE_KEYS.userName);

    if (!token || !userName) return null;

    return {
        token,
        userName,
        empCode: storage.getItem(STORAGE_KEYS.empCode),
        deptCode: storage.getItem(STORAGE_KEYS.deptCode),
        unitName: storage.getItem(STORAGE_KEYS.unitName),
        rolesStr: storage.getItem(STORAGE_KEYS.roles),
        storage,
    };
}

export function getStoredAuth() {
    for (const storage of STORAGE_ORDER) {
        const entry = readFromStorage(storage);
        if (entry) return entry;
    }
    return null;
}

export function getStoredToken() {
    return getStoredAuth()?.token || null;
}

export function setStoredAuth(data, rememberMe = true) {
    clearStoredAuth();

    const storage = rememberMe ? window.localStorage : window.sessionStorage;

    storage.setItem(STORAGE_KEYS.token, data.token);
    storage.setItem(STORAGE_KEYS.userName, data.userName);
    storage.setItem(STORAGE_KEYS.empCode, data.empCode || '');

    if (data.deptCode) {
        storage.setItem(STORAGE_KEYS.deptCode, data.deptCode);
    }

    if (data.unitName) {
        storage.setItem(STORAGE_KEYS.unitName, data.unitName);
    }

    if (data.roles) {
        storage.setItem(STORAGE_KEYS.roles, JSON.stringify(data.roles));
    }
}

export function clearStoredAuth() {
    const keys = Object.values(STORAGE_KEYS).filter((key) => key !== STORAGE_KEYS.rememberedUsername);
    for (const storage of STORAGE_ORDER) {
        keys.forEach((key) => storage.removeItem(key));
    }
}

export function getRememberedUsername() {
    return window.localStorage.getItem(STORAGE_KEYS.rememberedUsername) || '';
}

export function setRememberedUsername(username) {
    const value = String(username || '').trim();

    if (value) {
        window.localStorage.setItem(STORAGE_KEYS.rememberedUsername, value);
    } else {
        window.localStorage.removeItem(STORAGE_KEYS.rememberedUsername);
    }
}

export { STORAGE_KEYS };
