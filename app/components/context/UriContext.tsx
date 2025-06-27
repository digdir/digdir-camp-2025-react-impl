import { createContext, useContext } from 'react';

export type SingleUriType = {
    id: string;
    uri: string;
    error?: string;
};

export type UriTypes = {
    redirectUris: SingleUriType[];
    postLogoutUris: SingleUriType[];
};

// Context is an alternative to prop-drilling. Smoother way of handling sending state to nested components
interface UriContextType {
    uris: UriTypes;
    setUris: React.Dispatch<React.SetStateAction<UriTypes>>;
}

export const UriContext = createContext<UriContextType>({
    uris: {
        redirectUris: [],
        postLogoutUris: [],
    },
    setUris: () => {
        throw new Error('setUris called outside of UriProvider');
    },
});

export function useRedirectUris() {
    const { uris, setUris } = useContext(UriContext);

    const prefixId = (list: { id: string; uri: string }[]) =>
        list.map(item => ({
            ...item,
            id: item.id.startsWith('redirect_uri#') ? item.id : `redirect_uri#${item.id}`,
        }));

    return {
        redirectUris: uris.redirectUris,
        setRedirectUris: (
            newUris:
                | UriTypes['redirectUris']
                | ((prev: UriTypes['redirectUris']) => UriTypes['redirectUris'])
        ) => {
            setUris(prev => ({
                ...prev,
                redirectUris:
                    typeof newUris === 'function'
                        ? prefixId(newUris(prev.redirectUris))
                        : prefixId(newUris),
            }));
        },
    };
}

export function usePostLogoutUris() {
    const { uris, setUris } = useContext(UriContext);

    const prefixId = (list: { id: string; uri: string }[]) =>
        list.map(item => ({
            ...item,
            id: item.id.startsWith('post_logout_redirect_uri#')
                ? item.id
                : `post_logout_redirect_uri#${item.id}`,
        }));

    return {
        postLogoutUris: uris.postLogoutUris,
        setPostLogoutUris: (
            newUris:
                | UriTypes['postLogoutUris']
                | ((prev: UriTypes['postLogoutUris']) => UriTypes['postLogoutUris'])
        ) => {
            setUris(prev => ({
                ...prev,
                postLogoutUris:
                    typeof newUris === 'function'
                        ? prefixId(newUris(prev.postLogoutUris))
                        : prefixId(newUris),
            }));
        },
    };
}