/**
 * FlashStorage is a simple wrapper around the sessionStorage API that allows
 * you to store a value in the session storage and retrieve it once. After it
 * has been retrieved, it is removed from the session storage.
 *
 * This is useful for storing data across a redirect, such as the PKCE code
 * verifier and state in the OAuth 2.0 authorization code flow.
 */
export class FlashStorage {
    static setItem(key: string, value: string) {
        sessionStorage.setItem(key, value);
    }

    static getItem(key: string): string | null {
        const value = sessionStorage.getItem(key);
        sessionStorage.removeItem(key);
        return value;
    }
}
