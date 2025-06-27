import { ClientLoaderFunctionArgs, redirect } from 'react-router';

import { Authorization } from '~/lib/auth';

export async function clientLoader( { request }: ClientLoaderFunctionArgs ) {
    const url = new URL(request.url);
    const useSyntheticUser = url.searchParams.get('use_synthetic_user') === 'true';
    const entraId = url.searchParams.get('entra') === 'true';
    const authorizationUrl = await Authorization.buildAuthorizationUrl({ useSyntheticUser, entraId, prompt: 'login' });
    throw redirect(authorizationUrl);
}

export default function Login() {
    return null;
}
