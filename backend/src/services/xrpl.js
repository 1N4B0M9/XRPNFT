import xrpl from 'xrpl';
import dotenv from 'dotenv';

dotenv.config();

// Testnet servers in priority order (the Ripple default is often down)
const TESTNET_SERVERS = [
  'wss://testnet.xrpl-labs.com',
  'wss://s.altnet.rippletest.net:51233',
  'wss://clio.altnet.rippletest.net:51233',
];

const CONNECTION_TIMEOUT = 20000; // 20 seconds

let client = null;

// ─── Connection Management ───────────────────────────────────────
export async function getClient() {
  if (client && client.isConnected()) {
    return client;
  }

  // Try each server until one connects
  const servers = process.env.XRPL_NETWORK
    ? [process.env.XRPL_NETWORK, ...TESTNET_SERVERS]
    : TESTNET_SERVERS;

  for (const server of servers) {
    try {
      console.log(`Attempting XRPL connection to ${server}...`);
      client = new xrpl.Client(server, { connectionTimeout: CONNECTION_TIMEOUT });
      await client.connect();
      console.log(`Connected to XRPL Testnet via ${server}`);
      return client;
    } catch (err) {
      console.warn(`Failed to connect to ${server}: ${err.message}`);
      client = null;
    }
  }

  throw new Error('Could not connect to any XRPL Testnet server. Check your internet connection.');
}

export async function disconnectClient() {
  if (client && client.isConnected()) {
    await client.disconnect();
    client = null;
  }
}

// ─── Wallet Management ──────────────────────────────────────────
export async function createTestnetWallet() {
  const c = await getClient();
  const fundResult = await c.fundWallet();
  return {
    address: fundResult.wallet.address,
    seed: fundResult.wallet.seed,
    balance: fundResult.balance,
  };
}

export function walletFromSeed(seed) {
  return xrpl.Wallet.fromSeed(seed);
}

export async function getBalance(address) {
  const c = await getClient();
  try {
    const response = await c.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
    return xrpl.dropsToXrp(response.result.account_data.Balance);
  } catch (err) {
    if (err.data?.error === 'actNotFound') return '0';
    throw err;
  }
}

// ─── Escrow ─────────────────────────────────────────────────────
export async function createEscrow(senderSeed, amountXrp, destinationAddress, conditionHex) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(senderSeed);

  // Escrow finishes 5 seconds from now (short window so buyers can redeem quickly)
  const finishAfter = xrpl.isoTimeToRippleTime(
    new Date(Date.now() + 5 * 1000).toISOString()
  );

  // Cancel after 30 days
  const cancelAfter = xrpl.isoTimeToRippleTime(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );

  const escrowCreate = {
    TransactionType: 'EscrowCreate',
    Account: wallet.address,
    Amount: xrpl.xrpToDrops(amountXrp.toString()),
    Destination: destinationAddress,
    FinishAfter: finishAfter,
    CancelAfter: cancelAfter,
  };

  const prepared = await c.autofill(escrowCreate);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  return {
    txHash: result.result.hash,
    sequence: prepared.Sequence,
    finishAfter,
    cancelAfter,
  };
}

export async function finishEscrow(finisherSeed, escrowOwnerAddress, escrowSequence) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(finisherSeed);

  const escrowFinish = {
    TransactionType: 'EscrowFinish',
    Account: wallet.address,
    Owner: escrowOwnerAddress,
    OfferSequence: escrowSequence,
  };

  const prepared = await c.autofill(escrowFinish);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  return {
    txHash: result.result.hash,
    status: result.result.meta.TransactionResult,
  };
}

// ─── NFT (NFToken) Operations ────────────────────────────────────
export async function mintNFT(issuerSeed, metadataUri, transferFee = 500) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(issuerSeed);

  // Convert URI to hex
  const uriHex = Buffer.from(metadataUri, 'utf8').toString('hex').toUpperCase();

  const mintTx = {
    TransactionType: 'NFTokenMint',
    Account: wallet.address,
    URI: uriHex,
    // tfBurnable (1) + tfTransferable (8) = 9 → flags
    Flags: 9,
    TransferFee: transferFee, // 5% royalty (500 basis points)
    NFTokenTaxon: 0,
  };

  const prepared = await c.autofill(mintTx);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  // Extract the NFTokenID from the transaction metadata
  const tokenId = extractNewTokenId(result.result.meta);

  return {
    txHash: result.result.hash,
    tokenId,
    issuer: wallet.address,
  };
}

function extractNewTokenId(meta) {
  // Walk through affected nodes to find the new NFTokenID
  if (!meta?.AffectedNodes) return null;
  for (const node of meta.AffectedNodes) {
    const modified = node.ModifiedNode || node.CreatedNode;
    if (!modified) continue;
    if (modified.LedgerEntryType === 'NFTokenPage') {
      const finalTokens = modified.FinalFields?.NFTokens || modified.NewFields?.NFTokens || [];
      const prevTokens = modified.PreviousFields?.NFTokens || [];
      // Find token in final but not in previous
      const prevIds = new Set(prevTokens.map((t) => t.NFToken.NFTokenID));
      for (const t of finalTokens) {
        if (!prevIds.has(t.NFToken.NFTokenID)) {
          return t.NFToken.NFTokenID;
        }
      }
    }
  }
  return null;
}

