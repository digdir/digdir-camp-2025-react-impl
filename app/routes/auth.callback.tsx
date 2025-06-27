import { ClientLoaderFunctionArgs } from 'react-router';

import { Authorization } from '~/lib/auth';

export async function clientLoader( { request }: ClientLoaderFunctionArgs ) {
    await Authorization.handleCallback(request);
}

export default function LoginCallback() {
    return null;
}
