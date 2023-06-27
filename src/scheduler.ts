import fastq, { queueAsPromised } from 'fastq'
import schedule from 'node-schedule'

import Messenger from '@/messenger'
import { logger } from '@utils/logger'
import { OrbitModel } from '@/models'

export default class Scheduler {
    queue: queueAsPromised

    constructor(messenger: Messenger) {
        this.queue = fastq.promise(messenger.handler, 5)
    }

    private async publish() {
        logger.info('run publisher')

        const now = new Date()
        let page = 1
        while (page) {
            const orbits = await OrbitModel.findByExecutionTime(page, now)
            for (const orbit of orbits.docs) {
                await this.queue.push(orbit)
            }

            page = orbits.nextPage
        }
    }

    public run() {
        schedule.scheduleJob('* * * * *', async () => await this.publish())
    }
}
