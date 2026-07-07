import "./style.css";
import QRCode from "qrcode";

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
  Asset,
  BASE_FEE
} from "@stellar/stellar-sdk";

// ================= SERVER =================

const server = new Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

// ================= UI =================

document.querySelector("#app").innerHTML = `
<div id="toast"></div>
<div class="container">

<h1>🚀 Stellar Payment dApp</h1>
<button id="themeBtn">
🌙 Dark Mode
</button>

<button id="connectBtn">
🔗 Connect Wallet
</button>


<button id="disconnectBtn">
❌ Disconnect
</button>

<hr>

<h3>Wallet Address</h3>
<h3>Wallet QR Code</h3>

<canvas id="qrCanvas"></canvas>

<p id="address">
Not Connected
</p>

<button id="copyBtn">
📋 Copy Address
</button>

<hr>

<h3>Balance</h3>

<p id="balance">
0 XLM
</p>

<hr>

<h2>Wallet Dashboard</h2>

<div class="cards">

  <div class="card">
      <h3>💰 Balance</h3>
      <h2 id="cardBalance">0 XLM</h2>
  </div>

  <div class="card">
      <h3>🌐 Network</h3>
      <h2>Testnet</h2>
  </div>

  <div class="card">
      <h3>👛 Wallet</h3>
      <h2 id="walletStatus">Disconnected</h2>
  </div>

</div>

<hr>

<h3>Send XLM</h3>

<input
id="receiver"
type="text"
placeholder="Receiver Wallet Address"
/>

<input
id="amount"
type="number"
placeholder="Amount (XLM)"
/>

<button id="sendBtn">
Send Payment
</button>

<div
id="loader"
style="
display:none;
margin-top:15px;
font-weight:bold;
color:cyan;
"
>

⏳ Processing Transaction...

</div>

<hr>

<h3>Status</h3>

<p id="status">
Ready
</p>

<hr>

<h3>Transaction Hash</h3>

<p id="txHash">
Not Sent
</p>

<hr>
<h3>📊 Statistics</h3>

<div class="cards">

  <div class="card">
      <h3>Total Transactions</h3>
      <h2 id="totalTx">0</h2>
  </div>

  <div class="card">
      <h3>Total Sent</h3>
      <h2 id="totalSent">0 XLM</h2>
  </div>

</div>

<h3>Transaction History</h3>

<button id="exportBtn">
📄 Export CSV
</button>

<div id="history">
No Transactions
</div>

<hr>

<p style="text-align:center;">
Made with ❤️ by Hemant Patel
</p>

</div>
`;

// ================= ELEMENTS =================
const totalTx = document.getElementById("totalTx");
const totalSent = document.getElementById("totalSent");
const exportBtn = document.getElementById("exportBtn");
const toast = document.getElementById("toast");
const qrCanvas = document.getElementById("qrCanvas");
const themeBtn = document.getElementById("themeBtn");
const cardBalance = document.getElementById("cardBalance");
const walletStatus = document.getElementById("walletStatus");

const connectBtn = document.getElementById("connectBtn");

const disconnectBtn = document.getElementById("disconnectBtn");
const copyBtn = document.getElementById("copyBtn");
const sendBtn = document.getElementById("sendBtn");

const address = document.getElementById("address");
const balance = document.getElementById("balance");

const receiver = document.getElementById("receiver");
const amount = document.getElementById("amount");

const status = document.getElementById("status");
const txHash = document.getElementById("txHash");
const history = document.getElementById("history");
const loader = document.getElementById("loader");

// ================= VARIABLES =================

let walletAddress = "";


async function generateQR(address) {

  try {

    await QRCode.toCanvas(qrCanvas, address, {
      width: 220,
      margin: 2,
    });

  } catch (err) {

    console.error(err);

  }

}
// ================= THEME =================

const savedTheme = localStorage.getItem("theme");

if(savedTheme === "light"){
    document.body.classList.add("light-theme");
    themeBtn.textContent = "☀ Light Mode";
}

themeBtn.addEventListener("click",()=>{

    document.body.classList.toggle("light-theme");

    if(document.body.classList.contains("light-theme")){

        localStorage.setItem("theme","light");

        themeBtn.textContent="☀ Light Mode";

    }else{

        localStorage.setItem("theme","dark");

        themeBtn.textContent="🌙 Dark Mode";

    }

});
// ================= SAVE HISTORY =================

function saveTransaction(receiver, amount, hash) {

  const transactions =
    JSON.parse(localStorage.getItem("transactions")) || [];

  transactions.unshift({
    receiver,
    amount,
    hash,
    date: new Date().toLocaleString()
  });

  localStorage.setItem(
    "transactions",
    JSON.stringify(transactions)
  );

}
// ================= LOAD HISTORY =================

function loadHistory() {

  const transactions =
    JSON.parse(localStorage.getItem("transactions")) || [];

  if (transactions.length === 0) {

    history.innerHTML = "No Transactions";

    return;

  }

  history.innerHTML = "";

  transactions.forEach(tx => {

    history.innerHTML += `
      <div style="
        background:#1e293b;
        padding:12px;
        margin-top:10px;
        border-radius:10px;
      ">

        <p><b>Receiver</b></p>
        <p>${tx.receiver}</p>

        <p><b>Amount</b></p>
        <p>${tx.amount} XLM</p>

        <p><b>Date</b></p>
        <p>${tx.date}</p>

        <p><b>Hash</b></p>
        <p style="word-break:break-all;">
          ${tx.hash}
        </p>

      </div>
    `;

  });

}