export async function createSellOffer(ownerSeed, tokenId, amountXrp, destination = null) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(ownerSeed);

  const offerTx = {
    TransactionType: 'NFTokenCreateOffer',
    Account: wallet.address,
    NFTokenID: tokenId,
    Amount: xrpl.xrpToDrops(amountXrp.toString()),
    Flags: 1, // tfSellNFToken
  };

  if (destination) {
    offerTx.Destination = destination;
  }

  const prepared = await c.autofill(offerTx);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  // Extract offer index from meta
  let offerIndex = null;
  if (result.result.meta?.AffectedNodes) {
    for (const node of result.result.meta.AffectedNodes) {
      if (node.CreatedNode?.LedgerEntryType === 'NFTokenOffer') {
        offerIndex = node.CreatedNode.LedgerIndex;
        break;
      }
    }
  }

  return {
    txHash: result.result.hash,
    offerIndex,
  };
}

export async function acceptSellOffer(buyerSeed, sellOfferIndex, memoData = null) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(buyerSeed);

  const acceptTx = {
    TransactionType: 'NFTokenAcceptOffer',
    Account: wallet.address,
    NFTokenSellOffer: sellOfferIndex,
  };

  // Add on-chain memo with sale data for universal price history
  if (memoData) {
    acceptTx.Memos = [{
      Memo: {
        MemoType: Buffer.from('application/json', 'utf8').toString('hex').toUpperCase(),
        MemoData: Buffer.from(JSON.stringify(memoData), 'utf8').toString('hex').toUpperCase(),
      },
    }];
  }

  const prepared = await c.autofill(acceptTx);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  return {
    txHash: result.result.hash,
    status: result.result.meta.TransactionResult,
  };
}

export async function burnNFT(ownerSeed, tokenId) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(ownerSeed);

  const burnTx = {
    TransactionType: 'NFTokenBurn',
    Account: wallet.address,
    NFTokenID: tokenId,
  };

  const prepared = await c.autofill(burnTx);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  return {
    txHash: result.result.hash,
    status: result.result.meta.TransactionResult,
  };
}

export async function getAccountNFTs(address) {
  const c = await getClient();
  try {
    const response = await c.request({
      command: 'account_nfts',
      account: address,
      ledger_index: 'validated',
    });
    return response.result.account_nfts || [];
  } catch (err) {
    if (err.data?.error === 'actNotFound') return [];
    throw err;
  }
}

// ─── Account Escrow Objects ──────────────────────────────────────
export async function getAccountEscrows(address) {
  const c = await getClient();
  try {
    const response = await c.request({
      command: 'account_objects',
      account: address,
      type: 'escrow',
      ledger_index: 'validated',
    });
    return response.result.account_objects || [];
  } catch (err) {
    if (err.data?.error === 'actNotFound') return [];
    throw err;
  }
}

export async function getSellOffers(tokenId) {
  const c = await getClient();
  try {
    const response = await c.request({
      command: 'nft_sell_offers',
      nft_id: tokenId,
      ledger_index: 'validated',
    });
    return response.result.offers || [];
  } catch {
    return [];
  }
}

// ─── Payment ────────────────────────────────────────────────────
export async function sendPayment(senderSeed, destinationAddress, amountXrp) {
  const c = await getClient();
  const wallet = xrpl.Wallet.fromSeed(senderSeed);

  const paymentTx = {
    TransactionType: 'Payment',
    Account: wallet.address,
    Destination: destinationAddress,
    Amount: xrpl.xrpToDrops(amountXrp.toString()),
  };

  const prepared = await c.autofill(paymentTx);
  const signed = wallet.sign(prepared);
  const result = await c.submitAndWait(signed.tx_blob);

  return {
    txHash: result.result.hash,
    status: result.result.meta.TransactionResult,
  };
}

// ─── NFT Price History (On-Chain) ────────────────────────────────
export async function getNFTTransactionHistory(tokenId) {
  const c = await getClient();
  try {
    // nft_history is available on Clio servers
    const response = await c.request({
      command: 'nft_history',
      nft_id: tokenId,
      limit: 100,
    });

    const transactions = response.result.transactions || [];
    const priceHistory = [];

    for (const entry of transactions) {
      const tx = entry.tx || entry;
      if (tx.TransactionType === 'NFTokenAcceptOffer') {
        let salePrice = null;
        let memoInfo = null;

        // Extract our structured memo data
        if (tx.Memos && tx.Memos.length > 0) {
          try {
            const memoHex = tx.Memos[0].Memo.MemoData;
            const memoStr = Buffer.from(memoHex, 'hex').toString('utf8');
            memoInfo = JSON.parse(memoStr);
            salePrice = parseFloat(memoInfo.salePrice);
          } catch {
            // Memo wasn't our format — skip
          }
        }

        priceHistory.push({
          date: tx.date ? xrpl.rippleTimeToISOTime(tx.date) : new Date().toISOString(),
          price: salePrice,
          buyer: tx.Account,
          txHash: tx.hash,
          memo: memoInfo,
        });
      }
    }

    return priceHistory.reverse(); // oldest first
  } catch (err) {
    console.warn('nft_history query failed:', err.message);
    return []; // Caller should fall back to local DB
  }
}
