import { NextFunction, Request, RequestHandler, Response } from 'express'
import crypto from 'crypto'
import jwkToPem from 'jwk-to-pem'

import { InvalidClassName, Unauthorized } from '@/types/errors'
import { OrganizationModel, OrganizationSecret } from '@/models'
import { getPublicKeys } from '@services/space'

export const classNameValidator = (className: string): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (className === req.body.className) {
            next()
        } else {
            next(new InvalidClassName())
        }
    }
}

export const classNameRouter = (req: Request, res: Response, next: NextFunction) => {
    switch (req.body.className) {
        case 'InitPayload':
            req.url = '/v1/webhooks/install'
            req.method = 'post'
            break
        case 'ChangeServerUrlPayload':
            req.url = '/v1/webhooks/changeServerUrl'
            req.method = 'put'
            break
        case 'ApplicationUninstalledPayload':
            req.url = '/v1/webhooks/uninstall'
            req.method = 'delete'
            break
        case 'ListCommandsPayload':
            req.url = '/v1/commands/list'
            req.method = 'get'
            break
        case 'MessagePayload':
            break
        case 'MessageActionPayload':
            break
        case 'AppPublicationCheckPayload':
            res.sendStatus(200)
            return
    }
    res.meta.path = req.url
    next()
}

export const messageCommandRouter = (req: Request, res: Response, next: NextFunction) => {
    if (req.body.className === 'MessagePayload') {
        const commands = req.body.message.body.text.split(' ')
        switch (commands[0]) {
            case 'add':
                req.url = '/v1/commands/orbit'
                req.method = 'post'
                break
            case 'list':
                req.url = '/v1/commands/orbit'
                req.method = 'get'
                break
            case 'help':
                req.url = '/v1/commands/help'
                req.method = 'get'
                break
            default:
                // TODO send invalid command message
                res.sendStatus(204)
                return
        }
        res.meta.path = req.url
    }
    next()
}

export function actionRouter(req: Request, res: Response, next: NextFunction) {
    if (req.body.className === 'MessageActionPayload') {
        switch (req.body.actionId) {
            case 'delete':
                req.url = '/v1/commands/orbit'
                req.method = 'delete'
                break
            default:
                res.sendStatus(500)
                return
        }
        res.meta.path = req.url
    }
    next()
}

async function setOrganization(req: Request, res: Response, next: NextFunction) {
    if (req.body.className === 'InitPayload') {
        req.organizationSecret = new OrganizationSecret(req.body.clientId, req.body.clientSecret, req.body.serverUrl)
    } else if (req.body.clientId) {
        const organization = await OrganizationModel.findByClientId(req.body.clientId)
        req.organization = organization
        req.organizationSecret = organization
    }
    next()
}

async function verifySignature(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-space-public-key-signature'].toString()
    const data = `${req.headers['x-space-timestamp']}:${JSON.stringify(req.body)}`

    const publicKeys = await getPublicKeys(req.organizationSecret, await req.organizationSecret.getBearerToken())
    for (const publicKey of publicKeys.keys.reverse()) {
        const key = jwkToPem(publicKey)
        const verified = crypto.verify(
            'SHA512',
            Buffer.from(data),
            {
                key: key,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(signature, 'base64'),
        )

        if (verified) {
            return next()
        }
    }

    next(new Unauthorized('fail to verify public key'))
}

export const verifySpaceRequest = [setOrganization, verifySignature]