// ================= CONNECT WALLET =================

connectBtn.addEventListener("click", async () => {
  try {

    loader.style.display = "block";
    status.textContent = "Connecting Wallet...";

    // Ask Freighter Permission
    await requestAccess();

    // Get Wallet Address
    const result = await getAddress();

    walletAddress = result.address;

    if (!walletAddress) {
      throw new Error("Wallet Address Not Found");
    }

    address.textContent = walletAddress;
    generateQR(walletAddress);

    // Load Account
    const account = await server.loadAccount(walletAddress);

    const xlmBalance = account.balances.find(
      asset => asset.asset_type === "native"
    );

    balance.textContent = `${xlmBalance.balance} XLM`;
    cardBalance.textContent = `${xlmBalance.balance} XLM`;
    walletStatus.textContent = "Connected";

    connectBtn.textContent = "✅ Connected";
    connectBtn.disabled = true;

    status.textContent = "✅ Wallet Connected";
    showToast("Wallet Connected");

  } catch (err) {

    console.error(err);

    status.textContent = "❌ " + err.message;

  } finally {

    loader.style.display = "none";

  }
});

// ================= COPY ADDRESS =================

copyBtn.addEventListener("click", async () => {

  if (!walletAddress) {

    status.textContent = "Connect Wallet First";
    return;

  }

  try {

    await navigator.clipboard.writeText(walletAddress);

    status.textContent = "✅ Address Copied";

  } catch {

    status.textContent = "❌ Copy Failed";

  }

});

// ================= DISCONNECT =================

disconnectBtn.addEventListener("click", () => {

  walletAddress = "";

  address.textContent = "Not Connected";

  balance.textContent = "0 XLM";

  receiver.value = "";

  amount.value = "";

  txHash.textContent = "Not Sent";

  history.innerHTML = "No Transactions";

  connectBtn.disabled = false;

  connectBtn.textContent = "🔗 Connect Wallet";

  status.textContent = "🔌 Wallet Disconnected";
  showToast("Wallet Disconnected");

  cardBalance.textContent = "0 XLM";

  walletStatus.textContent = "Disconnected";

  const ctx = qrCanvas.getContext("2d");

ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);

});






// ================= SEND PAYMENT =================

sendBtn.addEventListener("click", async () => {
  try {

    if (!walletAddress) {
      status.textContent = "❌ Connect Wallet First";
      return;
    }

    const receiverAddress = receiver.value.trim();
    const sendAmount = amount.value.trim();

    if (!receiverAddress) {
      status.textContent = "❌ Enter Receiver Address";
      return;
    }

    if (!sendAmount || Number(sendAmount) <= 0) {
      status.textContent = "❌ Enter Valid Amount";
      return;
    }

    if (receiverAddress === walletAddress) {
      status.textContent = "❌ You can't send to yourself";
      return;
    }

    loader.style.display = "block";
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    // Sender Account
    const account = await server.loadAccount(walletAddress);

    // Build Transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
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

    // Freighter Sign
    const signed = await signTransaction(
      transaction.toXDR(),
      {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      }
    );

    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      Networks.TESTNET
    );

    // Submit
    const result = await server.submitTransaction(signedTx);

    txHash.textContent = result.hash;

    status.textContent = "✅ Payment Successful";
    showToast("🎉 Payment Successful");
    saveTransaction(
      receiverAddress,
      sendAmount,
      result.hash
    );

    loadHistory();

    history.innerHTML = `
      <div style="padding:15px;background:#1e293b;border-radius:10px;">
        <p><b>Receiver</b></p>
        <p>${receiverAddress}</p>

        <p><b>Amount</b></p>
        <p>${sendAmount} XLM</p>

        <p><b>Hash</b></p>
        <p style="word-break:break-all;">
        ${result.hash}
        </p>

        <a
        href="https://stellar.expert/explorer/testnet/tx/${result.hash}"
        target="_blank">
        View Transaction
        </a>
      </div>
    `;

    // Refresh Balance
    const updatedAccount =
      await server.loadAccount(walletAddress);

    const xlm =
      updatedAccount.balances.find(
        asset => asset.asset_type === "native"
      );

    balance.textContent = `${xlm.balance} XLM`;
    cardBalance.textContent = `${xlm.balance} XLM`;

    receiver.value = "";
    amount.value = "";

  } catch (err) {

    console.error(err);

    status.textContent = "❌ " + err.message;

  } finally {

    loader.style.display = "none";

    sendBtn.disabled = false;

    sendBtn.textContent = "Send Payment";
  }
});
loadHistory();
function updateStats() {

    const transactions =
        JSON.parse(localStorage.getItem("transactions")) || [];

    totalTx.textContent = transactions.length;

    let total = 0;

    transactions.forEach(tx => {
        total += Number(tx.amount);
    });

    totalSent.textContent = total + " XLM";
}




function showToast(message){

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}

exportBtn.addEventListener("click",()=>{

    const transactions=
    JSON.parse(localStorage.getItem("transactions")) || [];

    if(transactions.length===0){

        alert("No Transactions");

        return;

    }

    let csv="Receiver,Amount,Hash,Date\n";

    transactions.forEach(tx=>{

        csv+=`${tx.receiver},${tx.amount},${tx.hash},${tx.date}\n`;

    });

    const blob=new Blob([csv],{
        type:"text/csv"
    });

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="transactions.csv";

    a.click();

});