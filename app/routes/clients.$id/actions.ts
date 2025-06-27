export enum ActionIntent {
    AddKey = 'addKeyToClient',
    AddScopeToClient = 'addScopeToClient',
    AddOnBehalfOf = 'addOnBehalfOfToClient',
    EditOnBehalfOf = 'editOnBehalfOfToClient',
    DeleteOnBehalfOf = 'deleteOnBehalfOf',
    DeleteClient = 'deleteClient',
    DeleteKey = 'deleteJwkFromClient',
    DeleteScopeFromClient = 'deleteScopeFromClient',
    UpdateClient = 'updateClient',
    GenerateSecret = 'generateSecret'
}
