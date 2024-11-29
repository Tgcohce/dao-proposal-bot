# **DAO Proposal Bot**

**DAO Proposal Bot** is a Discord bot designed to automatically monitor proposals in a specified DAO (Decentralized Autonomous Organization) on the Solana blockchain. The bot fetches proposals, identifies new ones, and sends notifications to a designated Discord channel.
*Currently only working on Realms*

## **Key Features**

- 🛠 **Automatic Monitoring**: Continuously checks for new DAO proposals and sends alerts.
- 🔔 **Real-Time Notifications**: Alerts you about new proposals directly in your Discord server.
- 💾 **Proposal Tracking**: Keeps track of previously processed proposals to avoid duplicate notifications.
- 💬 **Simple Commands**: Set up and configure the bot with easy-to-use Discord commands.

---

## **How It Works**

1. **Fetch Proposals**: The bot retrieves all proposals for a specific DAO on the Solana blockchain using its Realm ID and Program ID.
2. **Identify New Proposals**: It checks whether a proposal is new or has already been processed.
3. **Send Notifications**: If a new proposal is detected, the bot sends a notification to a configured Discord channel.

---

## **Commands**

### **Setup Commands**

- `!setup <REALM_ID> <PROGRAM_ID>`  
  Configure the DAO Realm and Program IDs. These values specify the DAO the bot will monitor.  
  Example:  
  ```
  !setup <REALM_ID> GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw
  ```

- `!setchannel`  
  Set the current Discord channel as the notification channel for proposal updates.

- `!reset`  
  Reset the bot's configuration. Use this command to start fresh.

### **Information Commands**

- `!info`  
  Displays the current configuration, including the Realm ID, Program ID, and the notification channel.

- `!fetch`  
  Manually trigger a check for new proposals. Useful for on-demand updates.

---

## **Setup Instructions**

### **Prerequisites**

1. **Discord Server**: You must have a Discord server where the bot can be invited.
2. **Solana RPC URL**: You’ll need access to a Solana RPC endpoint for blockchain interactions (e.g., [QuickNode](https://www.quicknode.com/), [Alchemy](https://www.alchemy.com/)).
3. **Bot Token**: A Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications).

### **Step-by-Step Setup**

1. **Clone the Bot Repository**  
   Download or clone the bot repository to your local machine:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**  
   Install required libraries using Node.js:
   ```bash
   npm install
   ```

3. **Create a `.env` File**  
   Create a `.env` file in the root directory and add the following:
   ```
   DISCORD_TOKEN=<Your_Discord_Bot_Token>
   SOLANA_RPC_URL=<Your_Solana_RPC_Endpoint>
   ```

4. **Run the Bot**  
   Start the bot:
   ```bash
   node bot.js
   ```

5. **Invite the Bot to Your Server**  
   Use the OAuth2 link from the Discord Developer Portal to invite the bot to your server.

6. **Configure the Bot in Discord**  
   - Use `!setup` to configure the DAO Realm and Program IDs.
   - Use `!setchannel` in the desired channel to set it as the notification channel.

---

## **Technical Details**

- **Programming Language**: JavaScript (Node.js)
- **Libraries Used**:
  - `discord.js`: For interacting with Discord's API.
  - `@solana/web3.js`: For blockchain interactions on Solana.
  - `governance-idl-sdk`: For fetching proposals from the Solana Governance Program.
- **Storage**:
  - Proposals are stored in a local file (`proposal_store.json`) to prevent duplicate notifications.
  - Configuration is saved in `config.json` for persistence across sessions.

---

## **Frequently Asked Questions**

### 1. **What is a Realm ID and Program ID?**  
   The Realm ID represents the specific DAO you want to monitor, and the Program ID is the Governance Program responsible for managing proposals.

### 2. **How often does the bot check for new proposals?**  
   The bot automatically checks for new proposals every 30 minutes. You can change this interval by editing the `AUTO_CHECK_INTERVAL` value in the code.

### 3. **What happens if the bot reaches a rate limit?**  
   The bot includes a retry mechanism with exponential backoff to handle rate limits gracefully.

### 4. **How do I reset the bot?**  
   Use the `!reset` command to clear the current configuration.

---

## **Future Enhancements**

- **Proposal Voting Updates**: Notify when proposal voting periods start or end.
- **Multi-Realm Support**: Monitor multiple DAOs simultaneously.
- **Web Dashboard**: Provide a visual interface for bot configuration.

---

## **Troubleshooting**

### **The Bot Doesn’t Respond to Commands**
- Ensure the bot has the correct permissions in your server.
- Check that the `DISCORD_TOKEN` in your `.env` file is valid.

### **No Proposals Are Found**
- Verify that the Realm ID and Program ID are correct.
- Check the Solana RPC endpoint for connectivity issues.

### **Error: Too Many Requests (429)**
- The bot is hitting rate limits. The built-in retry mechanism will handle this automatically.

---

## **License**

This project is open-source and available under the MIT License. Feel free to modify and use it as needed.
