import "./style.css";

import {
  requestAccess,
  getAddress,
  signTransaction
} from "@stellar/freighter-api";

import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset
} from "@stellar/stellar-sdk";

const server = new Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

document.querySelector("#app").innerHTML = `
<div class="container">

  <h1>🚀 Stellar Payment dApp</h1>

  <button id="connectBtn">🔗 Connect Wallet</button>

  <button id="disconnectBtn">Disconnect Wallet</button>

  <hr>

  <h3>Wallet Address</h3>
  <p id="address">Not Connected</p>

  <h3>Balance</h3>
  <p id="balance">0 XLM</p>

  <hr>

  <h3>Send XLM</h3>

  <input
    type="text"
    id="receiver"
    placeholder="Receiver Wallet Address"
  />

  <input
    type="number"
    id="amount"
    placeholder="Amount (XLM)"
  />

  <button id="sendBtn">Send Payment</button>
  <button id="copyBtn">📋 Copy Address</button>

  <p id="status">Ready</p>
  <h3>Transaction History</h3>

<div id="history">
No Transactions
</div>
<hr>

<p style="text-align:center;">
Made with ❤️ by Hemant Patel
</p>

</div>
`;
const history = document.getElementById("history");
const connectBtn = document.getElementById("connectBtn");
const sendBtn = document.getElementById("sendBtn");

const address = document.getElementById("address");
const balance = document.getElementById("balance");

const receiver = document.getElementById("receiver");
const amount = document.getElementById("amount");

const status = document.getElementById("status");

let walletAddress = "";

const copyBtn = document.getElementById("copyBtn");

copyBtn.addEventListener("click", async () => {

  if (!walletAddress) {
    status.textContent = "Connect Wallet First";
    return;
  }

  await navigator.clipboard.writeText(walletAddress);

  status.textContent = "✅ Address Copied";
});

/* ---------------- CONNECT WALLET ---------------- */

connectBtn.addEventListener("click", async () => {

  try {

    status.textContent = "Connecting Wallet...";

    await requestAccess();

    const result = await getAddress();

    walletAddress = result.address;

    if (!walletAddress) {

      status.textContent = "Wallet Address Not Found";
      return;

    }

    address.textContent = walletAddress;

    const account = await server.loadAccount(walletAddress);

    const xlm = account.balances.find(
      asset => asset.asset_type === "native"
    );

    balance.textContent = `${xlm.balance} XLM`;

    status.textContent = "✅ Wallet Connected";

  } catch (err) {

    console.error(err);

    status.textContent = "❌ " + err.message;

  }

});


/* ---------------- SEND XLM ---------------- */
sendBtn.disabled = true;

sendBtn.innerHTML = "Sending...";
sendBtn.disabled = false;

sendBtn.innerHTML = "Send Payment";

sendBtn.addEventListener("click", async () => {

  try {

    if (!walletAddress) {

      status.textContent = "Connect Wallet First";
      return;

    }

    const receiverAddress = receiver.value.trim();
    const sendAmount = amount.value;

    if (!receiverAddress || !sendAmount) {

      status.textContent = "Fill all fields";
      return;

    }

    status.innerHTML = "⏳ Preparing Transaction...";
    history.innerHTML = `
<div style="
padding:15px;
margin-top:10px;
background:#1e293b;
border-radius:10px;
">

<p><b>Receiver</b></p>
<p>${receiverAddress}</p>

<p><b>Amount</b></p>
<p>${sendAmount} XLM</p>

<p><b>Transaction</b></p>

<a
href="https://stellar.expert/explorer/testnet/tx/${hash}"
target="_blank"
style="color:cyan;"
>

View Transaction

</a>

</div>
`;
    connectBtn.disabled = true;

    connectBtn.innerHTML = "Connecting...";
    connectBtn.innerHTML = "✅ Connected";

    connectBtn.style.background = "green";

    const account = await server.loadAccount(walletAddress);

    const fee = await server.fetchBaseFee();

    const transaction = new TransactionBuilder(account, {
      fee,
      networkPassphrase: Networks.TESTNET,
    })

      .addOperation(
        Operation.payment({
          destination: receiverAddress,
          asset: Asset.native(),
          amount: sendAmount,
        })
      )

      .setTimeout(30)

      .build();

    const signed = await signTransaction(
      transaction.toXDR(),
      Networks.TESTNET
    );

    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      Networks.TESTNET
    );

    const result = await server.submitTransaction(signedTx);

    console.log(result);

    const hash = result.hash;

    status.innerHTML = `
✅ Payment Successful <br><br>

Transaction Hash:<br>

${hash}

<br><br>

<a
href="https://stellar.expert/explorer/testnet/tx/${hash}"
target="_blank"
style="
color:cyan;
text-decoration:none;
font-weight:bold;
">
🔗 View on Stellar Expert
</a>
`;
    if (receiverAddress === walletAddress) {

      status.textContent = "You can't send yourself.";

      return;

    }

    // Refresh Balance
    if (Number(sendAmount) <= 0) {

      status.textContent = "Invalid Amount";

      return;

    }
    const updatedAccount = await server.loadAccount(walletAddress);

    const updatedXLM = updatedAccount.balances.find(
      asset => asset.asset_type === "native"
    );

    balance.textContent = `${updatedXLM.balance} XLM`;

  } catch (err) {

    console.error(err);

    status.innerHTML = "❌ " + err.message;

  }

});
const disconnectBtn = document.getElementById("disconnectBtn");

disconnectBtn.addEventListener("click", () => {
  walletAddress = "";

  address.textContent = "Not Connected";
  balance.textContent = "0 XLM";

  receiver.value = "";
  amount.value = "";

  status.textContent = "🔌 Wallet Disconnected";
});