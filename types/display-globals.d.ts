export {};

declare global {
  interface Window {
    THREE: any;
    __setSwordSkin?: (url: string, bloom?: string | number) => void;
  }
}
