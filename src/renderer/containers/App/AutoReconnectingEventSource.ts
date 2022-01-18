import { timeout } from "../../util";

// The normal `EventSource` object does not attempt to reconnect under all
// scenarios (see https://html.spec.whatwg.org/multipage/server-sent-events.html#sse-processing-model).
// This class automatically reconnects to the URL if the connection is lost and
// the normal `EventSource` is not trying to reconnect.
export default class AutoReconnectingEventSource {
  private eventSource!: EventSource;
  private eventListeners: { [type: string]: EventListener } = {};
  private disconnected = false;
  private manualReconnect = false;
  private closed = false;
  private disconnectHandler: (() => void) | undefined;
  private reconnectHandler: (() => void) | undefined;

  private createEventSource(
    url: string,
    eventSourceInitDict?: EventSourceInit
  ) {
    this.eventSource = new EventSource(url, eventSourceInitDict);

    this.eventSource.onerror = async () => {
      // Call the disconnect handler the first time we detect a new disconnection
      if (!this.disconnected) {
        this.disconnected = true;
        if (this.disconnectHandler) {
          this.disconnectHandler();
        }
      }

      // Only attempt to handle reconnection ourselves if `EventSource` has
      // given up and closed the previous connection
      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.manualReconnect = true;
        this.eventSource.close();
        await timeout(5000);
        if (!this.closed) {
          this.createEventSource(url, eventSourceInitDict);
        }
      }
    };

    this.eventSource.onopen = () => {
      // Add all of the event listeners onto the new `EventSource` if we had
      // to manually reconnect
      if (this.manualReconnect) {
        this.manualReconnect = false;
        Object.entries(this.eventListeners).forEach(([type, listener]) => {
          this.eventSource.addEventListener(type, listener);
        });
      }
      // Call the reconnect handler if we previously lost connection
      if (this.disconnected) {
        this.disconnected = false;
        if (this.reconnectHandler) {
          this.reconnectHandler();
        }
      }
    };
  }

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.createEventSource(url, eventSourceInitDict);
  }

  // Mirrors functionality of the `addEventListener` method on `EventSource`
  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.eventSource.addEventListener(type, listener as EventListener);
    this.eventListeners[type] = listener as EventListener;
  }

  // Handler will be called when connection is lost to the URL
  onDisconnect(handler: () => void) {
    this.disconnectHandler = handler;
  }

  // Handler will be called when connection to the URL is restored
  onReconnect(handler: () => void) {
    this.reconnectHandler = handler;
  }

  // Mirrors functionality of the `close` method on `EventSource`, and also
  // cleans out saved handlers
  close() {
    this.closed = true;
    this.eventListeners = {};
    this.disconnectHandler = undefined;
    this.reconnectHandler = undefined;
    this.eventSource.close();
  }
}
