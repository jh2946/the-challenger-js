import { EmbedBuilder, Message } from "discord.js";
import { MsgOrBtn, cmdConfirm, cmdStep, durationString, embedColor, parseDurationH, parseDurationM, parseIntCheck, reply } from "./utils.js";
import { addMinutes, addSeconds, format, parse } from "date-fns";

async function newcontest(msg: Message, ...args: string[]) {
    let step = 0
    let contest_init: {
        name?: string,
        description?: string,
        date?: Date,
        date_set?: boolean,
        time_set?: boolean,
        duration?: number,
        checks?: number,
        checkCooldown?: number
    } = {}
    let response: MsgOrBtn
    while (true) {
        switch (step) {
            
            case 0:
                response = await cmdStep(msg, `Contest name (max. 128 characters${contest_init.name ? `, currently "${contest_init.name}"` : ''}):`, false, !!contest_init.name)
                if (response.string.startsWith('!')) break
                contest_init.name = response.string
                step ++

            case 1:
                response = await cmdStep(msg, `Contest description (max 1000 characters${contest_init.description ? `, currently "${contest_init.description}"` : ''}):`, true, !!contest_init.description)
                if (response.string.startsWith('!')) break
                if (response.string.length > 1000) {
                    await reply(msg, 'Description should be 1000 characters or less.')
                    break
                }
                contest_init.description = response.string
                step ++


            case 2:
                response = await cmdStep(msg, `Contest start date (\`DD/MM/YYYY\`${contest_init.date_set ? `, currently "${format(contest_init.date!, 'do MMMM yyyy')}"` : ''}): `, true, !!contest_init.date_set)
                if (response.string.startsWith('!')) break
                const date = parse(response.string, 'dd/MM/yyyy', contest_init.date ?? new Date())
                if (!date.valueOf()) {
                    await reply(response.interaction, 'Follow the format given (did you leave out any zeros?)')
                    break
                }
                if (new Date(new Date().setHours(0,0,0,0)) > date) {
                    await reply(response.interaction, 'Please give a date somewhere in the future.')
                    break
                }
                contest_init.date = date
                contest_init.date_set = true
                step ++

            case 3:
                response = await cmdStep(msg, `Contest start time (24-hour format \`hh:mm\`${contest_init.time_set ? `, currently "${format(contest_init.date!, 'h:mm a')}"` : ''}): `, true, !!contest_init.time_set)
                if (response.string.startsWith('!')) break
                const time = parse(response.string, 'HH:mm', contest_init.date ?? new Date())
                if (!time.valueOf()) {
                    await reply(response.interaction, 'Follow the format given (did you leave out any zeros?)')
                    break
                }
                if (addMinutes(new Date(), 5) > time) {
                    await reply(response.interaction, 'Please give a time at least 5 minutes in the future.')
                    break
                }
                contest_init.date = time
                contest_init.time_set = true
                step ++

            case 4:
                response = await cmdStep(msg, `Contest duration (\`hh:mm[:ss]\`${contest_init.duration ? `, currently "${durationString(contest_init.duration)}"` : ''}):`, true, !!contest_init.duration)
                if (response.string.startsWith('!')) break
                const duration = parseDurationH(response.string)
                if (isNaN(duration)) {
                    await reply(response.interaction, 'Follow the format given.')
                    break
                }
                contest_init.duration = duration
                step ++

            case 5:
                response = await cmdStep(msg, `Number of times participants can check their answers (0 for none, -1 for unlimited${contest_init.checks ? `, currently ${contest_init.checks}`: ''}):`, true, !!contest_init.checks)
                if (response.string.startsWith('!')) break
                const num = parseIntCheck(response.string, -1, Infinity)
                if (isNaN(num)) {
                    await reply(response.interaction, 'Please enter a valid number.')
                    break
                }
                contest_init.checks = num
                step ++

            case 6:
                response = await cmdStep(msg, `Cooldown for answer checking (\`[hh:]mm:ss\`${contest_init.checkCooldown ? `, currently ${durationString(contest_init.checkCooldown)}` : ''})`, true, !!contest_init.checkCooldown)
                if (response.string.startsWith('!')) break
                const durationM = parseDurationM(response.string)
                if (isNaN(durationM)) {
                    await reply(response.interaction, 'Follow the format given.')
                    break
                }
                contest_init.checkCooldown = durationM
                step ++

            case 7:
                const content =
`Name: ${contest_init.name}
Contest master: ${msg.author.toString()}
Description: ${contest_init.description}
Start date and time: ${format(contest_init.date!, 'do MMMM yyyy, h:mm a')}
End date and time: ${format(addSeconds(contest_init.date!, contest_init.duration!), 'do MMMM yyyy, h:mm a')}
Duration: ${durationString(contest_init.duration!)}`
                response = await cmdConfirm(msg, 'Contest data', content, true)
                break

        }
        if (response!.string == '!Back') {
            await reply(response!.interaction, 'Command moved back.')
            step --
        }
        if (response!.string == '!Next') {
            await reply(response!.interaction, 'Command moved forward.')
            step ++
        }
        if (response!.string == '!Cancel') {
            await reply(response!.interaction, 'Command cancelled!')
            break
        }
        if (response!.string == '!OK') {
            await reply(response!.interaction, 'Contest scheduled! (Dummy message - no effect as of now. I\'ll have to hook this up to a database.)')
            break
        }
        if (response!.string == '!Timeout') {
            await reply(response!.interaction, 'Command timed out.')
            break
        }
    }
}

async function help(msg: Message, ...args: string[]) {
    const description =
`## General

### \`!newcontest\`
Schedule a new contest.

### \`!cancelcontest <contest id>\`
Cancel a contest.

## Contest master

### \`!set <contest id> <question id>\`
(before contest) Create a new question.

### \`!remove <contest id> <question id>\`
(before contest) Remove an existing question.

### \`!disqualify <contest id> <user>\`
Disqualify a user from a competition.

### \`!requalify <contest id> <user>\`
Undo a disqualification.

## Participant (during contest)

### \`!selfdefer <contest id>\`
(before contest) Defer (postpone) your participation or change your deferral.

### \`!submit <question id> <answer>\`
(during contest) Submit an answer to a question.

### \`!check <question id> <answer>\`
(during contest) Check an answer to a question.`
    const embed = new EmbedBuilder({
        description,
        color: embedColor
    })
    msg.reply({
        embeds: [embed],
        allowedMentions: {
            repliedUser: false
        }
    })
}

const command_list: { [key: string]: (msg: Message, ...args: string[]) => void } = {
    newcontest,
    help
}

export default command_list
