import {Client, type IMessage} from '@stomp/stompjs';
import {API_BASE_URL} from './client';

export type ListingEvent = {
  listingId: string;
  type: string;
  status: string;
  at: string;
};

const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws-raw';

type Listener = () => void;

const listeners = new Set<Listener>();

export const stompClient = new Client({
  brokerURL: wsUrl,
  reconnectDelay: 5000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
});

stompClient.onConnect = () => {
  listeners.forEach(fn => fn());
};

/** Activates the shared STOMP connection (idempotent). */
export function ensureConnected(): Client {
  if (!stompClient.active && !stompClient.connected) {
    stompClient.activate();
  }
  return stompClient;
}

/**
 * Subscribes to a topic as soon as the client is connected.
 * Returns an unsubscribe function.
 */
export function subscribeWhenConnected(
  destination: string,
  onMessage: (body: string) => void,
): () => void {
  const client = ensureConnected();

  let subscription: {unsubscribe: () => void} | null = null;

  const trySubscribe = () => {
    if (client.connected && !subscription) {
      subscription = client.subscribe(
        destination,
        (message: IMessage) => onMessage(message.body),
      );
    }
  };

  const listener: Listener = () => trySubscribe();
  listeners.add(listener);
  trySubscribe();

  return () => {
    listeners.delete(listener);
    subscription?.unsubscribe();
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
