import { ApiErrorResponse } from './models';

export enum ErrorMessage {
    OrganizationNameNotFound = 'scope_page.org_not_found',
};

export type ErrorResponse = {
    error: string;
};

export const isErrorResponse = (response: any): response is ErrorResponse => {
    return response && 'error' in response;
};

type ApiOperationError =
    | 'Failed to add client'
    | 'Failed to update client'
    | 'Failed to fetch client'
    | 'Failed to fetch clients'
    | 'Failed to delete client'
    | 'Failed to add JWK'
    | 'Failed to fetch JWKs'
    | 'Failed to delete JWK'
    | 'Failed to add scope'
    | 'Failed to update scope'
    | 'Failed to delete scope'
    | 'Failed to fetch scope prefixes'
    | 'Failed to fetch scopes'
    | 'Failed to find organization'
    | 'Failed to add scope access'
    | 'Failed to remove scope access'
    | 'Failed to fetch OnBehalfOf for client'
    | 'Failed to add OnBehalfOf to client'
    | 'Failed to edit OnBehalfOf on client'
    | 'Failed to delete OnBehalfOf from client'
    | 'Failed to generate client secret'
    | 'Failed to fetch delegation sources'
    | 'Failed to fetch user information';

export class ApiError extends Error {
    public readonly status?: number;
    public readonly userMessage: string;

    constructor(private readonly error: ApiErrorResponse, public readonly operation: ApiOperationError) {
        super(error.error);
        this.status = error.status;
        this.userMessage = error.error_description || operation;
    }

    public toErrorResponse(): ErrorResponse {
        return { error: this.userMessage };
    }
}
