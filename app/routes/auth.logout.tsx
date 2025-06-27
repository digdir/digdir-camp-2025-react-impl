import { Authorization } from '~/lib/auth';

export async function clientLoader() {
    await Authorization.logout();
}

export default function Logout() {
    return null;
}
