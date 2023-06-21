import { Client, GatewayIntentBits } from 'discord.js'
import commands from './import/commands.js'
import dotenv from 'dotenv'
dotenv.config()

let intents = 0
for (const i in GatewayIntentBits) {
    if (+i) intents += +i
}
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
})

let busy: Set<string> = new Set()

client.login(process.env.TOKEN)

client.on('ready', () => {
    console.log('Ready')
})

client.on('messageCreate', async (msg) => {
    if (msg.content.startsWith('!')) {
        const input = msg.content.slice(1).split(' ').filter(s => s.length)
        if (input.length == 0) return
        const command = input[0]
        if (command in commands) {
            if (busy.has(msg.author.id)) {
                msg.channel.send('You can\'t run this command as you\'re currently running another command.')
            }
            else {
                busy.add(msg.author.id)
                const cmd_func = commands[command]
                await cmd_func(msg, ...input.slice(1))
                busy.delete(msg.author.id)
            }
        }
        else {
            msg.channel.send('This command doesn\'t exist - run \`!help\` to see all commands')
        }

    }
})

