import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Message, MessageReplyOptions } from 'discord.js'
import { randomBytes } from 'crypto'

const COMMAND_TIMEOUT = 60000

export const embedColor = 0x5865F2

export type MsgOrBtn = {
    interaction: Message | ButtonInteraction,
    string: string
}

type ButtonOptions = {
    label: string,
    style: ButtonStyle
}

export async function reply(msg: Message | ButtonInteraction, content: string) {
    return await msg.reply({
        content,
        allowedMentions: {
            repliedUser: false
        }
    })
}

export function parseDurationH(s: string) {
    let durationList = s.split(':').map(Number)
    if (durationList.length < 2 || durationList.length > 3)
        return NaN
    if (!durationList.every( x => x >= 0 ))
        return NaN
    if (durationList.length == 2)
        durationList.push(0)
    const result = 3600*durationList[0] + 60*durationList[1] + durationList[2]
    return result
}

export function parseDurationM(s: string) {
    let durationList = s.split(':').map(Number)
    if (durationList.length < 2 || durationList.length > 3)
        return NaN
    if (!durationList.every( x => x >= 0 ))
        return NaN
    if (durationList.length == 2)
        durationList = [0, ...durationList]
    const result = 3600*durationList[0] + 60*durationList[1] + durationList[2]
    return result
}

export function durationString(t: number) {
    let ans = ''
    const h = Math.floor(t/3600)
    const m = Math.floor(t/60) % 60
    const s = t % 60
    if (h)
        ans += `${h} hour${h != 1 ? 's' : ''} `
    if (m)
        ans += `${m} minute${m != 1 ? 's' : ''} `
    if (s)
        ans += `${s} second${s != 1 ? 's' : ''} `
    return ans.slice(0, -1)
}

export function parseIntCheck(s: string, min: number, max: number) {
    const n = Number(s)
    if (1/n == 0 || !(n >= min && n <= max))
        return NaN
    return n
}

class Button extends ButtonBuilder {

    static uuids: Set<string> = new Set()
    request: Message
    custom_id: string
    label: string

    constructor(
        request: Message,
        label: string,
        style: ButtonStyle
    ) {
        super({ label, style })
        this.custom_id = randomBytes(4).toString('base64url')
        while (Button.uuids.has(this.custom_id))
            this.custom_id = randomBytes(4).toString('base64url')
        Button.uuids.add(this.custom_id)
        this.setCustomId(this.custom_id)
        this.request = request
        this.label = label
    }

    when_pressed() {
        return new Promise((res: (value: MsgOrBtn) => void, rej) => {
            const collector = this.request.channel.createMessageComponentCollector()
            collector.on('collect', (interaction: ButtonInteraction) => {
                if (!interaction.isButton()) return
                if (interaction.customId == this.custom_id
                    && interaction.user.id == this.request.author.id) {
                    collector.stop()
                    Button.uuids.delete(this.custom_id)
                    res({
                        interaction,
                        string: '!'+this.label
                    })
                }
            })
            setTimeout(() => {
                collector.stop()
                res({
                    interaction: this.request,
                    string: '!Timeout'
                })
            }, COMMAND_TIMEOUT)
        })
    }

}

async function baseReply(
    priorRequest: Message,
    response: MessageReplyOptions,
    buttons: ButtonOptions[],
    getText: boolean = true
) {

    let components = []
    let batch = []

    if (getText) {
        const filter = (m: Message) => {
            return m.author == priorRequest.author && !m.content.startsWith('!')
        }
        const txtres = async () => {
            try {
                const msg = (await priorRequest.channel.awaitMessages({
                    filter,
                    time: COMMAND_TIMEOUT,
                    max: 1,
                    errors: ['time']
                })).first() as Message<boolean>
                return {
                    interaction: msg,
                    string: msg.content
                } as MsgOrBtn
            }
            catch (e) {
                return {
                    interaction: priorRequest,
                    string: '!Timeout'
                }
            }
        }

        batch.push(txtres())
    }

    for (const opt of buttons) {
        const btn = new Button(priorRequest, opt.label, opt.style)
        components.push(btn)
        batch.push(btn.when_pressed())
    }

    response.components = [new ActionRowBuilder<ButtonBuilder>({
        components
    })]

    await priorRequest.reply(response)
    return await Promise.race(batch)
    
}

export async function cmdStep(
    priorRequest: Message, 
    response: string, 
    back_btn: boolean,
    next_btn: boolean) {

    let labels: ButtonOptions[] = []
    if (back_btn) labels.push({ label: 'Back', style: ButtonStyle.Primary })
    if (next_btn) labels.push({ label: 'Next', style: ButtonStyle.Primary })
    labels.push({ label: 'Cancel', style: ButtonStyle.Secondary })
    
    return await baseReply(priorRequest, { content: response, allowedMentions: { repliedUser: false } }, labels)

}

export async function cmdConfirm(
    priorRequest: Message, 
    title: string,
    description: string, 
    back_btn: boolean) {

    const embed = new EmbedBuilder({
        title,
        description,
        color: 0x5865F2
    })

    let labels: ButtonOptions[] = []
    labels.push({ label: 'OK', style: ButtonStyle.Success })
    if (back_btn) labels.push({ label: 'Back', style: ButtonStyle.Primary })
    labels.push({ label: 'Cancel', style: ButtonStyle.Secondary })
    
    return await baseReply(priorRequest, { embeds: [embed], allowedMentions: { repliedUser: false } }, labels)

}
