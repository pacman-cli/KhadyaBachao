import {Client, type IMessage} from '@stomp/stompjs';
import {API_BASE_URL} from './client';
import {getToken} from './tokenRef';

export type ListingEvent = {
  listingId: string;
  type: string;
  status: string;
  at: string;
};

const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws-raw';

export const stompClient = new Client({
  brokerURL: wsUrl,
  reconnectDelay: 5000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
});

type SubscriptionEntry = {
  destination: string;
  onMessage: (body: string) => void;
  sub: {unsubscribe: () => void} | null;
};

// Registry of every topic the app wants live. stompjs subscriptions die with
// the underlying session, so on every (re)connect we re-subscribe all of them —
// previously a network drop silently killed chat/listing feeds until the
// screen was remounted.
const activeSubscriptions = new Map<number, SubscriptionEntry>();
let nextSubscriptionId = 1;

function applyAuthHeaders(): void {
  // Audit M11: the backend authorizes CONNECT + SUBSCRIBE via the JWT. Without
  // this header every WS chat publish is rejected and chat only works through
  // the REST fallback.
  const token = getToken();
  stompClient.connectHeaders = token ? {Authorization: `Bearer ${token}`} : {};
}

stompClient.onConnect = () => {
  applyAuthHeaders();
  activeSubscriptions.forEach(entry => {
    try {
      entry.sub?.unsubscribe();
    } catch {
      // stale subscription from a dead session — nothing to undo
    }
    entry.sub = stompClient.subscribe(entry.destination, (message: IMessage) =>
      entry.onMessage(message.body),
    );
  });
};

/** Activates the shared STOMP connection (idempotent). */
export function ensureConnected(): Client {
  if (!stompClient.active && !stompClient.connected) {
    applyAuthHeaders();
    stompClient.activate();
  } else {
    // keep headers fresh so automatic reconnects use the current token
    applyAuthHeaders();
  }
  return stompClient;
}

/**
 * Audit M12: fully tears down the shared socket (used on logout so a stale
 * connection cannot keep receiving frames for the previous user).
 */
export async function deactivateSocket(): Promise<void> {
  if (stompClient.active || stompClient.connected) {
    await stompClient.deactivate();
  }
  stompClient.connectHeaders = {};
}

/**
 * Subscribes to a topic as soon as the client is connected — and automatically
 * re-subscribes after every reconnect. Returns an unsubscribe function.
 */
export function subscribeWhenConnected(
  destination: string,
  onMessage: (body: string) => void,
): () => void {
  const client = ensureConnected();

  const id = nextSubscriptionId++;
  const entry: SubscriptionEntry = {destination, onMessage, sub: null};
  activeSubscriptions.set(id, entry);

  if (client.connected) {
    entry.sub = client.subscribe(destination, (message: IMessage) =>
      onMessage(message.body),
    );
  }

  return () => {
    activeSubscriptions.delete(id);
    try {
      entry.sub?.unsubscribe();
    } catch {
      // session already gone
    }
  };
}

/** Publishes a chat message to /app/chat/{requestId}. */
export function publishChatMessage(requestId: string, text: string): boolean {
  const client = ensureConnected();
  if (!client.connected) {
    return false;
  }
  client.publish({
    destination: `/app/chat/${requestId}`,
    body: JSON.stringify({message: text}),
    headers: {'content-type': 'application/json'},
  });
  return true;
}
