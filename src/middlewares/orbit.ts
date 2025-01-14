import { NextFunction, Request, Response } from 'express'
import { errors, orbit } from '@/types'
import { Orbit, OrbitModel } from '@/models'
import { MAX_ORBIT_COUNT } from '@/config'
import { sendAddErrorMessage } from '@/services/space'
import { BadRequest } from '@/types/errors'
import cronParser from 'cron-parser'

export async function orbitMaxCountLimiter(req: Request, res: Response, next: NextFunction) {
    const orbitMessages: Orbit[] = await OrbitModel.findByClientId(req.organization.clientId)
    if (orbitMessages.length >= MAX_ORBIT_COUNT) {
        if (req.body.userId) {
            await sendAddErrorMessage(req.organization, req.body.userId)
        }
        return next(new errors.MaxOrbitMessage())
    }
    next()
}

export async function verifyPostMessage(req: Request, res: Response, next: NextFunction) {
    // body에 존재하는 사용자 입력을 필터링, 이 후 검증
    const SUPPORTED_FORMATS = ['cron', 'weekly']

    const body = req.body as orbit.PostOrbitRequest

    const { channelName, format, message, cron, timezone } = body

    if (!message) {
        return next(new errors.BadRequest())
    }
    if (!channelName) {
        // todo: check if channelName exist
        return next(new errors.BadRequest())
    }

    if (!timezone) {
        // todo: check if the timezone is valid
        return next(new errors.BadRequest())
    }

    if (!format || !SUPPORTED_FORMATS.includes(format)) {
        return next(new errors.BadRequest())
    }

    if (format === 'cron') {
        const cronLength = cron?.split(' ').length
        if (!cron || cronLength !== 5) {
            return next(new BadRequest())
        }
        try {
            cronParser.parseExpression(cron)
        } catch (e) {
            return next(new BadRequest())
        }
    } else if (format === 'weekly') {
        if (!body.weekly || !body.weekly.days || !body.weekly.time) {
            return next(new BadRequest())
        }
        if (!body.weekly.days.length) {
            return next(new BadRequest())
        }
    }
    next()
}
