import jwt from 'jsonwebtoken';

const CACHE_DURATION_MS = 30_000;
const QUOTE_DURATION_SECONDS = 10 * 60;

let cachedPrice = null;
let cachedAt = 0;

const fetchFromCoinGecko = async () => {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    { signal: AbortSignal.timeout(5_000) }
  );

  if (!response.ok) throw new Error('CoinGecko price request failed.');
  const data = await response.json();
  return Number(data?.ethereum?.usd);
};

const fetchFromCoinbase = async () => {
  const response = await fetch(
    'https://api.coinbase.com/v2/prices/ETH-USD/spot',
    { signal: AbortSignal.timeout(5_000) }
  );

  if (!response.ok) throw new Error('Coinbase price request failed.');
  const data = await response.json();
  return Number(data?.data?.amount);
};

export const getEthUsdPrice = async () => {
  if (cachedPrice && Date.now() - cachedAt < CACHE_DURATION_MS) {
    return cachedPrice;
  }

  let price;
  try {
    price = await fetchFromCoinGecko();
  } catch {
    price = await fetchFromCoinbase();
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Received an invalid ETH/USD price.');
  }

  cachedPrice = Math.round(price * 100) / 100;
  cachedAt = Date.now();
  return cachedPrice;
};

export const normalizeCartItems = (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Cart items are required.');
  }

  const normalized = cartItems
    .map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity)
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const ids = new Set();
  for (const item of normalized) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Cart contains an invalid item.');
    }
    if (ids.has(item.productId)) {
      throw new Error('Cart contains duplicate products.');
    }
    ids.add(item.productId);
  }

  return normalized;
};

export const createCheckoutQuoteToken = (quote) => jwt.sign(
  { type: 'checkout-quote', ...quote },
  process.env.JWT_SECRET,
  { expiresIn: QUOTE_DURATION_SECONDS }
);

export const verifyCheckoutQuoteToken = (token) => {
  const quote = jwt.verify(token, process.env.JWT_SECRET);
  if (quote?.type !== 'checkout-quote') {
    throw new Error('Invalid checkout quote.');
  }
  return quote;
};

export const getQuoteExpiry = () => (
  new Date(Date.now() + QUOTE_DURATION_SECONDS * 1_000).toISOString()
);
