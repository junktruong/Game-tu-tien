export {};

declare global {
  interface Window {
    THREE: any;
    io: (url?: string) => any;
    __SOCKET_URL?: string;
  }
}
