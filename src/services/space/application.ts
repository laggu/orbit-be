import fetch from 'node-fetch'

import { AccessToken, OrganizationSecret, PublicKeys } from '@types/space'
import { Unauthorized } from '@types/errors'

export async function getAccessToken(secret: OrganizationSecret): Promise<AccessToken> {
    const url = `${secret.serverUrl}/oauth/token`
    const token = Buffer.from(`${secret.clientId}:${secret.clientSecret}`).toString('base64')

    const params = new URLSearchParams()
    params.set('grant_type', 'client_credentials')
    params.set('scope', '**')

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${token}`,
        },
        body: params,
    })
    if (!response.ok) {
        throw new Unauthorized(await response.text())
    }
    return (await response.json()) as AccessToken
}

export async function getPublicKeys(secret: OrganizationSecret, token: string): Promise<PublicKeys> {
    const url = `${secret.serverUrl}/api/http/applications/clientId:${secret.clientId}/public-keys`
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            Authorization: token,
        },
    })
    if (!response.ok) {
        throw new Unauthorized(await response.text())
    }
    return JSON.parse(await response.json()) as PublicKeys
}
