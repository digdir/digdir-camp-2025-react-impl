import { components } from './api';

export type ApiErrorResponse = components['schemas']['ApiErrorResponse'];
export type Client = components['schemas']['ClientResponse'];
export type AddClientRequest = components['schemas']['AddClientRequest'];
export type UpdateClientRequest = components['schemas']['UpdateClientRequest'];
export type JWK = components['schemas']['JsonWebKey'];
export type Scope = components['schemas']['Scope_ScopeExternal'];
export type ScopeAccess = components['schemas']['ScopeAccess'];
export type ScopePrefix = components['schemas']['ScopePrefix'];
export type ClientOnBehalfOf = components['schemas']['ClientOnBehalfOf'];
export type Organization = components['schemas']['Organization'];
export type DelegationSource = components['schemas']['DelegationSource'];
export type AuthenticatedOrganization = components['schemas']['AuthenticatedOrganization'];

// Languages in scope are not included in swagger. We have to manually extend the Scope type with these values until V2.
type MultilingualFieldKeys = `${'description' | 'long_description'}#${string}`;
export type ExtendedScope = Scope & {
  [key in MultilingualFieldKeys]?: string;
};