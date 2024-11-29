require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { Connection, PublicKey } = require("@solana/web3.js");
const { SplGovernance } = require("governance-idl-sdk");
const fs = require("fs").promises;

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PROPOSAL_STORE_FILE = "proposal_store.json";
const CONFIG_FILE = "config.json"; // Store channel, realm, and program IDs
const AUTO_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

const connection = new Connection(SOLANA_RPC_URL);
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Allows bot to read message content
    ],
});

let monitoringTimeout = null; // Keeps track of the auto-check timeout

// Load configuration
async function loadConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, "utf8");
        return JSON.parse(data);
    } catch {
        return {}; // Return empty config if file doesn't exist
    }
}

// Save configuration
async function saveConfig(config) {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Ensure proposal store exists
async function initializeProposalStore() {
    try {
        await fs.access(PROPOSAL_STORE_FILE);
    } catch {
        console.log("Proposal store not found. Initializing...");
        await fs.writeFile(PROPOSAL_STORE_FILE, JSON.stringify([], null, 2));
    }
}

// Check if a proposal is new
async function isNewProposal(proposalId) {
    await initializeProposalStore();
    const data = await fs.readFile(PROPOSAL_STORE_FILE, "utf8");
    const storedProposals = JSON.parse(data || "[]");
    return !storedProposals.includes(proposalId);
}

// Save a proposal ID
async function saveProposal(proposalId) {
    await initializeProposalStore();
    const data = await fs.readFile(PROPOSAL_STORE_FILE, "utf8");
    const storedProposals = JSON.parse(data || "[]");
    if (!storedProposals.includes(proposalId)) {
        storedProposals.push(proposalId);
        await fs.writeFile(PROPOSAL_STORE_FILE, JSON.stringify(storedProposals, null, 2));
        console.log(`Proposal saved: ${proposalId}`);
    }
}

// Fetch proposals
async function fetchProposals(realmId, programId) {
    const governance = new SplGovernance(connection, new PublicKey(programId));
    let retries = 5; // Max number of retries
    let delayTime = 500; // Initial delay in milliseconds

    while (retries > 0) {
        try {
            console.log(`Fetching proposals for realm: ${realmId}, program: ${programId}`);

            const governanceAccounts = await governance.getGovernanceAccountsByRealm(new PublicKey(realmId));
            console.log(`Fetched ${governanceAccounts.length} governance accounts.`);

            const governanceAccountPubkeys = governanceAccounts.map(account => account.publicKey.toBase58());
            const rawProposals = await governance.getAllProposals(new PublicKey(programId));
            console.log(`Fetched ${rawProposals.length} total proposals.`);

            const filteredProposals = rawProposals.filter(proposal =>
                governanceAccountPubkeys.includes(proposal.governance.toBase58())
            );

            console.log(`Filtered proposals count: ${filteredProposals.length}`);

            return filteredProposals.map(proposal => ({
                id: proposal.publicKey.toBase58(),
                title: proposal.name,
                description: proposal.descriptionLink || "No description provided.",
                state: Object.keys(proposal.state)[0],
                votingEndTime: proposal.votingCompletedAt
                    ? new Date(proposal.votingCompletedAt.toNumber() * 1000).toISOString()
                    : "No end time available",
            }));
        } catch (err) {
            if (err.response && err.response.status === 429) {
                // Handle rate limit
                console.warn(
                    `Server responded with 429 Too Many Requests. Retrying after ${delayTime}ms delay...`
                );
                await delay(delayTime); // Wait before retrying
                retries--;
                delayTime *= 2; // Double the delay time for exponential backoff
            } else {
                console.error("Error fetching proposals:", err.message);
                throw err; // Rethrow non-429 errors
            }
        }
    }

    console.error("Failed to fetch proposals after multiple retries.");
    return []; // Return an empty array if all retries fail
}

// Send a Discord notification
async function sendDiscordNotification(channel, proposal) {
    const embed = {
        title: proposal.title,
        description: proposal.description,
        fields: [
            { name: "State", value: proposal.state, inline: true },
            { name: "Voting Ends", value: proposal.votingEndTime, inline: true },
        ],
        color: 5814783,
    };

    await channel.send({ embeds: [embed] });
}

// Helper function to avoid overlapping checks
async function startMonitoring(config) {
    const { realmId, programId, notificationChannelId } = config;
    if (!realmId || !programId || !notificationChannelId) {
        console.log("Configuration incomplete for monitoring. Waiting for complete setup.");
        return;
    }

    try {
        const channel = await client.channels.fetch(notificationChannelId);
        if (!channel || !channel.isTextBased()) {
            console.log("Notification channel is invalid or not text-based.");
            return;
        }

        // Cancel previous timeout
        if (monitoringTimeout) {
            clearTimeout(monitoringTimeout);
        }

        // Perform the proposal check
        console.log("Starting proposal monitoring...");
        await processProposals(channel, realmId, programId);

        // Schedule the next check
        monitoringTimeout = setTimeout(() => startMonitoring(config), AUTO_CHECK_INTERVAL);
    } catch (error) {
        console.error("Error during proposal monitoring:", error.message);
    }
}

// Process proposals
async function processProposals(channel, realmId, programId) {
    console.log("Processing proposals...");
    try {
        const proposals = await fetchProposals(realmId, programId);
        console.log(`Fetched ${proposals.length} proposals.`);

        if (proposals.length === 0) {
            console.log("No proposals found.");
            await channel.send("No proposals found during this check.");
            return;
        }

        let newProposalsCount = 0;

        for (const proposal of proposals) {
            const isNew = await isNewProposal(proposal.id);
            if (isNew) {
                console.log(`New proposal detected: ${proposal.title}`);
                await sendDiscordNotification(channel, proposal);
                await saveProposal(proposal.id);
                newProposalsCount++;
            }
        }

        if (newProposalsCount > 0) {
            await channel.send(`Detected ${newProposalsCount} new proposals.`);
        } else {
            console.log("No new proposals detected.");
        }
    } catch (error) {
        console.error("Error in processProposals:", error.message);
        await channel.send("An error occurred while processing proposals. Check the logs for details.");
    }
}

// Bot commands
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const config = await loadConfig();

    if (message.content.startsWith("!setup")) {
        const args = message.content.split(" ");
        if (args.length < 3) {
            return message.reply("Usage: `!setup <REALM_ID> <PROGRAM_ID>`");
        }

        const [_, realmId, programId] = args;
        config.realmId = realmId;
        config.programId = programId;

        await saveConfig(config);
        message.channel.send("Setup complete. Run `!setchannel` to set the notification channel.");

        // Start monitoring if channel is already set
        if (config.notificationChannelId) {
            startMonitoring(config);
        }
    }

    if (message.content.startsWith("!setchannel")) {
        config.notificationChannelId = message.channel.id;
        await saveConfig(config);
        message.channel.send("Notification channel set.");

        // Start monitoring if realm and program are already set
        if (config.realmId && config.programId) {
            startMonitoring(config);
        }
    }

    if (message.content === "!fetch") {
        if (!config.realmId || !config.programId || !config.notificationChannelId) {
            return message.reply("Bot is not fully configured. Use `!setup` and `!setchannel` first.");
        }

        const channel = await client.channels.fetch(config.notificationChannelId).catch(() => null);
        if (!channel) {
            return message.reply("Notification channel is invalid. Please reconfigure with `!setchannel`.");
        }

        await processProposals(channel, config.realmId, config.programId);
    }
});

// Bot ready event
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const config = await loadConfig();
    startMonitoring(config);
});

client.login(DISCORD_TOKEN);
